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
package io.ballerina.flowmodelgenerator.core.model;

import java.util.List;

/**
 * Represents the type model used to drive the record field selector UI for a {@code PARAM_FOR_TYPE_INFER}
 * parameter whose type is a Ballerina record.
 *
 * <p>The {@code rootType} is the anonymous (unnamed) top-level record type that the parameter expects.
 * {@code referencedTypes} holds any additional record types that are referenced transitively from the root
 * (e.g. nested record fields), so the UI can render them in full.
 *
 * @param rootType        the root record type model (name is stripped to {@code null})
 * @param referencedTypes additional record types referenced by the root, may be empty
 * @since 1.7.0
 */
public record RecordSelectorType(TypeData rootType, List<TypeData> referencedTypes) {
}
