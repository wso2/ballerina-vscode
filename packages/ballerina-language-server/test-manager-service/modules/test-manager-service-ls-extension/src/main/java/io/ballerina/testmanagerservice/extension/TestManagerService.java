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

package io.ballerina.testmanagerservice.extension;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import io.ballerina.testmanagerservice.extension.model.Annotation;
import io.ballerina.testmanagerservice.extension.model.FunctionParameter;
import io.ballerina.testmanagerservice.extension.model.Property;
import io.ballerina.testmanagerservice.extension.request.AddTestFunctionRequest;
import io.ballerina.testmanagerservice.extension.request.GetTestFunctionRequest;
import io.ballerina.testmanagerservice.extension.request.TestsDiscoveryRequest;
import io.ballerina.testmanagerservice.extension.request.UpdateTestFunctionRequest;
import io.ballerina.testmanagerservice.extension.response.CommonSourceResponse;
import io.ballerina.testmanagerservice.extension.response.GetTestFunctionResponse;
import io.ballerina.testmanagerservice.extension.response.TestsDiscoveryResponse;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.common.utils.NameUtil;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.TextEdit;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Represents the extended language server service for the test manager service.
 *
 * @since 1.0.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("testManagerService")
public class TestManagerService implements ExtendedLanguageServerService {

