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
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.servicemodelgenerator.extension.model.context.ModelFromSourceContext;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Central manager for orchestrating readOnly metadata extraction using different strategies.
 * Implements the Strategy pattern to delegate extraction to appropriate extractors.
 *
 * @since 1.3.0
 */
public class ReadOnlyMetadataManager {

    private final Map<String, ReadOnlyMetadataExtractor> extractors;

    public ReadOnlyMetadataManager() {
        this.extractors = new HashMap<>();
        registerDefaultExtractors();
    }

    /**
     * Registers the default extractors for standard kinds.
     */
    private void registerDefaultExtractors() {
        registerExtractor(new AnnotationExtractor());
        registerExtractor(new ListenerParamExtractor());
        registerExtractor(new ServiceDescriptionExtractor());
    }

    /**
     * Registers an extractor for a specific kind.
     *
     * @param extractor The extractor to register
     */
    public void registerExtractor(ReadOnlyMetadataExtractor extractor) {
        extractors.put(extractor.getSupportedKind(), extractor);
    }

    /**
     * Extracts all readOnly metadata values for a service, combining database metadata with live extracted values.
     * Aggregates values by display name when multiple metadata items have the same display name.
     *
     * @param serviceNode     The service declaration node
     * @param context         The model context
     * @param customExtractor Optional custom extractor for CUSTOM kinds
     * @return Map of display names to list of values (aggregated by display name)
     */
    public Map<String, List<String>> extractAllMetadata(ServiceDeclarationNode serviceNode,
                                                        ModelFromSourceContext context,
                                                        Optional<CustomExtractor> customExtractor) {
        Map<String, List<String>> allMetadata = new HashMap<>();

        // Get metadata definitions from database
        List<ReadOnlyMetaData> metadataList = getMetadataFromDatabase(context);

        // Extract values for each metadata item
        for (ReadOnlyMetaData metadataItem : metadataList) {
            Map<String, List<String>> extractedValues = extractForMetadataItem(metadataItem, serviceNode, context,
                    customExtractor);

            // Aggregate values by display name - this is where the magic happens!
            for (Map.Entry<String, List<String>> entry : extractedValues.entrySet()) {
                String displayName = entry.getKey();
                List<String> values = entry.getValue();

                // If display name already exists, add all values to existing list
                // This handles cases where arg1 and host both map to "Host" display name
                allMetadata.computeIfAbsent(displayName, k -> new ArrayList<>()).addAll(values);
            }
        }

        return allMetadata;
    }

    /**
     * Extracts values for a single metadata item using the appropriate extractor.
     *
     * @param metadataItem    The metadata item to extract values for
     * @param serviceNode     The service declaration node
     * @param context         The model context
     * @param customExtractor Optional custom extractor for CUSTOM kinds
     * @return Map of display names to list of extracted values
     */
    private Map<String, List<String>> extractForMetadataItem(ReadOnlyMetaData metadataItem,
                                                             ServiceDeclarationNode serviceNode,
                                                             ModelFromSourceContext context,
                                                             Optional<CustomExtractor> customExtractor) {
        String kind = metadataItem.kind();

        if ("CUSTOM".equals(kind) && customExtractor.isPresent()) {
            CustomExtractor extractor = customExtractor.get();
            if (extractor.canExtractCustom(metadataItem, context)) {
                // For CUSTOM extractors, directly return the extracted values
                return extractor.extractCustomValues(metadataItem, serviceNode, context);
            }
        } else if (extractors.containsKey(kind)) {
            ReadOnlyMetadataExtractor extractor = extractors.get(kind);
            return extractor.extractValues(metadataItem, serviceNode, context);
        }

        // If no extractor found, return empty map
        return new HashMap<>();
    }

    /**
     * Retrieves metadata definitions from the database.
     *
     * @param context The model context
     * @return List of metadata definitions
     */
    private List<ReadOnlyMetaData> getMetadataFromDatabase(ModelFromSourceContext context) {
        return ServiceDatabaseManager.getInstance()
                .getReadOnlyMetaData(context.orgName(), context.moduleName(), null);
    }
}
