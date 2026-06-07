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

package io.ballerina.persist.extension;

import com.google.gson.JsonElement;

import java.util.Arrays;

/**
 * Represents the response for persist client generation with text edits.
 *
 * @since 1.5.0
 */
public class PersistClientGeneratorResponse {
    private JsonElement source;
    private String errorMsg;
    private String stacktrace;

    public PersistClientGeneratorResponse() {
    }

    public JsonElement getSource() {
        return source;
    }

    public void setSource(JsonElement source) {
        this.source = source;
    }

    public String getErrorMsg() {
        return errorMsg;
    }

    public String getStacktrace() {
        return stacktrace;
    }

    public void setError(Throwable e) {
        this.errorMsg = e.getLocalizedMessage();
        this.stacktrace = Arrays.toString(e.getStackTrace());
    }
}