    private WorkspaceManager workspaceManager;

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager) {
        this.workspaceManager = workspaceManager;
    }

    @Override
    public Class<?> getRemoteInterface() {
        return null;
    }

    /**
     * Discovers tests in a file.
     *
     * @param request the request to discover tests in a file
     * @return the response to discover tests in a file
     */
    @JsonRequest
    public CompletableFuture<TestsDiscoveryResponse> discoverInFile(TestsDiscoveryRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Path filePath = Path.of(request.projectPath());
                this.workspaceManager.loadProject(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (document.isEmpty()) {
                    throw new RuntimeException("Test document not found: " + filePath);
                }
                ModuleTestDetailsHolder moduleTestDetailsHolder = new ModuleTestDetailsHolder();
                TestFunctionsFinder testFunctionsFinder = new TestFunctionsFinder(document.get(),
                        moduleTestDetailsHolder);
                testFunctionsFinder.find();
                return TestsDiscoveryResponse.from(moduleTestDetailsHolder.getGroupsToFunctions());
            } catch (Throwable e) {
                return TestsDiscoveryResponse.from(e);
            }
        });
    }

    /**
     * Discovers tests in a project.
     *
     * @param request the request to discover tests in a project
     * @return the response to discover tests in a project
     */
    @JsonRequest
    public CompletableFuture<TestsDiscoveryResponse> discoverInProject(TestsDiscoveryRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Path filePath = Path.of(request.projectPath());
                Project project = this.workspaceManager.loadProject(filePath);
                io.ballerina.projects.Package currentPackage = project.currentPackage();
                Module defaultModule = currentPackage.getDefaultModule();
                ModuleTestDetailsHolder moduleTestDetailsHolder = new ModuleTestDetailsHolder();
                for (DocumentId documentId : defaultModule.testDocumentIds()) {
                    TestFunctionsFinder testFunctionsFinder = new TestFunctionsFinder(
                            defaultModule.document(documentId), moduleTestDetailsHolder);
                    testFunctionsFinder.find();
                }
                return TestsDiscoveryResponse.from(moduleTestDetailsHolder.getGroupsToFunctions());
            } catch (Throwable e) {
                return TestsDiscoveryResponse.from(e);
            }
        });
    }

    /**
     * Get the test function model for the given test function.
     *
     * @param request the request to get the test function model
     * @return the response to get the test function model
     */
    @JsonRequest
    public CompletableFuture<GetTestFunctionResponse> getTestFunction(GetTestFunctionRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Path filePath = Path.of(request.filePath());
                Project project = this.workspaceManager.loadProject(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                if (document.isEmpty() || semanticModel.isEmpty()) {
                    return GetTestFunctionResponse.get();
                }
                ModulePartNode modulePartNode = document.get().syntaxTree().rootNode();
                Optional<FunctionDefinitionNode> matchingFunc = modulePartNode.members().stream()
                        .filter(mem -> mem instanceof FunctionDefinitionNode)
                        .map(mem -> (FunctionDefinitionNode) mem)
                        .filter(mem -> mem.functionName().text().trim().equals(request.functionName()))
                        .findFirst();

                return matchingFunc.map(functionDefinitionNode -> GetTestFunctionResponse.from(
                                Utils.getTestFunctionModel(functionDefinitionNode, semanticModel.get(),
                                        modulePartNode)))
                        .orElseGet(GetTestFunctionResponse::get);
            } catch (Throwable e) {
                return GetTestFunctionResponse.from(e);
            }
        });
    }

    /**
     * Add a test function to the given test function.
     *
     * @param request the request to get the test function model
     * @return the response to get the test function model
     */
    @JsonRequest
    public CompletableFuture<CommonSourceResponse> addTestFunction(AddTestFunctionRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                Optional<SemanticModel> semanticModel = this.workspaceManager.semanticModel(filePath);
                if (document.isEmpty() || semanticModel.isEmpty()) {
                    return new CommonSourceResponse();
                }
                ModulePartNode modulePartNode = document.get().syntaxTree().rootNode();
                LineRange lineRange = modulePartNode.lineRange();
                List<TextEdit> edits = new ArrayList<>();

                // Check if test import is needed
                if (!Utils.isTestModuleImportExists(modulePartNode)) {
                    edits.add(new TextEdit(Utils.toRange(lineRange.startLine()), Constants.IMPORT_TEST_STMT));
                }

                // Check if dataProviderMode is evalSet
                String dataProviderMode = getDataProviderMode(request.function());
                String dataProviderFunctionName = null;

                if (Constants.DATA_PROVIDER_MODE_EVALSET.equals(dataProviderMode)) {
                    // Add AI import if needed
                    if (!Utils.isAiModuleImportExists(modulePartNode)) {
                        edits.add(new TextEdit(Utils.toRange(lineRange.startLine()), Constants.IMPORT_AI_STMT));
                    }

                    // Generate unique function name for evalSet data provider
                    List<Symbol> visibleSymbols = semanticModel.get().visibleSymbols(
                            document.get(),
                            lineRange.endLine()
                    );
                    Set<String> visibleSymbolNames = visibleSymbols.stream()
                            .map(Symbol::getName)
                            .filter(Optional::isPresent)
                            .map(Optional::get)
                            .collect(Collectors.toSet());
                    dataProviderFunctionName = NameUtil.getValidatedSymbolName(
                            visibleSymbolNames,
                            Constants.DEFAULT_EVALSET_FUNCTION_NAME
                    );

                    // Generate the evalSet data provider function
                    String evalSetFile = getEvalSetFile(request.function());
                    if (evalSetFile == null || evalSetFile.isEmpty()) {
                        evalSetFile = "session.json"; // Default fallback
                    }
                    String dataProviderFunction = Utils.getEvalSetDataProviderFunctionTemplate(
                            dataProviderFunctionName,
                            evalSetFile
                    );
                    edits.add(new TextEdit(Utils.toRange(lineRange.endLine()), dataProviderFunction));

                    // Add ai:Trace parameter to the test function
                    addAiConversationThreadParameter(request.function());

                    // Update the dataProvider field with the generated function name
                    updateDataProviderField(request.function(), dataProviderFunctionName);
                }

                // Generate the test function
                String function = Utils.getTestFunctionTemplate(request.function());
                edits.add(new TextEdit(Utils.toRange(lineRange.endLine()), function));

                return new CommonSourceResponse(Map.of(request.filePath(), edits));
            } catch (Throwable e) {
                return new CommonSourceResponse(e);
            }
        });
    }

    private String getDataProviderMode(io.ballerina.testmanagerservice.extension.model.TestFunction function) {
        if (function.annotations() == null) {
            return null;
        }
        for (Annotation annotation : function.annotations()) {
            if ("Config".equals(annotation.name())) {
                for (Property field : annotation.fields()) {
                    if ("dataProviderMode".equals(field.originalName())) {
                        return field.value() != null ? field.value().toString().replaceAll("\"", "") : null;
                    }
                }
            }
        }
        return null;
    }

    private String getEvalSetFile(io.ballerina.testmanagerservice.extension.model.TestFunction function) {
        if (function.annotations() == null) {
            return null;
        }
        for (Annotation annotation : function.annotations()) {
            if ("Config".equals(annotation.name())) {
                for (Property field : annotation.fields()) {
                    if ("evalSetFile".equals(field.originalName())) {
                        return field.value() != null ? field.value().toString().replaceAll("\"", "") : null;
                    }
                }
            }
        }
        return null;
    }

    private void addAiConversationThreadParameter(
            io.ballerina.testmanagerservice.extension.model.TestFunction function) {
        if (function.parameters() == null) {
            return;
        }
        FunctionParameter.FunctionParameterBuilder paramBuilder = new FunctionParameter.FunctionParameterBuilder();
        paramBuilder.type(Constants.AI_CONVERSATION_THREAD_TYPE);
        paramBuilder.variable("thread");
        function.parameters().add(paramBuilder.build());
    }

    private void updateDataProviderField(io.ballerina.testmanagerservice.extension.model.TestFunction function,
                                         String functionName) {
        if (function.annotations() == null) {
            return;
        }
        for (Annotation annotation : function.annotations()) {
            if ("Config".equals(annotation.name())) {
                for (int i = 0; i < annotation.fields().size(); i++) {
                    Property field = annotation.fields().get(i);
                    if ("dataProvider".equals(field.originalName())) {
                        // Update the dataProvider value with the generated function name
                        Property.PropertyBuilder builder = new Property.PropertyBuilder();
                        builder.metadata(field.metadata());
                        builder.codedata(field.codedata());
                        builder.valueType(field.valueType());
                        builder.valueTypeConstraint(field.valueTypeConstraint());
                        builder.value(functionName);
                        builder.originalName(field.originalName());
                        builder.placeholder(field.placeholder());
                        builder.optional(field.optional());
                        builder.editable(field.editable());
                        builder.advanced(field.advanced());
                        annotation.fields().set(i, builder.build());
                        break;
                    }
                }
            }
        }
    }

    /**
     * Update the test function model for the given test function.
     *
     * @param request the request to get the test function model
     * @return the response to get the test function model
     */
    @JsonRequest
    public CompletableFuture<CommonSourceResponse> updateTestFunction(UpdateTestFunctionRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Path filePath = Path.of(request.filePath());
                this.workspaceManager.loadProject(filePath);
                Optional<Document> document = this.workspaceManager.document(filePath);
                if (document.isEmpty()) {
                    return new CommonSourceResponse();
                }
                TextDocument textDocument = document.get().syntaxTree().textDocument();
                ModulePartNode modulePartNode = document.get().syntaxTree().rootNode();
                LineRange lineRange = request.function()
                        .codedata().lineRange();
                int start = textDocument.textPositionFrom(lineRange.startLine());
                int end = textDocument.textPositionFrom(lineRange.endLine());
                NonTerminalNode node = modulePartNode.findNode(TextRange.from(start, end - start), true);
                if (!(node instanceof FunctionDefinitionNode functionDefinitionNode)) {
                    return new CommonSourceResponse();
                }

                List<TextEdit> edits = new ArrayList<>();
                String functionName = functionDefinitionNode.functionName().text().trim();
                LineRange nameRange = functionDefinitionNode.functionName().lineRange();
                if (!functionName.equals(request.function().functionName().value())) {
                    edits.add(new TextEdit(Utils.toRange(nameRange),
                            request.function().functionName().value().toString()));
                }

                LineRange signatureRange = functionDefinitionNode.functionSignature().lineRange();
                String functionSignature = Utils.buildFunctionSignature(request.function());
                edits.add(new TextEdit(Utils.toRange(signatureRange), functionSignature));
                return new CommonSourceResponse(Map.of(request.filePath(), edits));
            } catch (Throwable e) {
                return new CommonSourceResponse(e);
            }
        });
    }
}
