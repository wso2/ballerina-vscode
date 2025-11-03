/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core.diagnostics;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.flowmodelgenerator.core.CodeAnalyzer;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.NodeBuilder;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.projects.Document;
import io.ballerina.projects.Project;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextDocumentChange;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Callable;

/**
 * Represents a request for obtaining diagnostics for the entire flow node. This class implements {@link Callable}, and
 * returns a {@link JsonElement} with the diagnostics annotated to the flow node.
 *
 * @since 1.0.0
 */
public class DiagnosticRequest implements Callable<JsonElement> {

    private static final Gson gson = new Gson();

    private final String filePath;
    private final JsonElement flowNode;
    private final WorkspaceManager workspaceManager;
    private TextDocument prevDoc;

    public DiagnosticRequest(String filePath, JsonElement flowNode, WorkspaceManager workspaceManager) {
        this.filePath = filePath;
        this.flowNode = flowNode;
        this.workspaceManager = workspaceManager;
        this.prevDoc = null;
    }

    @Override
    public JsonElement call() {
        // Get the project and document
        Path path = Path.of(filePath);
        Project project;
        try {
            project = workspaceManager.loadProject(path);
        } catch (WorkspaceDocumentException | EventSyncException e) {
            return null;
        }
        Optional<Document> document = workspaceManager.document(path);

        if (document.isEmpty()) {
            return null;
        }

        // Parse the flow node
        FlowNode flowNodeObj = gson.fromJson(flowNode, FlowNode.class);
        if (flowNodeObj == null || flowNodeObj.codedata() == null) {
            return null;
        }

        // Generate text edits using SourceBuilder (similar to SourceGenerator)
        SourceBuilder sourceBuilder = new SourceBuilder(flowNodeObj, workspaceManager, path);
        Map<Path, List<TextEdit>> textEdits = NodeBuilder
                .getNodeFromKind(flowNodeObj.codedata().node())
                .toSource(sourceBuilder);

        // Apply text edits to the document
        TextDocument textDocument = document.get().textDocument();
        List<io.ballerina.tools.text.TextEdit> ballerinaEdits = new ArrayList<>();
        List<TextEdit> lspEdits = textEdits.get(path);
        int start = 0;
        LinePosition endLinePosition = null;
        if (lspEdits != null) {
            // Transform every LSP TextEdit to a Ballerina TextEdit
            for (TextEdit edit : lspEdits) {
                // Generate the Ballerina TextEdit from the LSP TextEdit
                Range editRange = edit.getRange();
                int startLine = editRange.getStart().getLine();
                int endLine = editRange.getEnd().getLine();
                int startCharacter = editRange.getStart().getCharacter();
                int endCharacter = editRange.getEnd().getCharacter();
                start = textDocument.textPositionFrom(LinePosition.from(startLine, startCharacter));
                int end = textDocument.textPositionFrom(LinePosition.from(endLine, endCharacter));
                ballerinaEdits.add(io.ballerina.tools.text.TextEdit.from(TextRange.from(start, end - start),
                        edit.getNewText()));

                // Calculate the end position after the edit:
                // - If multi-line edit: position is at the end of the last inserted text line
                // - If single-line edit: position is start character + length of inserted text. (We need to
                // account the existing indentation at the start)
                List<String> textEditLines = edit.getNewText().lines().toList();
                String textLine = textEditLines.getLast();
                int numTextEdits = textEditLines.size();
                int lineOffset =
                        Boolean.TRUE.equals(flowNodeObj.codedata().isNew()) && numTextEdits > 1 ? numTextEdits - 1 : 0;
                endLinePosition = LinePosition.from(endLine + lineOffset,
                        numTextEdits > 1 ? textLine.length() : startCharacter + textLine.length());
            }
        }
        // If no edits were made, return null
        if (ballerinaEdits.isEmpty()) {
            return null;
        }

        // Update the document in the project with the new content
        TextDocument newTextDocument = textDocument.apply(
                TextDocumentChange.from(ballerinaEdits.toArray(new io.ballerina.tools.text.TextEdit[0])));
        prevDoc = document.get().textDocument();
        Document updatedDoc = document.get()
                .modify()
                .withContent(String.join(System.lineSeparator(), newTextDocument.textLines()))
                .apply();

        // Find the ST node relevant to the modified range
        TextDocument updatedTextDocument = updatedDoc.textDocument();
        ModulePartNode modulePartNode = updatedDoc.syntaxTree().rootNode();
        NonTerminalNode node = modulePartNode.findNode(TextRange.from(start,
                updatedTextDocument.textPositionFrom(endLinePosition) - 1 - start), true);

        // Generate the flow node for the ST node with the respective diagnostics annotated
        SemanticModel semanticModel = project.currentPackage().getCompilation()
                .getSemanticModel(project.currentPackage().getDefaultModule().moduleId());
        CodeAnalyzer codeAnalyzer = new CodeAnalyzer(project, semanticModel, Property.LOCAL_SCOPE, Map.of(),
                Map.of(), updatedTextDocument, ModuleInfo.from(updatedDoc.module().descriptor()), true,
                workspaceManager);
        node.accept(codeAnalyzer);
        List<FlowNode> flowNodes = codeAnalyzer.getFlowNodes();
        if (flowNodes.size() != 1) {
            return null;
        }
        return gson.toJsonTree(flowNodes.getFirst());
    }

    public String getKey() {
        return filePath + ":" + flowNode.hashCode();
    }

    public void revertDocument() {
        if (prevDoc != null) {
            Path path = Path.of(filePath);
            workspaceManager.document(path).ifPresent(value -> value
                    .modify()
                    .withContent(String.join(System.lineSeparator(), prevDoc.textLines()))
                    .apply());
        }
    }
}
