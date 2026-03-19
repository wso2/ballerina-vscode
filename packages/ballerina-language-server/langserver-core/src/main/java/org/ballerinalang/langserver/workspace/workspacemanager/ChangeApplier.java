/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
 *
 *  WSO2 LLC. licenses this file to you under the Apache License,
 *  Version 2.0 (the "License"); you may not use this file except
 *  in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing,
 *  software distributed under the License is distributed on an
 *  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 *  KIND, either express or implied.  See the License for the
 *  specific language governing permissions and limitations
 *  under the License.
 */

package org.ballerinalang.langserver.workspace.workspacemanager;

import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.Package;
import io.ballerina.projects.Project;
import io.ballerina.projects.util.ProjectConstants;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;

import java.net.URI;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Drains ChangeBuffer deltas per-project, resolves URIs via UriResolver, clusters changes by Module,
 * and calls the optimal modify API (document.modify() / module.modify() / package.modify()).
 * This is the bridge between the change delta buffer and the compiler's content model (ADR-047 §7).
 *
 * @since 1.7.0
 */
public class ChangeApplier {

    private final ChangeBuffer changeBuffer;
    private final UriResolver uriResolver;

    /**
     * Creates a new ChangeApplier that applies buffered changes via the compiler's modify chain.
     *
     * @param changeBuffer the per-URI, per-layer change buffer
     * @param uriResolver  the URI-to-Document resolver
     * @throws NullPointerException if any argument is null
     */
    public ChangeApplier(ChangeBuffer changeBuffer, UriResolver uriResolver) {
        this.changeBuffer = Objects.requireNonNull(changeBuffer, "changeBuffer must not be null");
        this.uriResolver = Objects.requireNonNull(uriResolver, "uriResolver must not be null");
    }

    /**
     * Applies all pending changes in ChangeBuffer for this project in layer-priority order (EDITOR → AI → EXPR).
     * Drains per-project, resolves URIs, clusters by Module, and calls the optimal modify API.
     *
     * @param project the compiler Project to apply changes to
     * @return {@code true} if any changes were applied, {@code false} if buffer was empty
     * @throws NullPointerException if project is null
     *
     * TODO: Error recovery — currently assumes modify API succeeds. Future: catch and recover from apply failures.
     */
    public boolean apply(Project project) {
        Objects.requireNonNull(project, "project must not be null");

        boolean anyChangesApplied = false;
        for (ChangeLayer layer : ChangeLayer.values()) {
            anyChangesApplied |= applyLayer(project, layer);
        }
        return anyChangesApplied;
    }

    /**
     * Applies all changes for a specific layer across all pending URIs in the project.
     *
     * @param project the compiler project
     * @param layer   the layer to apply
     * @return true if any changes were actually applied to the compiler model
     */
    private boolean applyLayer(Project project, ChangeLayer layer) {
        Set<DocumentUri> pendingUris = getPendingUrisForProject(project);
        if (pendingUris.isEmpty()) {
            return false;
        }

        // Drain this layer's changes for all pending URIs
        Map<DocumentUri, List<BufferedChange>> changesByUri = new HashMap<>();
        for (DocumentUri uri : pendingUris) {
            List<BufferedChange> changes = changeBuffer.drain(uri, layer);
            if (!changes.isEmpty()) {
                changesByUri.put(uri, changes);
            }
        }

        if (changesByUri.isEmpty()) {
            return false;
        }

        // Resolve URIs and cluster by module
        Package pkg = project.currentPackage();
        Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> changesByModule = new HashMap<>();

        for (Map.Entry<DocumentUri, List<BufferedChange>> entry : changesByUri.entrySet()) {
            Optional<Document> doc = resolveDocument(entry.getKey());
            if (doc.isEmpty()) {
                continue;
            }
            Module module = doc.get().module();
            List<TextDocumentContentChangeEvent> events = entry.getValue().stream()
                    .map(BufferedChange::change)
                    .toList();
            changesByModule.computeIfAbsent(module, k -> new HashMap<>())
                    .put(doc.get(), events);
        }

        if (changesByModule.isEmpty()) {
            return false;
        }

        applyClusteredChanges(pkg, changesByModule);
        return true;
    }

    /**
     * Resolves a URI to its compiler Document via UriResolver.
     *
     * @param uri the document URI to resolve
     * @return the resolved Document, or empty if not found or not a document entry
     */
    private Optional<Document> resolveDocument(DocumentUri uri) {
        return uriResolver.resolve(uri)
                .filter(e -> e instanceof ResolvedEntry.DocumentEntry)
                .map(e -> ((ResolvedEntry.DocumentEntry) e).document());
    }

    /**
     * Applies changes clustered by module using the optimal modify API strategy:
     * <ul>
     *   <li>Single document in a single module: {@code document.modify()}</li>
     *   <li>Multiple documents in the same module: {@code module.modify()} (TODO: batch)</li>
     *   <li>Multiple modules: {@code package.modify()} (TODO: batch)</li>
     * </ul>
     *
     * @param pkg             the current package (reserved for future batched package.modify())
     * @param changesByModule changes organized by module and document
     */
    private void applyClusteredChanges(Package pkg,
            Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> changesByModule) {
        if (changesByModule.size() == 1) {
            Module module = changesByModule.keySet().iterator().next();
            Map<Document, List<TextDocumentContentChangeEvent>> docChanges = changesByModule.get(module);

            if (docChanges.size() == 1) {
                // Strategy 1: single document — document.modify()
                Document doc = docChanges.keySet().iterator().next();
                applyViaDocumentModify(doc, docChanges.get(doc));
            } else {
                // Strategy 2: multiple docs same module — ideally module.modify() (TODO: batch when API is public)
                applyViaModuleModify(docChanges);
            }
        } else {
            // Strategy 3: multiple modules — ideally package.modify() (TODO: batch when API is public)
            applyViaPackageModify(changesByModule);
        }
    }

