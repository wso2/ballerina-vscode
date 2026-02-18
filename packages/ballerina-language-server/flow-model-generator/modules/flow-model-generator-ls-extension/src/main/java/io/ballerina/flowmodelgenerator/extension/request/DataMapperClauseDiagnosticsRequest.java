/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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
 * Represents a request to get the diagnostics of clause in data mapper.
 *
 * @param filePath    File path of the source file
 * @param codedata    Position details of the node
 * @param index       Index of the clause in the query expression
 * @param clause      Clause representation
 * @param targetField The target field that needs to consider to get the type
 *
 * @since 2.0.0
 */
public record DataMapperClauseDiagnosticsRequest(String filePath, JsonElement codedata, int index, JsonElement clause,
                                                 String targetField) {
}
