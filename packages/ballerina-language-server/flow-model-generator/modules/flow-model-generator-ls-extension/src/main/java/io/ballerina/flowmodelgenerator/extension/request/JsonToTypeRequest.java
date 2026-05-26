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

/**
 * Request to generate a type from a sample JSON.
 *
 * @param jsonString JSON string to convert to a type
 * @param typeName Name of the type to be generated
 * @param prefix Prefix to be added to the generated type name
 * @param allowAdditionalFields Whether to allow additional fields in the generated type
 * @param asInline Whether to generate the type as an inline type
 * @param nullAsOptional Whether to treat null values as optional in the generated type
 * @param filePath File path where the type should be generated
 *
 * @since 1.0.0
 */
public record JsonToTypeRequest(String jsonString,
                                String typeName,
                                String prefix,
                                boolean allowAdditionalFields,
                                boolean asInline,
                                boolean nullAsOptional,
                                String filePath) {
}
