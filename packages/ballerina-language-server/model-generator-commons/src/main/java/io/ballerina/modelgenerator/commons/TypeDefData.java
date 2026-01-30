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

import java.util.List;

/**
 * Represents typedef information (Record, Enum, Union, etc.).
 *
 * @since 1.0.0
 */
public class TypeDefData {

    private final String name;
    private final String description;
    private final TypeCategory type;
    private final List<FieldData> fields;
    private final String baseType;

    public TypeDefData(String name, String description, TypeCategory type, List<FieldData> fields, String baseType) {
        this.name = name;
        this.description = description;
        this.type = type;
        this.fields = fields;
        this.baseType = baseType;
    }

    // Getters
    public String name() {
        return name;
    }

    public String description() {
        return description;
    }

    public TypeCategory type() {
        return type;
    }

    public List<FieldData> fields() {
        return fields;
    }

    public String baseType() {
        return baseType;
    }

    public enum TypeCategory {
        RECORD("Record"),
        ENUM("Enum"),
        UNION("Union"),
        CLASS("Class"),
        ERROR("Error"),
        CONSTANT("Constant"),
        TYPEDESC("typedesc"),
        OTHER("Other");

        private final String value;

        TypeCategory(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        public static TypeCategory fromString(String value) {
            for (TypeCategory category : TypeCategory.values()) {
                if (category.value.equalsIgnoreCase(value)) {
                    return category;
                }
            }
            return OTHER;
        }
    }
}
