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

package io.ballerina.servicemodelgenerator.extension.extractor;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.ExplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ImplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NameReferenceNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.modelgenerator.commons.ReadOnlyMetaData;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.projects.Document;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextRange;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Extractor for LISTENER_PARAM kind readOnly metadata.
 * Extracts parameter values from listener declarations in service expressions.
 *
 * @since 1.0.0
 */
public class ListenerParamExtractor implements ReadOnlyMetadataExtractor {

    private static final String LISTENER_PARAM_KIND = "LISTENER_PARAM";

    @Override
    public Map<String, String> extractValues(ReadOnlyMetaData metadataItem, ServiceDeclarationNode serviceNode,
                                            ModelFromSourceContext context) {
        Map<String, String> result = new HashMap<>();

        // Extract listener parameter value based on the parameter key
        String paramValue = extractListenerParameterValue(serviceNode, context.semanticModel(),
                metadataItem.metadataKey(), context);

        if (paramValue != null) {
            String displayName = metadataItem.displayName() != null && !metadataItem.displayName().isEmpty()
                    ? metadataItem.displayName()
                    : metadataItem.metadataKey();
            result.put(displayName, paramValue);
        }

        return result;
    }

    @Override
    public String getSupportedKind() {
        return LISTENER_PARAM_KIND;
    }

    /**
     * Extracts a specific parameter value from listener declarations.
     *
     * @param serviceNode The service declaration node
     * @param semanticModel The semantic model for symbol resolution
     * @param parameterName The parameter name to extract (e.g., "host", "port")
     * @return The parameter value as a string, or null if not found
     */
    private String extractListenerParameterValue(ServiceDeclarationNode serviceNode, SemanticModel semanticModel,
                                                String parameterName, ModelFromSourceContext context) {
        SeparatedNodeList<ExpressionNode> expressions = serviceNode.expressions();

        for (ExpressionNode expression : expressions) {
            String paramValue = extractFromExpression(expression, semanticModel, parameterName, context);
            if (paramValue != null) {
                return paramValue;
            }
        }

        return null;
    }

    /**
     * Extracts parameter value from an expression node.
     *
     * @param expression The expression to analyze
     * @param semanticModel The semantic model
     * @param parameterName The parameter name to find
     * @return The parameter value or null
     */
    private String extractFromExpression(ExpressionNode expression, SemanticModel semanticModel, String parameterName, ModelFromSourceContext context) {
        if (expression instanceof ExplicitNewExpressionNode explicitNew) {
            return extractFromListenerConstructor(explicitNew, parameterName);
        } else if (expression instanceof NameReferenceNode nameRef) {
            return extractFromVariableReference(nameRef, semanticModel, parameterName, context);
        }

        return null;
    }

    /**
     * Extracts parameter from listener constructor arguments.
     *
     * @param constructorNode The listener constructor node
     * @param parameterName The parameter name to find
     * @return The parameter value or null
     */
    private String extractFromListenerConstructor(ExplicitNewExpressionNode constructorNode, String parameterName) {
        SeparatedNodeList<FunctionArgumentNode> arguments = constructorNode.parenthesizedArgList().arguments();
        if (arguments.isEmpty()) {
            return null;
        }

        int positionalIndex = 0;
        int targetArgIndex = -1;

        if (parameterName.matches("arg\\d+")) {
            try {
                targetArgIndex = Integer.parseInt(parameterName.substring(3)) - 1; // arg1 -> index 0, arg2 -> index 1
            } catch (NumberFormatException e) {
                // Invalid parameter name format, ignore
            }
        }

        for (FunctionArgumentNode argument : arguments) {
            if (argument instanceof NamedArgumentNode namedArg) {
                String argName = namedArg.argumentName().name().text();
                if (argName.equals(parameterName)) {
                    return extractValueFromExpression(namedArg.expression());
                }
            } else if (argument instanceof PositionalArgumentNode positionalArg && targetArgIndex == positionalIndex) {
                return extractValueFromExpression(positionalArg.expression());
            }

            if (argument instanceof PositionalArgumentNode) {
                positionalIndex++;
            }
        }

        return null;
    }

    /**
     * Extracts parameter from a variable reference (listener variable).
     * Resolves the listener variable and extracts parameters from its constructor.
     *
     * @param nameRef The variable reference node
     * @param semanticModel The semantic model
     * @param parameterName The parameter name to find
     * @param context The model from source context with access to workspace manager
     * @return The parameter value or null
     */
    private String extractFromVariableReference(NameReferenceNode nameRef, SemanticModel semanticModel,
                                               String parameterName, ModelFromSourceContext context) {
        Optional<Symbol> symbol = semanticModel.symbol(nameRef);
        if (symbol.isPresent() && symbol.get() instanceof VariableSymbol variableSymbol) {
            // Find the listener declaration using the working approach
            Optional<ListenerDeclarationNode> listenerNode = findListenerDeclaration(variableSymbol, semanticModel, context);
            if (listenerNode.isPresent()) {
                // Extract from the listener's initializer expression
                Node initializer = listenerNode.get().initializer();
                if (initializer instanceof ExplicitNewExpressionNode explicitNew) {
                    return extractFromListenerConstructor(explicitNew, parameterName);
                } else if (initializer instanceof ImplicitNewExpressionNode implicitNew) {
                    return extractFromImplicitListenerConstructor(implicitNew, parameterName);
                }
            }
        }

        return null;
    }

