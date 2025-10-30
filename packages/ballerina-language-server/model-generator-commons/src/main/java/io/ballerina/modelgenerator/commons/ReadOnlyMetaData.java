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

package io.ballerina.modelgenerator.commons;

/**
 * Represents read-only metadata for a service.
 *
 * @param metadataKey The key/name of the metadata field
 * @param displayName The display name for the metadata field
 * @param kind The kind/category of the metadata field (e.g., ANNOTATION, SERVICE_DESCRIPTION, LISTENER_PARAM)
 *
 * @since 1.3.0
 */
public record ReadOnlyMetaData(
        String metadataKey,
        String displayName,
        String kind
) {
}
