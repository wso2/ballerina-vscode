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

package io.ballerina.flowmodelgenerator.extension.request;

import com.google.gson.JsonElement;

/**
 * Represents a request to get the given clause.
 *
 * @param filePath    file path of the source file
 * @param codedata    Details of the node
 * @param targetField The target field that needs to consider to get the type
 * @param index       The clause index to identify the specific clause to get the position
 * @since 2.0.0
 */
public record DataMapperClausePositionRequest(String filePath, JsonElement codedata, String targetField, int index) {
}
