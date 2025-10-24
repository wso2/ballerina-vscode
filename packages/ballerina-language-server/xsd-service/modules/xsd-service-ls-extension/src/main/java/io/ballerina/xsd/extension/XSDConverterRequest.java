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

package io.ballerina.xsd.extension;

/**
 * Represents a request to generate Ballerina types from an XSD schema.
 *
 * @since 1.0.0
 */
public class XSDConverterRequest {
    private String xsdContent;
    private String projectPath;
    private String targetFileName;

    public XSDConverterRequest() {
    }

    public XSDConverterRequest(String xsdContent, String projectPath, String targetFileName) {
        this.xsdContent = xsdContent;
        this.projectPath = projectPath;
        this.targetFileName = targetFileName;
    }

    public String getXsdContent() {
        return xsdContent;
    }

    public void setXsdContent(String xsdContent) {
        this.xsdContent = xsdContent;
    }

    public String getProjectPath() {
        return projectPath;
    }

    public void setProjectPath(String projectPath) {
        this.projectPath = projectPath;
    }

    public String getTargetFileName() {
        return targetFileName;
    }

    public void setTargetFileName(String targetFileName) {
        this.targetFileName = targetFileName;
    }
}
