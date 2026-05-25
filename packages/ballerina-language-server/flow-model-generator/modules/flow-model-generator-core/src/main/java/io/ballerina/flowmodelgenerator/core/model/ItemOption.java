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
 * Represents an item option for dropdown choice fields, matching the frontend OptionProps interface.
 *
 * @param id      the identifier of the option
 * @param content the display content of the option
 * @param value   the value of the option
 *
 * @since 1.8.0
 */
public record ItemOption(String id, String content, Object value) {

    /**
     * Creates a list of ItemOption from a list of Option objects.
     *
     * @param options the list of options
     * @return a list of ItemOption
     */
    public static List<ItemOption> from(List<Option> options) {
        if (options == null) {
            return List.of();
        }
        return options.stream()
                .map(o -> new ItemOption(o.value(), o.label(), o.value()))
                .toList();
    }
}
