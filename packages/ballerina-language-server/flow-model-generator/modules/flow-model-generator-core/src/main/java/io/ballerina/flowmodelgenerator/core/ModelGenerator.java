/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonElement;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassFieldSymbol;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.ObjectTypeSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.ServiceDeclarationSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.AssignmentStatementNode;
import io.ballerina.compiler.syntax.tree.FunctionBodyBlockNode;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ModuleMemberDeclarationNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.StatementNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.flowmodelgenerator.core.model.Diagram;
import io.ballerina.flowmodelgenerator.core.model.ExtendedDiagram;
import io.ballerina.flowmodelgenerator.core.model.FlowNode;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Project;
import io.ballerina.projects.ProjectKind;
import io.ballerina.tools.diagnostics.Location;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextRange;
import org.ballerinalang.langserver.common.utils.PositionUtil;
import org.ballerinalang.langserver.commons.BallerinaCompilerApi;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.Position;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;

import static io.ballerina.modelgenerator.commons.CommonUtils.isAgentClass;
import static io.ballerina.modelgenerator.commons.CommonUtils.isAiVectorKnowledgeBase;
import static io.ballerina.modelgenerator.commons.CommonUtils.isAiVectorStore;

/**
 * Generator for the flow model.
 *
 * @since 1.0.0
 */
public class ModelGenerator {

    private final SemanticModel semanticModel;
    private final Path filePath;
    private final Gson gson;
    private final Project project;
    private final WorkspaceManager workspaceManager;

    public ModelGenerator(Project project, SemanticModel model, Path filePath, WorkspaceManager workspaceManager) {
        this.semanticModel = model;
        this.filePath = filePath;
        this.project = project;
        this.gson = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
        this.workspaceManager = workspaceManager;
    }

    /**
     * Generates a flow model for the given canvas node.
     *
     * @return JSON representation of the flow model
     */
    public JsonElement getFlowModel(Document document, LineRange lineRange, Document dataMappingDoc,
                                    Document functionsDoc) {
        // Obtain the code block representing the canvas
        SyntaxTree syntaxTree = document.syntaxTree();
        ModulePartNode modulePartNode = syntaxTree.rootNode();
        TextDocument textDocument = syntaxTree.textDocument();
        int start = textDocument.textPositionFrom(lineRange.startLine());
        int end = textDocument.textPositionFrom(lineRange.endLine());
        NonTerminalNode canvasNode = modulePartNode.findNode(TextRange.from(start, end - start), true);

        // Obtain the connections visible at the module-level
        List<FlowNode> moduleConnections =
                semanticModel.visibleSymbols(document, canvasNode.lineRange().startLine()).stream()
                        .flatMap(symbol -> buildConnection(symbol).stream())
                        .sorted(Comparator.comparing(
                                node -> Optional.ofNullable(node.properties().get(Property.VARIABLE_KEY))
                                        .map(property -> property.value().toString())
                                        .orElse("")))
                        .toList();

        // Obtain the data mapping function names
        Map<String, LineRange> dataMappings = new HashMap<>();
        if (dataMappingDoc != null) {
            ModulePartNode dataMappingModulePartNode = dataMappingDoc.syntaxTree().rootNode();
            for (ModuleMemberDeclarationNode member : dataMappingModulePartNode.members()) {
                if (member.kind() == SyntaxKind.FUNCTION_DEFINITION) {
                    FunctionDefinitionNode functionNode = (FunctionDefinitionNode) member;
                    String functionName = functionNode.functionName().text();
                    LineRange functionLineRange = functionNode.lineRange();
                    dataMappings.put(functionName, functionLineRange);
                }
            }
        }

        // Obtain the natural function names
        Map<String, LineRange> naturalFunctions = new HashMap<>();
        if (functionsDoc != null) {
            ModulePartNode functionsModulePartNode = functionsDoc.syntaxTree().rootNode();
            for (ModuleMemberDeclarationNode member : functionsModulePartNode.members()) {
                if (member.kind() == SyntaxKind.FUNCTION_DEFINITION
                        && BallerinaCompilerApi.getInstance()
                        .isNaturalExpressionBodiedFunction((FunctionDefinitionNode) member)) {
                    FunctionDefinitionNode functionDef = (FunctionDefinitionNode) member;
                    naturalFunctions.put(functionDef.functionName().text(), functionDef.lineRange());
                }
            }
        }

        // Analyze the code block to find the flow nodes
        CodeAnalyzer codeAnalyzer = new CodeAnalyzer(project, semanticModel, Property.LOCAL_SCOPE, dataMappings,
                naturalFunctions, textDocument, ModuleInfo.from(document.module().descriptor()), true,
                workspaceManager);
        canvasNode.accept(codeAnalyzer);

        // Generate the flow model
        Diagram diagram = new Diagram(filePath.toString(), codeAnalyzer.getFlowNodes(), moduleConnections);
        return gson.toJsonTree(diagram);
    }

