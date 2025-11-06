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

package io.ballerina.servicemodelgenerator.extension.builder.service;

import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.BasicLiteralNode;
import io.ballerina.compiler.syntax.tree.ExplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.FunctionArgumentNode;
import io.ballerina.compiler.syntax.tree.ImplicitNewExpressionNode;
import io.ballerina.compiler.syntax.tree.ListenerDeclarationNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.NameReferenceNode;
import io.ballerina.compiler.syntax.tree.NamedArgumentNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.ParenthesizedArgList;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.modelgenerator.commons.ReadOnlyMetaData;
import io.ballerina.servicemodelgenerator.extension.extractor.CustomExtractor;
import io.ballerina.servicemodelgenerator.extension.extractor.ListenerParamExtractor;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Constants.ASB;

/**
 * Builder class for Azure Service Bus (ASB) service.
 *
 * @since 1.3.0
 */
public final class AsbServiceBuilder extends AbstractServiceBuilder implements CustomExtractor {

    private String currentMetadataKey = "";

    @Override
    public String kind() {
        return ASB;
    }

    @Override
    public Map<String, List<String>> extractCustomValues(ReadOnlyMetaData metadataItem,
                                                         ServiceDeclarationNode serviceNode,
                                                         ModelFromSourceContext context) {
        Map<String, List<String>> result = new HashMap<>();

        // Handle ASB-specific nested parameter extraction
        if (("queueName".equals(metadataItem.metadataKey()) || "topicName".equals(metadataItem.metadataKey()))) {
            this.currentMetadataKey = metadataItem.metadataKey();
            List<String> extractedValues = extractEntityValueFromConfig(serviceNode, context);
            if (!extractedValues.isEmpty()) {
                String displayName = metadataItem.displayName() != null && !metadataItem.displayName().isEmpty()
                        ? metadataItem.displayName()
                        : metadataItem.metadataKey();
                result.put(displayName, extractedValues);
            }
        }

        return result;
    }

    /**
     * Extracts entity values (queueName or topicName) from the nested entityConfig structure in ASB listeners.
     * Uses the existing ListenerParamExtractor infrastructure for proper listener resolution.
     *
     * @param serviceNode The service declaration node
     * @param context     The model from source context
     * @return List of entity values found
     */
    private List<String> extractEntityValueFromConfig(ServiceDeclarationNode serviceNode,
                                                      ModelFromSourceContext context) {
        List<String> entityValues = new ArrayList<>();

        // Extract from each listener expression in the service
        SeparatedNodeList<ExpressionNode> expressions = serviceNode.expressions();
        for (ExpressionNode expression : expressions) {
            List<String> extractedValues = extractEntityValueFromListenerExpression(expression, context);
            entityValues.addAll(extractedValues);
        }

        return entityValues;
    }

    /**
     * Extracts entity values from a single listener expression using ListenerParamExtractor's logic.
     *
     * @param expression The listener expression to analyze
     * @param context    The model from source context
     * @return List of entity values from this expression
     */
    private List<String> extractEntityValueFromListenerExpression(ExpressionNode expression,
                                                                  ModelFromSourceContext context) {
        List<String> entityValues = new ArrayList<>();

        if (expression instanceof ExplicitNewExpressionNode explicitNew) {
            entityValues.addAll(extractFromAsbListenerConstructor(explicitNew));
        } else if (expression instanceof NameReferenceNode nameRef) {
            entityValues.addAll(extractFromAsbVariableReference(nameRef, context));
        }

        return entityValues;
    }

    /**
     * Extracts entity values from ASB listener constructor arguments.
     * Looks for entityConfig parameter and extracts the specified metadata key from it.
     */
    private List<String> extractFromAsbListenerConstructor(ExplicitNewExpressionNode constructorNode) {
        SeparatedNodeList<FunctionArgumentNode> arguments = constructorNode.parenthesizedArgList().arguments();
        if (arguments.isEmpty()) {
            return List.of();
        }

        for (FunctionArgumentNode argument : arguments) {
            if (argument instanceof NamedArgumentNode namedArg) {
                String argName = namedArg.argumentName().name().text();
                if ("entityConfig".equals(argName)) {
                    return extractEntityValueFromEntityConfigExpression(namedArg.expression());
                }
            }
        }

        return List.of();
    }

    /**
     * Extracts entity values from variable reference using ListenerParamExtractor's resolution logic.
     */
    private List<String> extractFromAsbVariableReference(NameReferenceNode nameRef, ModelFromSourceContext context) {
        Optional<Symbol> symbol = context.semanticModel().symbol(nameRef);
        if (symbol.isPresent() && symbol.get() instanceof VariableSymbol variableSymbol) {
            Optional<ListenerDeclarationNode> listenerNode =
                    ListenerParamExtractor.findListenerDeclaration(variableSymbol, context);
            if (listenerNode.isPresent()) {
                Node initializer = listenerNode.get().initializer();
                if (initializer instanceof ExplicitNewExpressionNode explicitNew) {
                    return extractFromAsbListenerConstructor(explicitNew);
                } else if (initializer instanceof ImplicitNewExpressionNode implicitNew) {
                    return extractFromAsbImplicitListenerConstructor(implicitNew);
                }
            }
        }
        return List.of();
    }


    /**
     * Extracts from implicit listener constructor (similar to ListenerParamExtractor logic).
     */
    private List<String> extractFromAsbImplicitListenerConstructor(ImplicitNewExpressionNode constructorNode) {
        Optional<ParenthesizedArgList> parenthesizedArgList = constructorNode.parenthesizedArgList();
        if (parenthesizedArgList.isEmpty()) {
            return List.of();
        }

        SeparatedNodeList<FunctionArgumentNode> arguments = parenthesizedArgList.get().arguments();
        if (arguments.isEmpty()) {
            return List.of();
        }

        for (FunctionArgumentNode argument : arguments) {
            if (argument instanceof NamedArgumentNode namedArg) {
                String argName = namedArg.argumentName().name().text();
                if ("entityConfig".equals(argName)) {
                    return extractEntityValueFromEntityConfigExpression(namedArg.expression());
                }
            }
        }

        return List.of();
    }

    /**
     * Extracts entity values from entityConfig expression (mapping constructor).
     * This is the ASB-specific nested parameter extraction logic.
     */
    private List<String> extractEntityValueFromEntityConfigExpression(ExpressionNode expression) {
        if (!(expression instanceof MappingConstructorExpressionNode mappingNode)) {
            return List.of();
        }

        for (Node field : mappingNode.fields()) {
            if (field.kind().equals(SyntaxKind.SPECIFIC_FIELD)) {
                SpecificFieldNode specificField = (SpecificFieldNode) field;
                String fieldName = specificField.fieldName().toString().trim();

                if (this.currentMetadataKey.equals(fieldName) && specificField.valueExpr().isPresent()) {
                    ExpressionNode valueExpr = specificField.valueExpr().get();
                    if (valueExpr.kind().equals(SyntaxKind.STRING_LITERAL)) {
                        String value = ((BasicLiteralNode) valueExpr).literalToken().text();
                        String cleanValue = value.substring(1, value.length() - 1); // Remove quotes
                        return List.of(cleanValue);
                    }
                }
            }
        }

        return List.of();
    }

}
