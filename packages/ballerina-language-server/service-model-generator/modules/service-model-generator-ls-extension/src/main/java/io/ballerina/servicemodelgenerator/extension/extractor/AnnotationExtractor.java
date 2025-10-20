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

import io.ballerina.compiler.syntax.tree.AnnotationNode;
import io.ballerina.compiler.syntax.tree.BasicLiteralNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.MappingConstructorExpressionNode;
import io.ballerina.compiler.syntax.tree.MetadataNode;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SpecificFieldNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.modelgenerator.commons.ReadOnlyMetaData;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Extractor for ANNOTATION kind readOnly metadata.
 * Extracts parameter values from service annotations.
 *
 * @since 1.0.0
 */
public class AnnotationExtractor implements ReadOnlyMetadataExtractor {

    private static final String ANNOTATION_KIND = "ANNOTATION";

    @Override
    public Map<String, String> extractValues(ReadOnlyMetaData metadataItem, ServiceDeclarationNode serviceNode,
                                            ModelFromSourceContext context) {
        Map<String, String> result = new HashMap<>();

        // Determine annotation name based on module
        String annotationName = getAnnotationNameForModule(context.moduleName());
        if (annotationName == null) {
            return result;
        }

        // Extract the parameter value from the annotation
        String actualValue = extractAnnotationParameterValue(serviceNode, annotationName, metadataItem.metadataKey());
        if (actualValue != null) {
            String displayName = metadataItem.displayName() != null && !metadataItem.displayName().isEmpty()
                    ? metadataItem.displayName()
                    : metadataItem.metadataKey();
            result.put(displayName, actualValue);
        }

        return result;
    }

    @Override
    public String getSupportedKind() {
        return ANNOTATION_KIND;
    }

    /**
     * Determines the annotation name to extract based on the module name.
     *
     * @param moduleName The module name (e.g., "rabbitmq", "asb", etc.)
     * @return The annotation name to extract, or null if not supported
     */
    private String getAnnotationNameForModule(String moduleName) {
        if (moduleName == null) {
            return null;
        }

        return switch (moduleName) {
            case "rabbitmq" -> "rabbitmq:ServiceConfig";
            case "asb" -> "asb:ServiceConfig";
            case "kafka" -> "kafka:ServiceConfig";
            case "mqtt" -> "mqtt:ServiceConfig";
            // Add more mappings as needed for other message broker modules
            default -> null;
        };
    }

    /**
     * Extracts a specific parameter value from an annotation.
     *
     * @param serviceNode The service declaration node
     * @param annotationName The annotation name to search for
     * @param parameterName The parameter name to extract
     * @return The parameter value as a string, or null if not found
     */
    private String extractAnnotationParameterValue(ServiceDeclarationNode serviceNode, String annotationName,
                                                  String parameterName) {
        Optional<MetadataNode> metadata = serviceNode.metadata();
        if (metadata.isEmpty()) {
            return null;
        }

        // Find the specific annotation
        Optional<AnnotationNode> targetAnnotation = metadata.get().annotations().stream()
                .filter(annotation -> annotation.annotReference().toString().trim().equals(annotationName))
                .findFirst();

        if (targetAnnotation.isEmpty()) {
            return null;
        }

        // Extract annotation values
        Optional<MappingConstructorExpressionNode> mapExpr = targetAnnotation.get().annotValue();
        if (mapExpr.isEmpty()) {
            return null;
        }

        // Find the specific parameter field
        Optional<SpecificFieldNode> parameterField = mapExpr.get().fields().stream()
                .filter(fieldNode -> fieldNode.kind().equals(SyntaxKind.SPECIFIC_FIELD))
                .map(fieldNode -> (SpecificFieldNode) fieldNode)
                .filter(fieldNode -> fieldNode.fieldName().toString().trim().equals(parameterName))
                .findFirst();

        if (parameterField.isEmpty()) {
            return null;
        }

        return extractFieldValue(parameterField.get());
    }

    /**
     * Extracts the value from a specific field node in the annotation.
     *
     * @param fieldNode The specific field node containing the value
     * @return The extracted value as a string
     */
    private String extractFieldValue(SpecificFieldNode fieldNode) {
        Optional<ExpressionNode> valueExpr = fieldNode.valueExpr();
        if (valueExpr.isEmpty()) {
            return "";
        }

        ExpressionNode expression = valueExpr.get();

        // Handle different expression types
        if (expression.kind().equals(SyntaxKind.STRING_LITERAL)) {
            String value = ((BasicLiteralNode) expression).literalToken().text();
            // Remove surrounding quotes
            return value.substring(1, value.length() - 1);
        } else if (expression.kind().equals(SyntaxKind.BOOLEAN_LITERAL) ||
                   expression.kind().equals(SyntaxKind.NUMERIC_LITERAL)) {
            return ((BasicLiteralNode) expression).literalToken().text();
        } else {
            // For complex expressions, return the source code
            return expression.toSourceCode().trim();
        }
    }
}