    public JsonElement getModuleNodes() {
        List<FlowNode> connectionsList = new ArrayList<>();
        List<FlowNode> variablesList = new ArrayList<>();
        List<Symbol> symbols = semanticModel.moduleSymbols();

        for (Symbol symbol : symbols) {
            buildConnection(symbol).ifPresent(connectionsList::add);
            if (symbol instanceof VariableSymbol) {
                buildVariables(symbol).ifPresent(variablesList::add);
            }
        }
        Comparator<FlowNode> comparator = Comparator.comparing(
                node -> Optional.ofNullable(node.properties().get(Property.VARIABLE_KEY))
                        .map(property -> property.value().toString())
                        .orElse("")
        );
        connectionsList.sort(comparator);
        variablesList.sort(comparator);

        ExtendedDiagram diagram = new ExtendedDiagram(filePath.toString(), List.of(), connectionsList, variablesList);
        return gson.toJsonTree(diagram);
    }

    public JsonElement getServiceFieldNodes(LinePosition pos) {
        for (Symbol symbol : semanticModel.moduleSymbols()) {
            if (symbol.kind() != SymbolKind.SERVICE_DECLARATION) {
                continue;
            }
            ServiceDeclarationSymbol serviceDeclarationSymbol = (ServiceDeclarationSymbol) symbol;
            if (!PositionUtil.isWithinLineRange(new Position(pos.line(), pos.offset()),
                    serviceDeclarationSymbol.getLocation().orElseThrow().lineRange())) {
                continue;
            }
            Map<String, ClassFieldSymbol> fieldsMap = serviceDeclarationSymbol.fieldDescriptors();
            Set<String> classFieldRefs = new HashSet<>();
            for (Map.Entry<String, ClassFieldSymbol> field : fieldsMap.entrySet()) {
                if (isClassOrObject(CommonUtils.getRawType(field.getValue().typeDescriptor()))) {
                    classFieldRefs.add("self." + field.getKey());
                }
            }
            Optional<Location> optLocation = serviceDeclarationSymbol.getLocation();
            if (optLocation.isEmpty()) {
                continue;
            }
            Location location = optLocation.get();
            DocumentId documentId = project.documentId(
                    project.kind() == ProjectKind.SINGLE_FILE_PROJECT ? project.sourceRoot() :
                            project.sourceRoot().resolve(location.lineRange().fileName()));
            Document document = project.currentPackage().getDefaultModule().document(documentId);
            NonTerminalNode node = CommonUtils.getNode(document.syntaxTree(), location.textRange());
            if (node.kind() != SyntaxKind.SERVICE_DECLARATION) {
                continue;
            }

            List<FlowNode> connections = new ArrayList<>();
            ServiceDeclarationNode serviceDeclarationNode = (ServiceDeclarationNode) node;
            for (Node member : serviceDeclarationNode.members()) {
                if (member.kind() != SyntaxKind.OBJECT_METHOD_DEFINITION) {
                    continue;
                }
                FunctionDefinitionNode functionDefinitionNode = (FunctionDefinitionNode) member;
                if (!functionDefinitionNode.functionName().text().equals("init")) {
                    continue;
                }
                for (StatementNode statement :
                        ((FunctionBodyBlockNode) functionDefinitionNode.functionBody()).statements()) {
                    if (statement.kind() != SyntaxKind.ASSIGNMENT_STATEMENT) {
                        continue;
                    }
                    if (!classFieldRefs
                            .contains(((AssignmentStatementNode) statement).varRef().toSourceCode().trim())) {
                        continue;
                    }
                    CodeAnalyzer codeAnalyzer = new CodeAnalyzer(project, semanticModel, Property.SERVICE_SCOPE,
                            Map.of(), Map.of(), document.textDocument(),
                            ModuleInfo.from(document.module().descriptor()), false, workspaceManager);
                    statement.accept(codeAnalyzer);
                    List<FlowNode> nodes = codeAnalyzer.getFlowNodes();
                    connections.add(nodes.stream().findFirst().orElseThrow());
                }
            }
            Diagram diagram = new Diagram(filePath.toString(), List.of(), connections);
            return gson.toJsonTree(diagram);
        }
        return null;
    }

