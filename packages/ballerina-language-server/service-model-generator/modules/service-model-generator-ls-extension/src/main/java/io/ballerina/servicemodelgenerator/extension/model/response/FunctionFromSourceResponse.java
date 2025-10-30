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

package io.ballerina.servicemodelgenerator.extension.model.response;

import io.ballerina.servicemodelgenerator.extension.model.Function;

import java.util.Arrays;

/**
 * Represents the response containing a function generated from source code.
 *
 * @param function   The function model generated from the source code.
 * @param errorMsg   The error message if the function details could not be retrieved.
 * @param stacktrace The stack trace of the error if applicable.
 * @since 1.0.1
 */
public record FunctionFromSourceResponse(Function function, String errorMsg, String stacktrace) {

    public FunctionFromSourceResponse() {
        this(null, null, null);
    }

    public FunctionFromSourceResponse(Function function) {
        this(function, null, null);
    }

    public FunctionFromSourceResponse(Throwable e) {
        this(null, e.toString(), Arrays.toString(e.getStackTrace()));
    }
}