    /**
     * Finds the ListenerDeclarationNode for a given variable symbol.
     * Implements the working approach from the debug implementation.
     *
     * @param variableSymbol The variable symbol representing the listener
     * @param semanticModel The semantic model for the module where the symbol belongs
     * @param context The model from source context with access to workspace manager
     * @return The ListenerDeclarationNode if found
     */
    private Optional<ListenerDeclarationNode> findListenerDeclaration(VariableSymbol variableSymbol,
                                                                      SemanticModel semanticModel,
                                                                      ModelFromSourceContext context) {
        // Get the location of the variable symbol
        var location = variableSymbol.getLocation();
        if (location.isEmpty()) {
            return Optional.empty();
        }

        try {
            // Get document from workspace manager
            var workspaceManager = context.workspaceManager();
            var filePath = location.get().lineRange().filePath();
            if (filePath == null) {
                return Optional.empty();
            }

            var documentOpt = workspaceManager.document(java.nio.file.Path.of(filePath));
            if (documentOpt.isEmpty()) {
                return Optional.empty();
            }

            // Use the working approach from the debug implementation
            var syntaxTree = documentOpt.get().syntaxTree();
            var textDocument = syntaxTree.textDocument();
            var lineRange = location.get().lineRange();

            int start = textDocument.textPositionFrom(lineRange.startLine());
            int end = textDocument.textPositionFrom(lineRange.endLine());

            ModulePartNode modulePartNode = syntaxTree.rootNode();
            var foundNode = modulePartNode.findNode(TextRange.from(start, end - start), true);

            // Traverse up to find the ListenerDeclarationNode
            Node current = foundNode;
            while (current != null) {
                if (current instanceof ListenerDeclarationNode listenerDeclarationNode) {
                    return Optional.of(listenerDeclarationNode);
                }
                current = current.parent();
            }
        } catch (Exception e) {
            // If anything fails, return empty
            return Optional.empty();
        }

        return Optional.empty();
    }

    /**
     * Extracts parameter from implicit listener constructor arguments.
     *
     * @param constructorNode The implicit listener constructor node
     * @param parameterName The parameter name to find
     * @return The parameter value or null
     */
    private String extractFromImplicitListenerConstructor(ImplicitNewExpressionNode constructorNode, String parameterName) {
        var parenthesizedArgList = constructorNode.parenthesizedArgList();
        if (parenthesizedArgList.isEmpty()) {
            return null;
        }

        SeparatedNodeList<FunctionArgumentNode> arguments = parenthesizedArgList.get().arguments();
        if (arguments.isEmpty()) {
            return null;
        }

        int positionalIndex = 0;
        int targetArgIndex = -1;

        if (parameterName.matches("arg\\d+")) {
            try {
                targetArgIndex = Integer.parseInt(parameterName.substring(3)) - 1; // arg1 -> index 0, arg2 -> index 1
            } catch (NumberFormatException e) {
                // Invalid parameter name format, ignore
            }
        }

        for (FunctionArgumentNode argument : arguments) {
            if (argument instanceof NamedArgumentNode namedArg) {
                String argName = namedArg.argumentName().name().text();
                if (argName.equals(parameterName)) {
                    return extractValueFromExpression(namedArg.expression());
                }
            } else if (argument instanceof PositionalArgumentNode positionalArg && targetArgIndex == positionalIndex) {
                return extractValueFromExpression(positionalArg.expression());
            }

            if (argument instanceof PositionalArgumentNode) {
                positionalIndex++;
            }
        }

        return null;
    }

    /**
     * Extracts value from an expression node.
     *
     * @param expression The expression to extract value from
     * @return The extracted value as string
     */
    private String extractValueFromExpression(ExpressionNode expression) {
        if (expression.kind().equals(SyntaxKind.NUMERIC_LITERAL) ||
            expression.kind().equals(SyntaxKind.STRING_LITERAL) ||
            expression.kind().equals(SyntaxKind.BOOLEAN_LITERAL)) {
            String value = expression.toString().trim();
            // Remove quotes from string literals
            if (value.startsWith("\"") && value.endsWith("\"")) {
                return value.substring(1, value.length() - 1);
            }
            return value;
        } else if (expression instanceof MappingConstructorExpressionNode mapping) {
            return extractFromMapping(mapping);
        }

        return expression.toString().trim();
    }

    /**
     * Extracts value from a mapping constructor (record expression).
     *
     * @param mapping The mapping constructor node
     * @return Extracted value or null
     */
    private String extractFromMapping(MappingConstructorExpressionNode mapping) {
        // For now, return the raw mapping - could be enhanced to extract specific nested fields
        return mapping.toString().trim();
    }
}