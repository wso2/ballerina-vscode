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

package io.ballerina.flowmodelgenerator.core.copilot.model;

import com.google.gson.annotations.SerializedName;

import java.util.List;

/**
 * Represents a service definition.
 *
 * @since 1.7.0
 */
public class Service {
    private String type;
    @SerializedName("instructions")
    private String instructions;
    private Listener listener;
    @SerializedName("methods")
    private List<ServiceRemoteFunction> methods;
    private String testGenerationInstruction;

    public Service() {
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getInstructions() {
        return instructions;
    }

    public void setInstructions(String instructions) {
        this.instructions = instructions;
    }

    public Listener getListener() {
        return listener;
    }

    public void setListener(Listener listener) {
        this.listener = listener;
    }

    public List<ServiceRemoteFunction> getMethods() {
        return methods;
    }

    public void setMethods(List<ServiceRemoteFunction> methods) {
        this.methods = methods;
    }

    public String getTestGenerationInstruction() {
        return testGenerationInstruction;
    }

    public void setTestGenerationInstruction(String testGenerationInstruction) {
        this.testGenerationInstruction = testGenerationInstruction;
    }
}
