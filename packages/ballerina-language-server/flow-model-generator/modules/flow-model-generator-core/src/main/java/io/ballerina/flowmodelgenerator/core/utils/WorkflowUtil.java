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

package io.ballerina.flowmodelgenerator.core.utils;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.AnnotationAttachmentSymbol;
import io.ballerina.compiler.api.symbols.AnnotationSymbol;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.FunctionSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.Qualifier;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.syntax.tree.FunctionDefinitionNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.flowmodelgenerator.core.Constants;
import io.ballerina.flowmodelgenerator.core.model.SourceBuilder;
import io.ballerina.projects.Document;
import io.ballerina.tools.text.LineRange;
import io.ballerina.tools.text.TextRange;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.ACTIVITY;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_MODULE;
import static io.ballerina.flowmodelgenerator.core.Constants.Workflow.WORKFLOW_ORG;

/**
 * Utility for workflow related operations.
 *
 * @since 1.8.0
 */
public class WorkflowUtil {
    public static boolean isWorkflowModule(Optional<ModuleSymbol> moduleSymbol) {
        if (moduleSymbol.isEmpty()) {
            return false;
        }
        String moduleName = moduleSymbol.get().id().moduleName();
        String orgName = moduleSymbol.get().id().orgName();
        return WORKFLOW_ORG.equals(orgName) && WORKFLOW_MODULE.equals(moduleName);
    }

