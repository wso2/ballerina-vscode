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
 * Represents a request to convert an expression from one type to another for incompatible types.
 *
 * @param output         The target field path (e.g., "student.credentials.username")
 * @param outputType     The target type as a string (e.g., "string")
 * @param expression     The source expression (e.g., "userInfo.username")
 * @param expressionType The source type as a string (e.g., "string")
 * @since 1.6.0
 */
public record DataMapperConvertRequest(String output, String outputType, String expression, String expressionType) {
}
