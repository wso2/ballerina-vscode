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

package io.ballerina.edi.extension;

/**
 * Represents a request to generate Ballerina types from an EDI schema (X12 XSD).
 *
 * @since 1.4.0
 */
public class EDIConverterRequest {
    private String schemaContent;
    private String projectPath;

    public EDIConverterRequest() {
    }

    public EDIConverterRequest(String schemaContent, String projectPath) {
        this.schemaContent = schemaContent;
        this.projectPath = projectPath;
    }

    public String getSchemaContent() {
        return schemaContent;
    }

    public void setSchemaContent(String schemaContent) {
        this.schemaContent = schemaContent;
    }

    public String getProjectPath() {
        return projectPath;
    }

    public void setProjectPath(String projectPath) {
        this.projectPath = projectPath;
    }
}
