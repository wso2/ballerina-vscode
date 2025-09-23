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

package io.ballerina.openapi.extension;

import com.google.gson.JsonArray;

import java.util.Optional;

/**
 * The extended service for the OpenAPIConverter endpoint.
 *
 * @since 1.3.0
 */
public class OpenAPIConverterResponse {
    @Deprecated
    private String yamlContent;

    // Json Array of OASResults
    private JsonArray content;
    private String error;

    public OpenAPIConverterResponse() {
    }

    @Deprecated
    public String getYamlContent() {
        return yamlContent;
    }

    @Deprecated
    public void setYamlContent(String yamlContent) {
        this.yamlContent = yamlContent;
    }

    public JsonArray getContent() {
        return content;
    }

    public void setContent(JsonArray content) {
        this.content = content;
    }

    public Optional<String> getError() {
        return Optional.ofNullable(this.error);
    }

    public void setError(String error) {
        this.error = error;
    }
}
