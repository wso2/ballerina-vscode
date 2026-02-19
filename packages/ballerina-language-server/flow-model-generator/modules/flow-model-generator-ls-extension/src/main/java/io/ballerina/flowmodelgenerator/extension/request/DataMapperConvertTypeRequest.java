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

import java.util.Map;

/**
 * Represents a request to convert an expression from one type to another for incompatible types.
 *
 * @param filePath     The file path of the source file
 * @param codedata     The details of the node
 * @param typeName     The converted type name
 * @param parentTypeName The parent type name of the converted type
 * @param variableName The converted variable name
 * @param isInput      The converted variable is input or output
 * @param imports      The imports to be added for the conversion
 *
 * @since 2.0.0
 */
public record DataMapperConvertTypeRequest(String filePath, JsonElement codedata, String typeName,
                                           String parentTypeName, String variableName, boolean isInput,
                                           Map<String, String> imports) {
}
