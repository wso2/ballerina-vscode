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

package io.ballerina.wsdl.extension;

/**
 * Represents a request to generate Ballerina types and client from a WSDL file.
 *
 * @since 1.4.0
 */
public class WSDLConverterRequest {
    private String wsdlContent;
    private String projectPath;
    private String portName;
    private String module;
    private String[] operations;

    public WSDLConverterRequest() {
    }

    /**
     * Constructor for WSDLConverterRequest.
     *
     * @param wsdlContent  The WSDL file content
     * @param projectPath  The project path
     * @param portName     The port name to use (optional)
     * @param module       The target module name
     * @param operations   The operations to include (optional, null/empty = all operations)
     */
    public WSDLConverterRequest(String wsdlContent, String projectPath, String portName, String module,
                                String[] operations) {
        this.wsdlContent = wsdlContent;
        this.projectPath = projectPath;
        this.portName = portName;
        this.module = module;
        this.operations = operations;
    }

    public String getWsdlContent() {
        return wsdlContent;
    }

    public void setWsdlContent(String wsdlContent) {
        this.wsdlContent = wsdlContent;
    }

    public String getProjectPath() {
        return projectPath;
    }

    public void setProjectPath(String projectPath) {
        this.projectPath = projectPath;
    }

    public String getPortName() {
        return portName;
    }

    public void setPortName(String portName) {
        this.portName = portName;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }

    public String[] getOperations() {
        return operations;
    }

    public void setOperations(String[] operations) {
        this.operations = operations;
    }
}
