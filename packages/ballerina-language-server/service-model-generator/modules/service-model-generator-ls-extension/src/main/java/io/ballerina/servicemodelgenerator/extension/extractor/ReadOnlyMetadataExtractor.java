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
 * Strategy interface for extracting readOnly metadata values from different sources.
 * Each extractor is responsible for extracting values for a specific kind of metadata.
 *
 * @since 1.3.0
 */
public interface ReadOnlyMetadataExtractor {

    /**
     * Extracts the actual runtime values for readOnly metadata items of a specific kind.
     *
     * @param metadataItem The metadata item containing key, displayName, and kind
     * @param serviceNode  The service declaration node
     * @param context      The model context containing additional information
     * @return A map of displayName to actual value, or empty map if extraction fails
     */
    Map<String, List<String>> extractValues(ReadOnlyMetaData metadataItem, ServiceDeclarationNode serviceNode,
                                            ModelFromSourceContext context);

    /**
     * Returns the kind of metadata this extractor handles.
     *
     * @return The kind string (e.g., "ANNOTATION", "LISTENER_PARAM", "SERVICE_DESCRIPTION")
     */
    String getSupportedKind();

    /**
     * Checks if this extractor can handle the given metadata kind.
     *
     * @param kind The metadata kind to check
     * @return true if this extractor supports the kind, false otherwise
     */
    default boolean supports(String kind) {
        return getSupportedKind().equals(kind);
    }
}
