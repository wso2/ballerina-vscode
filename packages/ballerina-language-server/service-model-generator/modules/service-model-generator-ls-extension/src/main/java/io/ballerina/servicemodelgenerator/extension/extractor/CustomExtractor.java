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

import java.util.List;
import java.util.Map;

/**
 * Interface for concrete service builders to implement custom readOnly metadata extraction.
 * This allows each service builder to define its own extraction logic for CUSTOM kind metadata.
 *
 * @since 1.3.0
 */
public interface CustomExtractor {

    /**
     * Extracts custom readOnly metadata values specific to the service type.
     * This method is called for metadata items with kind "CUSTOM".
     *
     * @param metadataItem The metadata item containing key, displayName, and kind
     * @param serviceNode  The service declaration node
     * @param context      The model context containing additional information
     * @return A map of displayName to actual value, or empty map if extraction fails
     */
    Map<String, List<String>> extractCustomValues(ReadOnlyMetaData metadataItem, ServiceDeclarationNode serviceNode,
                                                  ModelFromSourceContext context);

    /**
     * Checks if this custom extractor can handle the given metadata item.
     * This allows builders to be selective about which CUSTOM metadata they handle.
     *
     * @param metadataItem The metadata item to check
     * @param context      The model context
     * @return true if this extractor can handle the metadata item, false otherwise
     */
    default boolean canExtractCustom(ReadOnlyMetaData metadataItem, ModelFromSourceContext context) {
        return "CUSTOM".equals(metadataItem.kind());
    }
}
