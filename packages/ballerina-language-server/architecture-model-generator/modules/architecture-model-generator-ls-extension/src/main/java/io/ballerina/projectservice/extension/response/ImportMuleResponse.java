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

package io.ballerina.projectservice.extension.response;

import io.ballerina.projectservice.core.ToolExecutionResult;

import java.util.Map;

/**
 * Response for the Mule import operation.
 *
 * @param error      error message if the operation failed, else null
 * @param textEdits  text edits to be applied to the Ballerina files
 * @param report     HTML report of the import operation
 * @param jsonReport JSON report of the import operation
 * @since 1.2.0
 */
public record ImportMuleResponse(String error, Map<String, String> textEdits, String report, Object jsonReport) {

    /**
     * Creates an ImportMuleResponse from a ToolExecutionResult.
     *
     * @param result the tool execution result to convert
     * @return new ImportMuleResponse instance
     */
    public static ImportMuleResponse from(ToolExecutionResult result) {
        return new ImportMuleResponse(result.error(), result.textEdits(), result.report(), result.jsonReport());
    }
}
