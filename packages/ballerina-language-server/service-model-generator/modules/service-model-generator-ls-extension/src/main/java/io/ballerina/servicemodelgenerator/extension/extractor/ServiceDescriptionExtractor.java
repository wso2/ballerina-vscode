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

import io.ballerina.compiler.syntax.tree.BasicLiteralNode;
import io.ballerina.compiler.syntax.tree.ExpressionNode;
import io.ballerina.compiler.syntax.tree.SeparatedNodeList;
import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.modelgenerator.commons.ReadOnlyMetaData;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Extractor for SERVICE_DESCRIPTION kind readOnly metadata.
 * Extracts values from service declaration structure like base path, service type, etc.
 *
 * @since 1.0.0
 */
public class ServiceDescriptionExtractor implements ReadOnlyMetadataExtractor {

    private static final String SERVICE_DESCRIPTION_KIND = "SERVICE_DESCRIPTION";

    @Override
    public Map<String, String> extractValues(ReadOnlyMetaData metadataItem, ServiceDeclarationNode serviceNode,
                                            ModelFromSourceContext context) {
        Map<String, String> result = new HashMap<>();

        // Extract service description value based on the metadata key
        String value = extractServiceDescriptionValue(serviceNode, context, metadataItem.metadataKey());

        if (value != null) {
            String displayName = metadataItem.displayName() != null && !metadataItem.displayName().isEmpty()
                    ? metadataItem.displayName()
                    : metadataItem.metadataKey();
            result.put(displayName, value);
        }

        return result;
    }

    @Override
    public String getSupportedKind() {
        return SERVICE_DESCRIPTION_KIND;
    }

    /**
     * Extracts service description value based on the parameter key.
     *
     * @param serviceNode The service declaration node
     * @param context The model context
     * @param parameterKey The parameter key to extract (e.g., "basePath", "serviceType", "host")
     * @return The extracted value or null
     */
    private String extractServiceDescriptionValue(ServiceDeclarationNode serviceNode, ModelFromSourceContext context,
                                                 String parameterKey) {
        return switch (parameterKey.toLowerCase()) {
            case "basepath", "base_path" -> extractBasePath(serviceNode);
            case "servicetype", "service_type" -> extractServiceType(serviceNode);
            case "modulename", "module_name" -> context.moduleName();
            case "orgname", "org_name" -> context.orgName();
            case "host" -> extractHostFromContext(context);
            case "protocol" -> extractProtocol(context);
            default -> null;
        };
    }

    /**
     * Extracts the base path from service declaration.
     *
     * @param serviceNode The service declaration node
     * @return The base path or default "/"
     */
    private String extractBasePath(ServiceDeclarationNode serviceNode) {
        SeparatedNodeList<ExpressionNode> expressions = serviceNode.expressions();

        // Look for string literal expressions that might be the base path
        for (ExpressionNode expression : expressions) {
            if (expression.kind().equals(SyntaxKind.STRING_LITERAL)) {
                String path = ((BasicLiteralNode) expression).literalToken().text();
                // Remove surrounding quotes
                if (path.startsWith("\"") && path.endsWith("\"")) {
                    path = path.substring(1, path.length() - 1);
                }
                // If it looks like a path, return it
                if (path.startsWith("/") || path.equals("")) {
                    return path.isEmpty() ? "/" : path;
                }
            }
        }

        return "/"; // Default base path
    }

    /**
     * Extracts the service type from service declaration.
     *
     * @param serviceNode The service declaration node
     * @return The service type or "Service"
     */
    private String extractServiceType(ServiceDeclarationNode serviceNode) {
        Optional<io.ballerina.compiler.syntax.tree.TypeDescriptorNode> typeDescriptor = serviceNode.typeDescriptor();
        if (typeDescriptor.isPresent()) {
            String typeString = typeDescriptor.get().toString().trim();
            // Extract the service type name from qualified name
            if (typeString.contains(":")) {
                String[] parts = typeString.split(":");
                return parts[parts.length - 1]; // Get the last part
            }
            return typeString;
        }

        return "Service"; // Default service type
    }

    /**
     * Extracts host information from context or default.
     *
     * @param context The model context
     * @return The host value
     */
    private String extractHostFromContext(ModelFromSourceContext context) {
        // This could be enhanced to extract from listener configurations
        // For now, return a default value
        return "localhost";
    }

    /**
     * Extracts protocol information from context.
     *
     * @param context The model context
     * @return The protocol value
     */
    private String extractProtocol(ModelFromSourceContext context) {
        if (context.moduleName() != null) {
            return switch (context.moduleName().toLowerCase()) {
                case "http" -> "HTTP";
                case "https" -> "HTTPS";
                case "graphql" -> "HTTP/GraphQL";
                case "tcp" -> "TCP";
                case "rabbitmq" -> "AMQP";
                case "kafka" -> "Kafka";
                case "mqtt" -> "MQTT";
                default -> context.moduleName().toUpperCase();
            };
        }

        return "Unknown";
    }
}