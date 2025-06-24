/*
 *  Copyright (c) 2025, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 *  WSO2 Inc. licenses this file to you under the Apache License,
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
package org.ballerinalang.diagramutil.connector.models.connector;

import com.google.gson.annotations.Expose;
import io.ballerina.compiler.api.symbols.*;

import java.util.*;

/**
 * Reference-based type model.
 *
 * @since language-server 1.0.0
 */
public class ReferenceType {
    private static final Map<String, Type> visitedTypeMap = new HashMap<>();

    public static class Type {
        Set<String> dependentTypeHashes = new HashSet<>();
        @Expose
        public String hashCode;
        @Expose
        public String name;
        @Expose
        public String typeName;
        @Expose
        public Map<String, Type> dependentTypes;

        public Type(String name) {
            this.name = name;
        }
    }

    public static class RecordType extends Type {
        @Expose
        List<Field> fields = new ArrayList<>();

        public RecordType(String name) {
            super(name);
            this.typeName = "record";
        }
    }

    public static class ArrayType extends Type {
        @Expose
        Type elementType;

        public ArrayType(String name) {
            super(name);
            this.typeName = "array";
        }
    }

    public record Field(String fieldName, Type type, boolean optional, String defaultValue) {
    }

    public static Type fromSemanticSymbol(Symbol symbol) {
        SymbolKind kind = symbol.kind();
        TypeSymbol typeSymbol = null;
        if (kind == SymbolKind.TYPE_DEFINITION) {
            typeSymbol = ((TypeDefinitionSymbol) symbol).typeDescriptor();
        } else if (kind == SymbolKind.PARAMETER) {
            typeSymbol = ((ParameterSymbol) symbol).typeDescriptor();
        } else if (kind == SymbolKind.RECORD_FIELD) {
            typeSymbol = ((RecordFieldSymbol) symbol).typeDescriptor();
        } else if (kind == SymbolKind.VARIABLE) {
            typeSymbol = ((VariableSymbol) symbol).typeDescriptor();
        } else if (kind == SymbolKind.TYPE) {
            typeSymbol = (TypeSymbol) symbol;
        }

        if (typeSymbol == null) {
            return null;
        }

        String moduleId = symbol.getModule().isPresent()
                ? symbol.getModule().get().id().toString()
                : null;
        Type type = fromSemanticSymbol(typeSymbol, symbol.getName().orElseThrow(), moduleId);

        for (String dependentTypeHash : type.dependentTypeHashes) {
            Type dependentType = visitedTypeMap.get(dependentTypeHash);
            if (dependentType != null) {
                if (type.dependentTypes == null) {
                    type.dependentTypes = new HashMap<>();
                }
                type.dependentTypes.put(dependentTypeHash, dependentType);
            }
        }
        return type;
    }

    public static Type fromSemanticSymbol(TypeSymbol symbol, String name, String ModuleID) {
        String hashCode = String.valueOf((ModuleID + name).hashCode());
        Type type = visitedTypeMap.get(hashCode);
        if (type != null) {
            return type;
        }

        TypeDescKind kind = symbol.typeKind();
        if (kind == TypeDescKind.RECORD) {
            RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) symbol;
            RecordType recordType = new RecordType(name);
            recordType.hashCode = hashCode;
            visitedTypeMap.put(hashCode, recordType);

            Map<String, RecordFieldSymbol> fieldDescriptors = recordTypeSymbol.fieldDescriptors();
            fieldDescriptors.forEach((fieldName, fieldSymbol) -> {
                TypeSymbol fieldTypeSymbol = fieldSymbol.typeDescriptor();
                String fieldTypeName = fieldTypeSymbol.getName().orElse("");
                String fieldModuleId = fieldTypeSymbol.getModule().isPresent()
                        ? fieldTypeSymbol.getModule().get().id().toString()
                        : null;
                Type fieldType = fromSemanticSymbol(fieldTypeSymbol, fieldTypeName, fieldModuleId);
                if (fieldType.dependentTypeHashes == null || fieldType.dependentTypeHashes.isEmpty()) {
                    if (fieldType.hashCode != null) {
                        Type t = new Type(fieldType.name);
                        t.hashCode = fieldType.hashCode;
                        t.typeName = fieldType.typeName;
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    } else {
                        recordType.fields.add(new Field(fieldName, fieldType, fieldSymbol.isOptional(), ""));
                    }
                } else {
                    Type t = new Type(fieldType.name);
                    t.hashCode = fieldType.hashCode;
                    t.typeName = fieldType.typeName;
                    recordType.dependentTypeHashes.addAll(fieldType.dependentTypeHashes);
                    if (fieldType.typeName.equals("array")) {
                        t.typeName = fieldType.typeName;
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    } else {
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    }
                }
                if (fieldType.hashCode != null) {
                    recordType.dependentTypeHashes.add(fieldType.hashCode);
                }
            });

            return recordType;
        } else if (kind == TypeDescKind.ARRAY) {
            ArrayTypeSymbol arrayTypeSymbol = (ArrayTypeSymbol) symbol;
            ArrayType arrayType = new ArrayType(name);
            arrayType.hashCode = hashCode;
            TypeSymbol elementTypeSymbol = arrayTypeSymbol.memberTypeDescriptor();
            String elementTypeName = elementTypeSymbol.getName().orElse("");
            String moduleId = elementTypeSymbol.getModule().isPresent()
                    ? elementTypeSymbol.getModule().get().id().toString()
                    : null;
            Type elementType = fromSemanticSymbol(elementTypeSymbol, elementTypeName, moduleId);
            if (elementType.dependentTypeHashes == null || elementType.dependentTypeHashes.isEmpty()) {
                if (elementType.hashCode != null) {
                    Type t = new Type(elementType.name);
                    t.hashCode = elementType.hashCode;
                    t.typeName = elementType.typeName;
                    arrayType.elementType = t;
                } else {
                    arrayType.elementType = elementType;
                }
            } else {
                Type t = new Type(elementType.name);
                t.hashCode = elementType.hashCode;
                t.typeName = elementType.typeName;
                arrayType.dependentTypeHashes.addAll(elementType.dependentTypeHashes);
                arrayType.elementType = t;
            }
            if (elementType.hashCode != null) {
                arrayType.dependentTypeHashes.add(elementType.hashCode);
            }
            arrayType.hashCode = arrayType.elementType.hashCode;
            return arrayType;
        } else if (kind == TypeDescKind.TYPE_REFERENCE) {
            TypeReferenceTypeSymbol typeRefSymbol = (TypeReferenceTypeSymbol) symbol;
            TypeSymbol typeSymbol = typeRefSymbol.typeDescriptor();
            String moduleId = typeSymbol.getModule().isPresent()
                    ? typeSymbol.getModule().get().id().toString()
                    : null;
            return fromSemanticSymbol(typeSymbol, name, moduleId);
        } else if (kind == TypeDescKind.INT) {
            return new Type("int");
        } else if (kind == TypeDescKind.STRING) {
            return new Type("string");
        } else if (kind == TypeDescKind.FLOAT) {
            return new Type("float");
        } else if (kind == TypeDescKind.BOOLEAN) {
            return new Type("boolean");
        } else if (kind == TypeDescKind.NIL) {
            return new Type("nil");
        } else if (kind == TypeDescKind.DECIMAL) {
            return new Type("decimal");
        } else if (kind == TypeDescKind.NEVER) {
            return new Type("never");
        }
        throw new UnsupportedOperationException(
                "Unsupported type kind: " + kind + " for symbol: " + symbol.getName().orElse("unknown"));
    }
}