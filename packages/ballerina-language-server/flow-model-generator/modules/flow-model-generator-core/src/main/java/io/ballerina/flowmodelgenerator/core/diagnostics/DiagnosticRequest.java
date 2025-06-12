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
import io.ballerina.compiler.syntax.tree.SyntaxTree;
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
 * This class handles diagnostic processing for flow nodes in the Flow Model Generator.
 *
 * @since 2.0.0
 */
public class DiagnosticRequest implements Callable<JsonElement> {

    private static final Gson gson = new Gson();

    private final String filePath;
    private final JsonElement flowNode;
    private final WorkspaceManager workspaceManager;

    /**
     * Constructs a new FlowNodeDiagnosticsRequest.
     *
     * @param filePath         the file path for the diagnostics request
     * @param flowNode         the flow node to analyze for diagnostics
     * @param workspaceManager the workspace manager for accessing project context
     */
    public DiagnosticRequest(String filePath, JsonElement flowNode, WorkspaceManager workspaceManager) {
        this.filePath = filePath;
        this.flowNode = flowNode;
        this.workspaceManager = workspaceManager;
    }

    @Override
    public JsonElement call() throws Exception {
        try {
            // Get the project and document
            Path path = Path.of(filePath);
            Project project = workspaceManager.loadProject(path);
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
            Map<Path, List<TextEdit>> textEdits =
                    NodeBuilder.getNodeFromKind(flowNodeObj.codedata().node()).toSource(sourceBuilder);

            // --- Apply text edits to the document using Ballerina APIs ---
            TextDocument textDocument = document.get().textDocument();
            List<io.ballerina.tools.text.TextEdit> ballerinaEdits = new ArrayList<>();
            List<TextEdit> lspEdits = textEdits.get(path);
            int start = 0;
            int end = 0;
            LinePosition endLinePosition = null;
            if (lspEdits != null) {
                for (TextEdit edit : lspEdits) {
                    // Convert LSP TextEdit to Ballerina TextEdit
                    Range editRange = edit.getRange();
                    int startLine = editRange.getStart().getLine();
                    int endLine = editRange.getEnd().getLine();

                    List<String> textEditLines = edit.getNewText().lines().toList();
                    String textLine = textEditLines.getLast();

                    start = textDocument.textPositionFrom(
                            LinePosition.from(startLine, editRange.getStart().getCharacter()));
                    end = textDocument.textPositionFrom(LinePosition.from(endLine, editRange.getEnd().getCharacter()));
                    endLinePosition = LinePosition.from(endLine,
                            textEditLines.size() > 1 ? textLine.length() :
                                    editRange.getStart().getCharacter() + textLine.length());
                    ballerinaEdits.add(io.ballerina.tools.text.TextEdit.from(TextRange.from(start, end - start),
                            edit.getNewText()));
                }
            }

            TextDocument newTextDocument = textDocument;
            if (!ballerinaEdits.isEmpty()) {
                newTextDocument = textDocument.apply(
                        TextDocumentChange.from(ballerinaEdits.toArray(new io.ballerina.tools.text.TextEdit[0])));
            }

            // Update the document in the project with the new content
            Document updatedDoc = project.currentPackage().getDefaultModule()
                    .document(document.get().documentId())
                    .modify()
                    .withContent(String.join(System.lineSeparator(), newTextDocument.textLines()))
                    .apply();

            // Get diagnostics from the updated document
            SemanticModel semanticModel = project.currentPackage().getCompilation()
                    .getSemanticModel(project.currentPackage().getDefaultModule().moduleId());

            // --- Generate the flow node for the given line range using updatedDoc.syntaxTree() ---
            TextDocument updatedTextDocument = updatedDoc.textDocument();
            SyntaxTree updatedSyntaxTree = updatedDoc.syntaxTree();
            ModulePartNode modulePartNode = updatedSyntaxTree.rootNode();
            int newEnd = updatedTextDocument.textPositionFrom(endLinePosition) - 1;

            // Use the full document range for the flow node (can be customized)
            NonTerminalNode node = modulePartNode.findNode(TextRange.from(start, newEnd - start), true);

            // Analyze the node to get the flow node using CodeAnalyzer
            CodeAnalyzer codeAnalyzer = new CodeAnalyzer(project, semanticModel, Property.LOCAL_SCOPE, Map.of(),
                    Map.of(), updatedTextDocument, ModuleInfo.from(updatedDoc.module().descriptor()), true);
            node.accept(codeAnalyzer);
            List<FlowNode> flowNodes = codeAnalyzer.getFlowNodes();
            if (flowNodes.size() != 1) {
                return null;
            }
            return gson.toJsonTree(flowNodes.getFirst());
        } catch (Exception e) {
            return null;
        }
    }

    public String getKey() {
        // Create a unique key based on file path and flow node content
        return "flownode-diagnostics:" + filePath + ":" + flowNode.hashCode();
    }

    public void revertDocument() {
        // No document modifications are made in this implementation,
        // so no revert action is needed
    }
}