    /**
     * Checks if the given function symbol has the @workflow:Workflow annotation.
     *
     * @param symbol The function symbol to check
     * @return true if the function has @workflow:Workflow annotation, false otherwise
     */
    public static boolean isWorkflowFunction(Symbol symbol) {
        if (symbol == null) {
            return false;
        }
        if (symbol.kind() == SymbolKind.FUNCTION) {
            FunctionSymbol funcSymbol = (FunctionSymbol) symbol;
            List<AnnotationAttachmentSymbol> annotations = funcSymbol.annotAttachments();
            for (AnnotationAttachmentSymbol attachment : annotations) {
                AnnotationSymbol annotation = attachment.typeDescriptor();
                Optional<String> annotationName = annotation.getName();
                Optional<ModuleSymbol> moduleSymbol = annotation.getModule();

                if (annotationName.isPresent() && moduleSymbol.isPresent()) {
                    String name = annotationName.get();
                    if (WORKFLOW.equals(name) && isWorkflowModule(moduleSymbol)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public static boolean isInsideWorkflowFunction(SemanticModel semanticModel, Node node) {
        Node parent = node;
        while (parent != null) {
            if (parent.kind() == SyntaxKind.FUNCTION_DEFINITION) {
                return isWorkflowFunction(semanticModel.symbol(parent).orElse(null));
            }
            parent = parent.parent();
        }
        return false;
    }

    /**
     * Checks if the given function symbol has the @workflow:DurableAgent annotation.
     *
     * @param symbol The function symbol to check
     * @return true if the function has @workflow:DurableAgent annotation, false otherwise
     */
    public static boolean isDurableAgentFunction(Symbol symbol) {
        return hasWorkflowAnnotation(symbol, Constants.Workflow.DURABLE_AGENT);
    }

    /**
     * Checks whether the cursor node is inside a @workflow:DurableAgent function.
     *
     * @param semanticModel the semantic model
     * @param node          the node at the cursor position
     * @return true when the enclosing function is a durable agent
     */
    public static boolean isInsideDurableAgentFunction(SemanticModel semanticModel, Node node) {
        Node parent = node;
        while (parent != null) {
            if (parent.kind() == SyntaxKind.FUNCTION_DEFINITION) {
                return isDurableAgentFunction(semanticModel.symbol(parent).orElse(null));
            }
            parent = parent.parent();
        }
        return false;
    }

    private static boolean hasWorkflowAnnotation(Symbol symbol, String annotationName) {
        if (symbol == null || symbol.kind() != SymbolKind.FUNCTION) {
            return false;
        }
        for (AnnotationAttachmentSymbol attachment : ((FunctionSymbol) symbol).annotAttachments()) {
            AnnotationSymbol annotation = attachment.typeDescriptor();
            Optional<String> name = annotation.getName();
            if (name.isPresent() && annotationName.equals(name.get()) && isWorkflowModule(annotation.getModule())) {
                return true;
            }
        }
        return false;
    }

    /**
     * Finds the enclosing @workflow:DurableAgent function definition for the source builder's insertion point.
     *
     * @param sourceBuilder the source builder carrying the flow node's line range
     * @return the enclosing durable agent function, or null when not found
     */
    // The request file path may be the project directory (e.g. connection-config saves pass
    // the project root); resolve the actual source file from the node's line range.
    private static Path resolveSourceFile(SourceBuilder sourceBuilder) {
        Path filePath = sourceBuilder.filePath;
        if (filePath.toString().endsWith(".bal")) {
            return filePath;
        }
        LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
        if (lineRange != null && lineRange.fileName() != null) {
            return filePath.resolve(lineRange.fileName());
        }
        return filePath;
    }

    public static FunctionDefinitionNode findEnclosingDurableAgentFunction(SourceBuilder sourceBuilder) {
        Path sourceFile = resolveSourceFile(sourceBuilder);
        Document document = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, sourceFile);
        SemanticModel semanticModel = FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager,
                sourceFile);
        LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
        if (lineRange == null) {
            return null;
        }

        SyntaxTree syntaxTree = document.syntaxTree();
        int txtPos = document.textDocument().textPositionFrom(lineRange.startLine());
        TextRange range = TextRange.from(txtPos, 0);

        Node parent = ((ModulePartNode) syntaxTree.rootNode()).findNode(range);
        while (parent != null) {
            if (parent.kind() == SyntaxKind.FUNCTION_DEFINITION) {
                return isDurableAgentFunction(semanticModel.symbol(parent).orElse(null))
                        ? (FunctionDefinitionNode) parent : null;
            }
            parent = parent.parent();
        }
        return null;
    }

    /**
     * Resolves the name of the {@code workflow:AgentContext} parameter of the enclosing durable agent
     * function, defaulting to {@code ctx} (the generated signature always declares one).
     *
     * @param sourceBuilder the source builder carrying the flow node's line range
     * @return the agent context parameter name
     */
    public static String resolveAgentContextParamName(SourceBuilder sourceBuilder) {
        Path sourceFile = resolveSourceFile(sourceBuilder);
        try {
            sourceBuilder.workspaceManager.loadProject(sourceFile);
        } catch (Exception e) {
            return Constants.Workflow.DEFAULT_AGENT_CTX_PARAM_NAME;
        }
        FunctionDefinitionNode agentFunction = findEnclosingDurableAgentFunction(sourceBuilder);
        if (agentFunction == null) {
            return Constants.Workflow.DEFAULT_AGENT_CTX_PARAM_NAME;
        }
        SemanticModel semanticModel = FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager,
                sourceFile);
        for (io.ballerina.compiler.syntax.tree.ParameterNode parameter
                : agentFunction.functionSignature().parameters()) {
            Optional<Symbol> symbol = semanticModel.symbol(parameter);
            if (symbol.isEmpty() || symbol.get().kind() != SymbolKind.PARAMETER) {
                continue;
            }
            ParameterSymbol paramSymbol = (ParameterSymbol) symbol.get();
            TypeSymbol typeDesc = TypeUtils.resolveTypeReference(paramSymbol.typeDescriptor());
            boolean isAgentContext = isWorkflowModule(typeDesc.getModule())
                    && typeDesc.getName().map(Constants.Workflow.AGENT_CONTEXT_CLASS_NAME::equals).orElse(false);
            if (isAgentContext && paramSymbol.getName().isPresent()) {
                return paramSymbol.getName().get();
            }
        }
        return Constants.Workflow.DEFAULT_AGENT_CTX_PARAM_NAME;
    }

    /**
     * Checks if the given function symbol has the @workflow:Activity annotation.
     *
     * @param symbol symbol to check
     * @return true if the function has @workflow:Activity annotation, false otherwise
     */
    public static boolean isActivityFunction(Symbol symbol) {
        if (symbol == null) {
            return false;
        }
        if (symbol.kind() == SymbolKind.FUNCTION) {
            FunctionSymbol funcSymbol = (FunctionSymbol) symbol;
            List<AnnotationAttachmentSymbol> annotations = funcSymbol.annotAttachments();
            for (AnnotationAttachmentSymbol attachment : annotations) {
                AnnotationSymbol annotation = attachment.typeDescriptor();
                Optional<String> annotationName = annotation.getName();
                Optional<ModuleSymbol> moduleSymbol = annotation.getModule();

                if (annotationName.isPresent() && moduleSymbol.isPresent()) {
                    String name = annotationName.get();
                    if (ACTIVITY.equals(name) && isWorkflowModule(moduleSymbol)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public static FunctionDefinitionNode findEnclosingWorkflowFunction(SourceBuilder sourceBuilder) {
        Document document = FileSystemUtils.getDocument(sourceBuilder.workspaceManager, sourceBuilder.filePath);
        SemanticModel semanticModel = FileSystemUtils.getSemanticModel(sourceBuilder.workspaceManager,
                sourceBuilder.filePath);
        LineRange lineRange = sourceBuilder.flowNode.codedata().lineRange();
        if (lineRange == null) {
            return null;
        }

        SyntaxTree syntaxTree = document.syntaxTree();
        int txtPos = document.textDocument().textPositionFrom(lineRange.startLine());
        TextRange range = TextRange.from(txtPos, 0);

        Node parent = ((ModulePartNode) syntaxTree.rootNode()).findNode(range);
        while (parent != null) {
            if (parent.kind() == SyntaxKind.FUNCTION_DEFINITION &&
                    isWorkflowFunction(semanticModel.symbol(parent).orElse(null))) {
                return (FunctionDefinitionNode) parent;
            } else if (parent.kind() != SyntaxKind.FUNCTION_DEFINITION) {
                parent = parent.parent();
            } else {
                return null;
            }
        }
        return null;
    }

    public static boolean isValidDataType(TypeSymbol typeSymbol) {
        typeSymbol = TypeUtils.resolveTypeReference(typeSymbol);
        TypeDescKind kind = typeSymbol.typeKind();

        // Must be a record type
        if (kind != TypeDescKind.RECORD) {
            return false;
        }

        // Check that it's a RecordTypeSymbol and all fields are future types
        Map<String, RecordFieldSymbol> fields = ((RecordTypeSymbol) typeSymbol).fieldDescriptors();
        if (fields.isEmpty()) {
            // Empty record is not a valid data record
            return false;
        }

        for (RecordFieldSymbol field : fields.values()) {
            TypeSymbol fieldType = TypeUtils.resolveTypeReference(field.typeDescriptor());
            if (fieldType.typeKind() != TypeDescKind.FUTURE) {
                return false;
            }
        }

        return true;
    }

    public static boolean isWorkflowContextParameter(ParameterSymbol paramSymbol) {
        TypeSymbol typeDesc = TypeUtils.resolveTypeReference(paramSymbol.typeDescriptor());
        return WorkflowUtil.isWorkflowModule(typeDesc.getModule())
                && typeDesc.getName().map(Constants.Workflow.CONTEXT_CLASS_NAME::equals).orElse(false);
    }

    /**
     * Resolves the given type to a client class symbol, if it is one. Activities generated from a
     * connection take the connection client (e.g. {@code http:Client}) as their first parameter; this
     * detects such a parameter so a connection-backed activity call can be modelled with a connection
     * association (and rendered with a connection arrow) rather than as a plain data argument.
     *
     * @param typeSymbol the parameter type to inspect
     * @return the client {@link ClassSymbol} if {@code typeSymbol} resolves to a {@code client} class
     */
    public static Optional<ClassSymbol> resolveConnectionClass(TypeSymbol typeSymbol) {
        if (typeSymbol == null) {
            return Optional.empty();
        }
        TypeSymbol resolved = TypeUtils.resolveTypeReference(typeSymbol);
        if (resolved instanceof ClassSymbol classSymbol && classSymbol.qualifiers().contains(Qualifier.CLIENT)) {
            return Optional.of(classSymbol);
        }
        return Optional.empty();
    }

    /**
     * Resolves the given type to any class symbol — client or plain. Used by the
     * create-activity-from-connection wizard, which can also wrap methods of non-client classes
     * such as {@code ai:Agent} (whose {@code run()} is a normal method, not a remote action).
     *
     * @param typeSymbol the variable type to inspect
     * @return the {@link ClassSymbol} if {@code typeSymbol} resolves to a class
     */
    public static Optional<ClassSymbol> resolveWrappableClass(TypeSymbol typeSymbol) {
        if (typeSymbol == null) {
            return Optional.empty();
        }
        TypeSymbol resolved = TypeUtils.resolveTypeReference(typeSymbol);
        if (resolved instanceof ClassSymbol classSymbol) {
            return Optional.of(classSymbol);
        }
        return Optional.empty();
    }
}