    /**
     * Applies changes to a single document via {@code document.modify()}.
     */
    private void applyViaDocumentModify(Document doc, List<TextDocumentContentChangeEvent> changes) {
        String content = computeContent(doc, changes);
        doc.modify()
                .withContent(content)
                .apply();
    }

    /**
     * Applies changes to multiple documents in the same module.
     * Calls {@code document.modify()} per document.
     *
     * TODO: Batch into a single {@code module.modify()} once DocumentContext is part of the public compiler API.
     */
    private void applyViaModuleModify(Map<Document, List<TextDocumentContentChangeEvent>> docChanges) {
        for (Map.Entry<Document, List<TextDocumentContentChangeEvent>> entry : docChanges.entrySet()) {
            applyViaDocumentModify(entry.getKey(), entry.getValue());
        }
    }

    /**
     * Applies changes across multiple modules.
     * Calls {@code document.modify()} per document.
     *
     * TODO: Batch into a single {@code package.modify()} once ModuleContext is part of the public compiler API.
     */
    private void applyViaPackageModify(
            Map<Module, Map<Document, List<TextDocumentContentChangeEvent>>> changesByModule) {
        for (Map<Document, List<TextDocumentContentChangeEvent>> docChanges : changesByModule.values()) {
            applyViaModuleModify(docChanges);
        }
    }

    /**
     * Computes the final content for a document by applying a sequence of LSP content changes in order.
     * Handles both full-document replacements ({@code range == null}) and range-based incremental edits.
     *
     * @param doc     the document providing the base content
     * @param changes the ordered list of content change events
     * @return the resulting content string
     */
    private String computeContent(Document doc, List<TextDocumentContentChangeEvent> changes) {
        String content = doc.textDocument().toString();
        for (TextDocumentContentChangeEvent change : changes) {
            if (change.getRange() == null) {
                content = change.getText();
            } else {
                content = applyRangeEdit(content, change.getRange(), change.getText());
            }
        }
        return content;
    }

    /**
     * Applies a range-based text replacement to the content string.
     * Converts LSP line/character positions (0-based, UTF-16 code units) to string offsets.
     *
     * @param content     the current content
     * @param range       the LSP range to replace
     * @param replacement the replacement text
     * @return the content with the specified range replaced
     */
    private String applyRangeEdit(String content, Range range, String replacement) {
        String[] lines = content.split("\n", -1);
        int startOffset = lineCharToOffset(lines, range.getStart().getLine(), range.getStart().getCharacter());
        int endOffset = lineCharToOffset(lines, range.getEnd().getLine(), range.getEnd().getCharacter());
        return content.substring(0, startOffset) + replacement + content.substring(endOffset);
    }

    /**
     * Converts a line/character position to a linear string offset.
     * Line numbers and character offsets are 0-based (LSP convention).
     *
     * @param lines     the content split into lines (without the newline characters)
     * @param line      0-based line number
     * @param character 0-based character offset within the line
     * @return the offset from the start of the content string
     */
    private int lineCharToOffset(String[] lines, int line, int character) {
        int offset = 0;
        for (int i = 0; i < line && i < lines.length; i++) {
            offset += lines[i].length() + 1; // +1 for the '\n'
        }
        if (line < lines.length) {
            offset += Math.min(character, lines[line].length());
        }
        return offset;
    }

    /**
     * Enumerates all source documents in the given compiler project and returns the subset
     * that have pending changes in the ChangeBuffer.
     *
     * <p>Document URIs are constructed from the project source root:
     * <ul>
     *   <li>Default module: {@code <sourceRoot>/<documentName>}</li>
     *   <li>Named module: {@code <sourceRoot>/modules/<moduleName>/<documentName>}</li>
     * </ul>
     *
     * @param project the compiler project to enumerate
     * @return set of DocumentURIs that have at least one buffered change
     */
    protected Set<DocumentUri> getPendingUrisForProject(Project project) {
        Set<DocumentUri> result = new HashSet<>();
        Package pkg = project.currentPackage();

        for (ModuleId moduleId : pkg.moduleIds()) {
            Module module = pkg.module(moduleId);
            for (DocumentId docId : module.documentIds()) {
                Document doc = module.document(docId);
                DocumentUri uri = toDocumentUri(module, doc);
                if (changeBuffer.hasChanges(uri)) {
                    result.add(uri);
                }
            }
        }
        return result;
    }

    /**
     * Constructs a {@link DocumentUri.FileUri} for a compiler document by combining
     * the project source root with the module-relative document path.
     *
     * @param module the module containing the document
     * @param doc    the compiler document
     * @return the corresponding file URI
     */
    private DocumentUri toDocumentUri(Module module, Document doc) {
        Path sourceRoot = module.project().sourceRoot();
        Path docPath;
        if (module.isDefaultModule()) {
            docPath = sourceRoot.resolve(doc.name());
        } else {
            docPath = sourceRoot
                    .resolve(ProjectConstants.MODULES_ROOT)
                    .resolve(module.moduleName().moduleNamePart())
                    .resolve(doc.name());
        }
        return new DocumentUri.FileUri(docPath.toUri());
    }
}
