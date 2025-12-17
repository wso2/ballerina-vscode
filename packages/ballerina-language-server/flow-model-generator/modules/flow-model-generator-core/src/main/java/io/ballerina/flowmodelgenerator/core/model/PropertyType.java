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

package io.ballerina.flowmodelgenerator.core.model;

import java.util.List;

/**
 * Represents the type configuration of a property in the flow model.
 *
 * @since 1.5.0
 */
public class PropertyType {
    
    private final Property.ValueType fieldType;
    private final String ballerinaType;
    private final String scope;
    private final List<String> options;
    private final Property template;
    private final List<PropertyTypeMemberInfo> typeMembers;
    private boolean selected;

    public PropertyType(Property.ValueType fieldType, String ballerinaType, String scope, List<String> options,
                        Property template, List<PropertyTypeMemberInfo> typeMembers, boolean selected) {
        this.fieldType = fieldType;
        this.ballerinaType = ballerinaType;
        this.scope = scope;
        this.options = options;
        this.template = template;
        this.typeMembers = typeMembers;
        this.selected = selected;
    }

    public Property.ValueType fieldType() {
        return fieldType;
    }

    public String ballerinaType() {
        return ballerinaType;
    }

    public String scope() {
        return scope;
    }

    public List<String> options() {
        return options;
    }

    public Property template() {
        return template;
    }

    public List<PropertyTypeMemberInfo> typeMembers() {
        return typeMembers;
    }

    public boolean selected() {
        return selected;
    }

    public void selected(boolean selected) {
        this.selected = selected;
    }
}
