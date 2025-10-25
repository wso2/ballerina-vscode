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
import io.ballerina.compiler.syntax.tree.ListConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NameReferenceNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.PositionalArgumentNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.modelgenerator.commons.ReadOnlyMetaData;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;
import io.ballerina.tools.text.TextDocument;
import io.ballerina.tools.text.TextRange;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
    public Map<String, List<String>> extractValues(ReadOnlyMetaData metadataItem, ServiceDeclarationNode serviceNode,
                                            ModelFromSourceContext context) {
        Map<String, List<String>> result = new HashMap<>();

        // Extract listener parameter values from all listeners (can be multiple)
        List<String> paramValues = extractAllListenerParameterValues(serviceNode, context.semanticModel(),
                metadataItem.metadataKey(), context);

        if (!paramValues.isEmpty()) {
            String displayName = metadataItem.displayName() != null && !metadataItem.displayName().isEmpty()
                    ? metadataItem.displayName()
                    : metadataItem.metadataKey();

            result.put(displayName, paramValues);
        }

        return result;
    }

    @Override
    public String getSupportedKind() {
        return LISTENER_PARAM_KIND;
    }

    /**
     * Extracts parameter values from ALL listener declarations (handles multiple listeners).
     * Also handles attach-point extraction if requested.
     *
     * @param serviceNode The service declaration node
     * @param semanticModel The semantic model for symbol resolution
     * @param parameterName The parameter name to extract (e.g., "host", "port", "attach-point")
     * @param context The model from source context
     * @return List of parameter values from all listeners
     */
    private List<String> extractAllListenerParameterValues(ServiceDeclarationNode serviceNode, SemanticModel semanticModel,
                                                          String parameterName, ModelFromSourceContext context) {
        List<String> allValues = new ArrayList<>();

        // Special handling for attach-point extraction
        if ("attachPoint".equals(parameterName)) {
            String attachPoint = extractAttachPoint(serviceNode);
            if (attachPoint != null) {
                allValues.add(attachPoint);
            }
            return allValues;
        }

        // Extract from each listener expression
        SeparatedNodeList<ExpressionNode> expressions = serviceNode.expressions();
        for (ExpressionNode expression : expressions) {
            List<String> paramValues = extractValuesFromExpression(expression, semanticModel, parameterName, context);
            allValues.addAll(paramValues);
        }

        return allValues;
    }

    /**
     * Extracts the attach-point from service declaration.
     * Handles both path-based (/foobar) and string literal ("testqueue") attach points.
     *
     * @param serviceNode The service declaration node
     * @return The attach-point value or null if not found
     */
    private String extractAttachPoint(ServiceDeclarationNode serviceNode) {
        // Check if service has an attach-point (absolute resource path)
        var attachPoint = serviceNode.absoluteResourcePath();
        if (!attachPoint.isEmpty()) {
            // Handle path-based attach point like /foobar
            return attachPoint.toString().trim();
        }

        // Check for string literal attach point - this would be part of the service declaration syntax
        // For now, we'll skip this and focus on the working path-based extraction
        // TODO: Enhance to handle string literal attach points based on service syntax tree structure

        return null;
    }


    /**
     * Extracts parameter value(s) from an expression node, handling arrays properly.
     *
     * @param expression The expression to analyze
     * @param semanticModel The semantic model
     * @param parameterName The parameter name to find
     * @param context The model from source context
     * @return List of parameter values (single value or multiple for arrays)
     */
    private List<String> extractValuesFromExpression(ExpressionNode expression, SemanticModel semanticModel,
                                                   String parameterName, ModelFromSourceContext context) {
        if (expression instanceof ExplicitNewExpressionNode explicitNew) {
            return extractFromListenerConstructor(explicitNew, parameterName, semanticModel, context);
        } else if (expression instanceof NameReferenceNode nameRef) {
            return extractFromVariableReference(nameRef, semanticModel, parameterName, context);
        }
        return new ArrayList<>();
    }


    /**
     * Extracts parameter from listener constructor arguments.
     *
     * @param constructorNode The listener constructor node
     * @param parameterName The parameter name to find
     * @param semanticModel The semantic model for resolving configurable variables
     * @param context The model from source context
     * @return List of parameter values (multiple if array, single if not)
     */
    private List<String> extractFromListenerConstructor(ExplicitNewExpressionNode constructorNode, String parameterName,
                                                       SemanticModel semanticModel, ModelFromSourceContext context) {
        SeparatedNodeList<FunctionArgumentNode> arguments = constructorNode.parenthesizedArgList().arguments();
        if (arguments.isEmpty()) {
            return new ArrayList<>();
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
                    return extractValuesFromSingleExpression(namedArg.expression(), semanticModel, context);
                }
            } else if (argument instanceof PositionalArgumentNode positionalArg && targetArgIndex == positionalIndex) {
                return extractValuesFromSingleExpression(positionalArg.expression(), semanticModel, context);
            }

            if (argument instanceof PositionalArgumentNode) {
                positionalIndex++;
            }
        }

        return new ArrayList<>();
    }

    /**
     * Extracts parameter from a variable reference (listener variable).
     * Resolves the listener variable and extracts parameters from its constructor.
     *
     * @param nameRef The variable reference node
     * @param semanticModel The semantic model
     * @param parameterName The parameter name to find
     * @param context The model from source context with access to workspace manager
     * @return List of parameter values
     */
    private List<String> extractFromVariableReference(NameReferenceNode nameRef, SemanticModel semanticModel,
                                                     String parameterName, ModelFromSourceContext context) {
        Optional<Symbol> symbol = semanticModel.symbol(nameRef);
        if (symbol.isPresent() && symbol.get() instanceof VariableSymbol variableSymbol) {
            // Find the listener declaration using the working approach
            Optional<ListenerDeclarationNode> listenerNode = findListenerDeclaration(variableSymbol, context);
            if (listenerNode.isPresent()) {
                // Extract from the listener's initializer expression
                Node initializer = listenerNode.get().initializer();
                if (initializer instanceof ExplicitNewExpressionNode explicitNew) {
                    return extractFromListenerConstructor(explicitNew, parameterName, semanticModel, context);
                } else if (initializer instanceof ImplicitNewExpressionNode implicitNew) {
                    return extractFromImplicitListenerConstructor(implicitNew, parameterName, semanticModel, context);
                }
            }
        }

        return new ArrayList<>();
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
     * @param semanticModel The semantic model for resolving configurable variables
     * @param context The model from source context
     * @return List of parameter values
     */
    private List<String> extractFromImplicitListenerConstructor(ImplicitNewExpressionNode constructorNode, String parameterName,
                                                               SemanticModel semanticModel, ModelFromSourceContext context) {
        var parenthesizedArgList = constructorNode.parenthesizedArgList();
        if (parenthesizedArgList.isEmpty()) {
            return new ArrayList<>();
        }

        SeparatedNodeList<FunctionArgumentNode> arguments = parenthesizedArgList.get().arguments();
        if (arguments.isEmpty()) {
            return new ArrayList<>();
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
                    return extractValuesFromSingleExpression(namedArg.expression(), semanticModel, context);
                }
            } else if (argument instanceof PositionalArgumentNode positionalArg && targetArgIndex == positionalIndex) {
                return extractValuesFromSingleExpression(positionalArg.expression(), semanticModel, context);
            }

            if (argument instanceof PositionalArgumentNode) {
                positionalIndex++;
            }
        }

        return new ArrayList<>();
    }


    /**
     * Extracts value from an expression node with support for configurable variables.
     *
     * @param expression The expression to extract value from
     * @param semanticModel The semantic model for resolving configurable variables
     * @param context The model from source context
     * @return The extracted value as string
     */
    private String extractValueFromExpression(ExpressionNode expression, SemanticModel semanticModel, ModelFromSourceContext context) {
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
        } else if (expression instanceof NameReferenceNode nameRef) {
            // Handle configurable variable references
            return resolveConfigurableVariable(nameRef, semanticModel, context);
        }

        return expression.toString().trim();
    }

    /**
     * Resolves configurable variable values by finding their declarations.
     *
     * @param nameRef The name reference to resolve
     * @param semanticModel The semantic model
     * @param context The model from source context
     * @return The resolved value or the variable name if resolution fails
     */
    private String resolveConfigurableVariable(NameReferenceNode nameRef, SemanticModel semanticModel, ModelFromSourceContext context) {
        Optional<Symbol> symbol = semanticModel.symbol(nameRef);
        if (symbol.isPresent() && symbol.get() instanceof VariableSymbol variableSymbol) {
            // Find the configurable variable declaration
            Optional<String> defaultValue = findConfigurableVariableDefaultValue(variableSymbol, context);
            if (defaultValue.isPresent()) {
                return defaultValue.get();
            }
        }

        // If we can't resolve the configurable, return the variable name
        return nameRef.toString().trim();
    }

    /**
     * Finds the default value of a configurable variable.
     *
     * @param variableSymbol The variable symbol
     * @param semanticModel The semantic model
     * @param context The model from source context
     * @return The default value if found
     */
    private Optional<String> findConfigurableVariableDefaultValue(VariableSymbol variableSymbol, ModelFromSourceContext context) {
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

            // Find the variable declaration in the syntax tree
            var syntaxTree = documentOpt.get().syntaxTree();
            var textDocument = syntaxTree.textDocument();
            var lineRange = location.get().lineRange();

            int start = textDocument.textPositionFrom(lineRange.startLine());
            int end = textDocument.textPositionFrom(lineRange.endLine());

            ModulePartNode modulePartNode = syntaxTree.rootNode();
            var foundNode = modulePartNode.findNode(TextRange.from(start, end - start), true);

            // Look for a module variable declaration with an initializer
            Node current = foundNode;
            while (current != null) {
                if (current.kind() == SyntaxKind.MODULE_VAR_DECL) {
                    // Check if this is a configurable variable with an initializer
                    String nodeText = current.toString();
                    if (nodeText.contains("configurable") && nodeText.contains("=")) {
                        // Extract the default value after the equals sign
                        String[] parts = nodeText.split("=", 2);
                        if (parts.length > 1) {
                            String defaultValuePart = parts[1].trim();
                            // Remove semicolon if present
                            if (defaultValuePart.endsWith(";")) {
                                defaultValuePart = defaultValuePart.substring(0, defaultValuePart.length() - 1).trim();
                            }
                            // Remove quotes if it's a string literal
                            if (defaultValuePart.startsWith("\"") && defaultValuePart.endsWith("\"")) {
                                return Optional.of(defaultValuePart.substring(1, defaultValuePart.length() - 1));
                            }
                            return Optional.of(defaultValuePart);
                        }
                    }
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
     * Extracts values from a single expression, handling arrays properly.
     *
     * @param expression The expression to extract values from
     * @param semanticModel The semantic model
     * @param context The model from source context
     * @return List of values (multiple if array, single if not)
     */
    private List<String> extractValuesFromSingleExpression(ExpressionNode expression, SemanticModel semanticModel, ModelFromSourceContext context) {
        List<String> values = new ArrayList<>();

        if (expression instanceof ListConstructorExpressionNode listConstructor) {
            // Handle array literals like ["customer", "student"]
            SeparatedNodeList<Node> expressions = listConstructor.expressions();
            for (Node expr : expressions) {
                if (expr instanceof ExpressionNode expressionNode) {
                    String value = extractValueFromExpression(expressionNode, semanticModel, context);
                    if (value != null && !value.isEmpty()) {
                        values.add(value);
                    }
                }
            }
        } else {
            // Handle single values
            String value = extractValueFromExpression(expression, semanticModel, context);
            if (value != null && !value.isEmpty()) {
                values.add(value);
            }
        }

        return values;
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