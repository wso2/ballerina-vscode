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
 * @param fieldType     the field type
 * @param ballerinaType the associated Ballerina type (optional)
 * @param scope         the scope for identifier types (optional)
 * @param options       the available options for selection types (optional)
 * @param template      the template property for complex types (optional)
 * @param typeMembers   the list of type member information for record types (optional)
 * @since 1.5.0
 */
public record PropertyType(Property.ValueType fieldType, String ballerinaType, String scope,
                           List<String> options, Property template, List<PropertyTypeMemberInfo> typeMembers) {

}
