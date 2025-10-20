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
                metadataItem.metadataKey());

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
                                                String parameterName) {
        SeparatedNodeList<ExpressionNode> expressions = serviceNode.expressions();

        for (ExpressionNode expression : expressions) {
            String paramValue = extractFromExpression(expression, semanticModel, parameterName);
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
    private String extractFromExpression(ExpressionNode expression, SemanticModel semanticModel, String parameterName) {
        if (expression instanceof ExplicitNewExpressionNode explicitNew) {
            return extractFromListenerConstructor(explicitNew, parameterName);
        } else if (expression instanceof NameReferenceNode nameRef) {
            return extractFromVariableReference(nameRef, semanticModel, parameterName);
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

        for (FunctionArgumentNode argument : arguments) {
            if (argument instanceof NamedArgumentNode namedArg) {
                String argName = namedArg.argumentName().name().text();
                if (argName.equals(parameterName)) {
                    return extractValueFromExpression(namedArg.expression());
                }
            } else if (argument instanceof PositionalArgumentNode positionalArg) {
                // For positional arguments, we'd need to know the parameter order
                // This could be enhanced based on specific listener types
                String value = extractValueFromExpression(positionalArg.expression());
                if (value != null && isLikelyParameterValue(parameterName, value)) {
                    return value;
                }
            }
        }

        return null;
    }

    /**
     * Extracts parameter from a variable reference (listener variable).
     *
     * @param nameRef The variable reference node
     * @param semanticModel The semantic model
     * @param parameterName The parameter name to find
     * @return The parameter value or null
     */
    private String extractFromVariableReference(NameReferenceNode nameRef, SemanticModel semanticModel,
                                               String parameterName) {
        Optional<Symbol> symbol = semanticModel.symbol(nameRef);
        if (symbol.isPresent() && symbol.get() instanceof VariableSymbol) {
            // Try to find the listener variable declaration in the source
            String variableName = nameRef.toSourceCode().trim();
            return findListenerVariableParameter(variableName, parameterName, semanticModel);
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

    /**
     * Finds a parameter value from a listener variable declaration.
     *
     * @param variableName The listener variable name
     * @param parameterName The parameter name to find
     * @param semanticModel The semantic model
     * @return The parameter value or null
     */
    private String findListenerVariableParameter(String variableName, String parameterName, SemanticModel semanticModel) {
        // For now, return null - this would require traversing the syntax tree to find the listener declaration
        // This enhancement can be added by finding ListenerDeclarationNode with the matching variable name
        // and then extracting parameters from its initializer expression
        return null;
    }

    /**
     * Heuristic to check if a value is likely for a specific parameter.
     *
     * @param parameterName The parameter name
     * @param value The value to check
     * @return true if the value seems appropriate for the parameter
     */
    private boolean isLikelyParameterValue(String parameterName, String value) {
        return switch (parameterName.toLowerCase()) {
            case "port" -> value.matches("\\d+") && Integer.parseInt(value) > 0 && Integer.parseInt(value) <= 65535;
            case "host" -> value.contains(".") || value.equals("localhost") || value.equals("0.0.0.0");
            default -> false;
        };
    }
}