    /**
     * Builds a client from the given type symbol.
     *
     * @return the client if the type symbol is a client, otherwise empty
     */
    private Optional<FlowNode> buildConnection(Symbol symbol) {
        Function<NonTerminalNode, NonTerminalNode> getStatementNode;
        NonTerminalNode statementNode;
        TypeSymbol typeSymbol;
        String scope;
        Document document;

        switch (symbol.kind()) {
            case VARIABLE -> {
                getStatementNode = (NonTerminalNode node) -> node.parent().parent();
                typeSymbol = ((VariableSymbol) symbol).typeDescriptor();
                scope = Property.GLOBAL_SCOPE;
            }
            case CLASS_FIELD -> {
                getStatementNode = (NonTerminalNode node) -> node;
                typeSymbol = ((ClassFieldSymbol) symbol).typeDescriptor();
                scope = Property.SERVICE_SCOPE;
            }
            default -> {
                return Optional.empty();
            }
        }
        try {
            TypeSymbol typeDescriptorSymbol = ((TypeReferenceTypeSymbol) typeSymbol).typeDescriptor();
            if (!isClassOrObject(typeDescriptorSymbol)) {
                return Optional.empty();
            }
            Location location = symbol.getLocation().orElseThrow();
            DocumentId documentId = project.documentId(
                    project.kind() == ProjectKind.SINGLE_FILE_PROJECT ? project.sourceRoot() :
                            project.sourceRoot().resolve(location.lineRange().fileName()));
            document = project.currentPackage().getDefaultModule().document(documentId);
            NonTerminalNode childNode =
                    symbol.getLocation().map(loc -> CommonUtils.getNode(document.syntaxTree(), loc.textRange()))
                            .orElseThrow();
            statementNode = getStatementNode.apply(childNode);
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
        if (statementNode == null) {
            return Optional.empty();
        }
        CodeAnalyzer codeAnalyzer = new CodeAnalyzer(project, semanticModel, scope, Map.of(), Map.of(),
                document.textDocument(), ModuleInfo.from(document.module().descriptor()), false,
                workspaceManager);
        statementNode.accept(codeAnalyzer);
        List<FlowNode> connections = codeAnalyzer.getFlowNodes();
        return connections.stream().findFirst();
    }

    private Optional<FlowNode> buildVariables(Symbol symbol) {
        Function<NonTerminalNode, NonTerminalNode> getStatementNode;
        NonTerminalNode statementNode;
        TypeSymbol typeSymbol;
        String scope;
        Document document;

        switch (symbol.kind()) {
            case VARIABLE -> {
                getStatementNode = (NonTerminalNode node) -> node.parent().parent();
                typeSymbol = ((VariableSymbol) symbol).typeDescriptor();
                scope = Property.GLOBAL_SCOPE;
            }
            case CLASS_FIELD -> {
                getStatementNode = (NonTerminalNode node) -> node;
                typeSymbol = ((ClassFieldSymbol) symbol).typeDescriptor();
                scope = Property.SERVICE_SCOPE;
            }
            default -> {
                return Optional.empty();
            }
        }
        try {
            TypeSymbol typeDescriptorSymbol = CommonUtils.getRawType(typeSymbol);
            if (isClassOrObject(typeDescriptorSymbol)) {
                return Optional.empty();
            }
            Location location = symbol.getLocation().orElseThrow();
            DocumentId documentId = project.documentId(
                    project.kind() == ProjectKind.SINGLE_FILE_PROJECT ? project.sourceRoot() :
                            project.sourceRoot().resolve(location.lineRange().fileName()));
            document = project.currentPackage().getDefaultModule().document(documentId);
            NonTerminalNode childNode =
                    symbol.getLocation().map(loc -> CommonUtils.getNode(document.syntaxTree(), loc.textRange()))
                            .orElseThrow();
            statementNode = getStatementNode.apply(childNode);
        } catch (RuntimeException ignored) {
            return Optional.empty();
        }
        if (statementNode == null) {
            return Optional.empty();
        }
        CodeAnalyzer codeAnalyzer = new CodeAnalyzer(project, semanticModel, scope, Map.of(), Map.of(),
                document.textDocument(), ModuleInfo.from(document.module().descriptor()),
                false, workspaceManager);
        statementNode.accept(codeAnalyzer);
        List<FlowNode> connections = codeAnalyzer.getFlowNodes();
        return connections.stream().findFirst();
    }

    private boolean isClassOrObject(TypeSymbol typeSymbol) {
        if (typeSymbol.kind() == SymbolKind.CLASS) {
            if (((ClassSymbol) typeSymbol).qualifiers().contains(Qualifier.CLIENT) || isAgentClass(typeSymbol)
                    || isAiVectorStore(typeSymbol) || isAiVectorKnowledgeBase(typeSymbol)) {
                return true;
            }
        }
        if (typeSymbol.typeKind() == TypeDescKind.OBJECT) {
            return ((ObjectTypeSymbol) typeSymbol).qualifiers().contains(Qualifier.CLIENT);
        }
        return false;
    }
}
