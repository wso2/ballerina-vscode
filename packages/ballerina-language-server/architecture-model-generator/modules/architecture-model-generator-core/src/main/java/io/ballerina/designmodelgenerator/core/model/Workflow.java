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

package io.ballerina.designmodelgenerator.core.model;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

/**
 * Represents a workflow function (a function annotated with {@code @workflow:Workflow}) in the design model.
 *
 * @since 1.0.0
 */
public final class Workflow extends DesignGraphNode {

    private final String symbol;
    private final Location location;
    private final Set<String> attachedServices;
    private final Set<String> attachedFunctions;

    public Workflow(String symbol, String sortText, Location location) {
        super(true, sortText);
        this.symbol = symbol;
        this.location = location;
        this.attachedServices = new HashSet<>();
        this.attachedFunctions = new HashSet<>();
    }

    public String getSymbol() {
        return symbol;
    }

    public Location getLocation() {
        return location;
    }

    public Set<String> getAttachedServices() {
        return attachedServices;
    }

    public Set<String> getAttachedFunctions() {
        return attachedFunctions;
    }

    public void addAttachedService(String serviceUuid) {
        this.attachedServices.add(serviceUuid);
    }

    public void addAttachedFunction(String functionName) {
        this.attachedFunctions.add(functionName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(symbol, location, attachedServices.size(), attachedFunctions.size());
    }

    @Override
    public boolean equals(Object obj) {
        if (!(obj instanceof Workflow workflow)) {
            return false;
        }
        return Objects.equals(workflow.symbol, this.symbol)
                && Objects.equals(workflow.location, this.location)
                && workflow.attachedServices.size() == this.attachedServices.size()
                && workflow.attachedFunctions.size() == this.attachedFunctions.size();
    }
}
