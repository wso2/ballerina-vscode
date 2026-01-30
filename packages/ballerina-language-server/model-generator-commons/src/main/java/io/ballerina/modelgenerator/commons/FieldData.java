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

package io.ballerina.modelgenerator.commons;

import io.ballerina.compiler.api.symbols.TypeSymbol;

/**
 * Represents a field in a record type definition.
 *
 * @since 1.0.0
 */
public class FieldData {

    private final String name;
    private final String description;
    private final FieldType type;
    private final boolean optional;

    public FieldData(String name, String description, FieldType type, boolean optional) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.optional = optional;
    }

    // Getters
    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public FieldType type() {
        return type;
    }

    public boolean optional() {
        return optional;
    }

    /**
     * Represents the type of a field.
     */
    public static class FieldType {
        private final String name;
        private final TypeSymbol typeSymbol;

        public FieldType(String name) {
            this.name = name;
            this.typeSymbol = null;
        }

        public FieldType(String name, TypeSymbol typeSymbol) {
            this.name = name;
            this.typeSymbol = typeSymbol;
        }

        public String name() {
            return name;
        }

        public TypeSymbol typeSymbol() {
            return typeSymbol;
        }
    }
}
