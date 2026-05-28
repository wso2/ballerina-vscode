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

import io.ballerina.compiler.syntax.tree.ServiceDeclarationNode;
import io.ballerina.modelgenerator.commons.ReadOnlyMetaData;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import static io.ballerina.servicemodelgenerator.extension.util.Utils.getPath;

/**
 * Extractor for SERVICE_DESCRIPTION kind readOnly metadata.
 * Extracts values from service declaration structure like base path, service type, etc.
 *
 * @since 1.3.0
 */
public class ServiceDescriptionExtractor implements ReadOnlyMetadataExtractor {

    private static final String SERVICE_DESCRIPTION_KIND = "SERVICE_DESCRIPTION";

    @Override
    public Map<String, List<String>> extractValues(ReadOnlyMetaData metadataItem, ServiceDeclarationNode serviceNode,
                                                   ModelFromSourceContext context) {
        Map<String, List<String>> result = new HashMap<>();

        // Extract service description value based on the metadata key
        String value = extractServiceDescriptionValue(serviceNode, context, metadataItem.metadataKey());

        if (value != null) {
            String displayName = metadataItem.displayName() != null && !metadataItem.displayName().isEmpty()
                    ? metadataItem.displayName()
                    : metadataItem.metadataKey();
            // Service descriptions typically have single values, so create a list with one element
            result.put(displayName, List.of(value));
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
     * @param serviceNode  The service declaration node
     * @param context      The model context
     * @param parameterKey The parameter key to extract (e.g., "basePath", "serviceType", "serviceName")
     * @return The extracted value or null
     */
    private String extractServiceDescriptionValue(ServiceDeclarationNode serviceNode, ModelFromSourceContext context,
                                                  String parameterKey) {
        return switch (parameterKey.toLowerCase(Locale.ROOT)) {
            case "basepath", "attachpoint" -> extractAttachPoint(serviceNode);
            case "servicetype" -> extractServiceType(serviceNode);
            case "servicename" -> extractServiceName(serviceNode);
            default -> null;
        };
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

        return null;
    }

    /**
     * Extracts the attach-point from service declaration.
     * Handles both path-based (/foobar) and string literal ("testqueue") attach points.
     *
     * @param serviceNode The service declaration node
     * @return The attach-point value or null if not found
     */
    private String extractAttachPoint(ServiceDeclarationNode serviceNode) {
        // Use the getPath utility method that works with the public API
        String attachPoint = getPath(serviceNode.absoluteResourcePath());
        if (!attachPoint.isEmpty()) {
            if (attachPoint.startsWith("\"") && attachPoint.endsWith("\"")) {
                attachPoint = attachPoint.substring(1, attachPoint.length() - 1);
            }
            return attachPoint;
        }

        return null; // No attach point found
    }

    /**
     * Extracts the service name or identifier.
     *
     * @param serviceNode The service declaration node
     * @return The service name or "Service" if none found
     */
    private String extractServiceName(ServiceDeclarationNode serviceNode) {
        // Try to get service class name if available
        Optional<io.ballerina.compiler.syntax.tree.TypeDescriptorNode> typeDescriptor = serviceNode.typeDescriptor();
        if (typeDescriptor.isPresent()) {
            String typeString = typeDescriptor.get().toString().trim();
            return typeString;
        }

        // Check if there's an attach point that could serve as service identifier
        String attachPoint = extractAttachPoint(serviceNode);
        if (attachPoint != null && !attachPoint.isEmpty()) {
            // Remove leading slash for better display
            return attachPoint.startsWith("/") ? attachPoint.substring(1) : attachPoint;
        }

        return null;
    }
}
