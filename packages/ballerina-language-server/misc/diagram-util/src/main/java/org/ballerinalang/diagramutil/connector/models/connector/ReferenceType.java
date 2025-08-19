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

import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.EnumSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.SingletonTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefEnumType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefRecordType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefUnionType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

public class ReferenceType {
    private static final Map<String, RefType> visitedTypeMap = new HashMap<>();

    public record Field(String fieldName, RefType type, boolean optional, String defaultValue) {
    }

    public static RefType fromSemanticSymbol(Symbol symbol) {
        SymbolKind kind = symbol.kind();
        TypeSymbol typeSymbol = null;
        String name = "";
        if (kind == SymbolKind.TYPE_DEFINITION) {
            typeSymbol = ((TypeDefinitionSymbol) symbol).typeDescriptor();
            name = symbol.getName().orElse("");
        } else if (kind == SymbolKind.PARAMETER) {
            typeSymbol = ((ParameterSymbol) symbol).typeDescriptor();
            name = typeSymbol.getName().orElse("");
        } else if (kind == SymbolKind.RECORD_FIELD) {
            typeSymbol = ((RecordFieldSymbol) symbol).typeDescriptor();
            name = typeSymbol.getName().orElse("");
        } else if (kind == SymbolKind.VARIABLE) {
            typeSymbol = ((VariableSymbol) symbol).typeDescriptor();
            Optional<String> nameOpt = typeSymbol.getName();
            name = nameOpt.orElseGet(() -> symbol.getName().orElse(""));
        } else if (kind == SymbolKind.TYPE) {
            typeSymbol = (TypeSymbol) symbol;
            Optional<String> optName = typeSymbol.getName();
            name = optName.orElseGet(typeSymbol::signature);
        } else if (kind == SymbolKind.CONSTANT) {
            typeSymbol = ((VariableSymbol) symbol).typeDescriptor();
            Optional<String> optName = typeSymbol.getName();
            name = optName.orElseGet(() -> symbol.getName().orElseThrow(
                    () -> new IllegalStateException(
                            "Symbol name is missing for symbol. Kind: " + symbol.kind() +
                                    ", Module: " + (symbol.getModule().isPresent() ?
                                    symbol.getModule().get().id() : "N/A") +
                                    ", Symbol: " + symbol)
            ));
        } else if (kind == SymbolKind.ENUM) {
            return getEnumType((EnumSymbol) symbol);
        }

        if (typeSymbol == null) {
            return null;
        }

        String moduleId = symbol.getModule().isPresent()
                ? symbol.getModule().get().id().toString()
                : null;
        RefType type = fromSemanticSymbol(typeSymbol, name, moduleId);

        for (String dependentTypeHash : type.dependentTypeHashes) {
            RefType dependentType = visitedTypeMap.get(dependentTypeHash);
            if (dependentType != null) {
                RefType clonedDependentType = dependentType.clone();
                if (type.dependentTypes == null) {
                    type.dependentTypes = new HashMap<>();
                }
                clonedDependentType.dependentTypes = null;
                if (type.dependentTypes != null) {
                    type.dependentTypes.put(dependentTypeHash, clonedDependentType);
                }
            }
        }

        return type;
    }

    public static RefType fromSemanticSymbol(TypeSymbol symbol, String name, String moduleID) {
        String hashCode = String.valueOf(Objects.hash(moduleID, name, symbol.signature()));
        RefType type = visitedTypeMap.get(hashCode);
        if (type != null) {
            return type;
        }

        TypeDescKind kind = symbol.typeKind();
        if (kind == TypeDescKind.RECORD) {
            RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) symbol;
            RefRecordType recordType = new RefRecordType(name);
            recordType.hashCode = hashCode;
            visitedTypeMap.put(hashCode, recordType);

            Map<String, RecordFieldSymbol> fieldDescriptors = recordTypeSymbol.fieldDescriptors();
            fieldDescriptors.forEach((fieldName, fieldSymbol) -> {
                TypeSymbol fieldTypeSymbol = fieldSymbol.typeDescriptor();
                String fieldTypeName = fieldTypeSymbol.getName().orElse("");
                String fieldModuleId = fieldSymbol.getModule().isPresent()
                        ? fieldSymbol.getModule().get().id().toString()
                        : null;
                RefType fieldType = fromSemanticSymbol(fieldTypeSymbol, fieldTypeName, fieldModuleId);
                if (fieldType.dependentTypeHashes == null || fieldType.dependentTypeHashes.isEmpty()) {
                    if (fieldType.hashCode != null && fieldType.typeName.equals("record")) {
                        RefType t = new RefType(fieldType.name);
                        t.hashCode = fieldType.hashCode;
                        t.typeName = fieldType.typeName;
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    } else {
                        recordType.fields.add(new Field(fieldName, fieldType, fieldSymbol.isOptional(), ""));
                    }
                } else {
                    if (fieldType instanceof RefRecordType) {
                        RefType t = new RefType(fieldType.name);
                        t.hashCode = fieldType.hashCode;
                        t.typeName = fieldType.typeName;
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    } else {
                        recordType.fields.add(new Field(fieldName, fieldType, fieldSymbol.isOptional(), ""));
                    }
                    recordType.dependentTypeHashes.addAll(fieldType.dependentTypeHashes);
                }
                if (fieldType.hashCode != null) {
                    recordType.dependentTypeHashes.add(fieldType.hashCode);
                }
            });

            return recordType;
        } else if (kind == TypeDescKind.ARRAY) {
            ArrayTypeSymbol arrayTypeSymbol = (ArrayTypeSymbol) symbol;
            RefArrayType arrayType = new RefArrayType(name);
            arrayType.hashCode = hashCode;
            TypeSymbol elementTypeSymbol = arrayTypeSymbol.memberTypeDescriptor();
            String elementTypeName = elementTypeSymbol.getName().orElse("");
            String moduleId = elementTypeSymbol.getModule().isPresent()
                    ? elementTypeSymbol.getModule().get().id().toString()
                    : null;
            RefType elementType = fromSemanticSymbol(elementTypeSymbol, elementTypeName, moduleId);
            if (elementType.dependentTypeHashes == null || elementType.dependentTypeHashes.isEmpty()) {
                if (elementType.hashCode != null && elementType.typeName.equals("record")) {
                    RefType t = new RefType(elementType.name);
                    t.hashCode = elementType.hashCode;
                    t.typeName = elementType.typeName;
                    arrayType.elementType = t;
                } else {
                    arrayType.elementType = elementType;
                }
            } else {
                if (elementType instanceof RefRecordType) {
                    RefType t = new RefType(elementType.name);
                    t.hashCode = elementType.hashCode;
                    t.typeName = elementType.typeName;
                    arrayType.elementType = t;
                } else {
                    arrayType.elementType = elementType;
                }
                arrayType.dependentTypeHashes.addAll(elementType.dependentTypeHashes);
            }
            if (elementType.hashCode != null) {
                arrayType.dependentTypeHashes.add(elementType.hashCode);
            }
            arrayType.hashCode = arrayType.elementType.hashCode;
            return arrayType;
        } else if (kind == TypeDescKind.UNION) {
            UnionTypeSymbol unionTypeSymbol = (UnionTypeSymbol) symbol;
            RefUnionType unionType = new RefUnionType(name);
            unionType.hashCode = hashCode;
            visitedTypeMap.put(hashCode, unionType);

            for (TypeSymbol memberTypeSymbol : unionTypeSymbol.memberTypeDescriptors()) {
                String memberTypeName = memberTypeSymbol.getName().orElse("");
                String moduleId = memberTypeSymbol.getModule().isPresent()
                        ? memberTypeSymbol.getModule().get().id().toString()
                        : null;
                RefType memberType = fromSemanticSymbol(memberTypeSymbol, memberTypeName, moduleId);
                if (memberType.dependentTypeHashes == null || memberType.dependentTypeHashes.isEmpty()) {
                    if (memberType.hashCode != null && memberType.typeName.equals("record")) {
                        RefType t = new RefType(memberType.name);
                        t.hashCode = memberType.hashCode;
                        t.typeName = memberType.typeName;
                        unionType.memberTypes.add(t);
                    } else {
                        unionType.memberTypes.add(memberType);
                    }
                } else {
                    if (memberType instanceof RefRecordType) {
                        RefType t = new RefType(memberType.name);
                        t.hashCode = memberType.hashCode;
                        t.typeName = memberType.typeName;
                        unionType.memberTypes.add(t);
                    } else {
                        unionType.memberTypes.add(memberType);
                    }
                    unionType.dependentTypeHashes.addAll(memberType.dependentTypeHashes);

                }
                if (memberType.hashCode != null) {
                    unionType.dependentTypeHashes.add(memberType.hashCode);
                }
            }
            return unionType;
        } else if (kind == TypeDescKind.TYPE_REFERENCE) {
            TypeReferenceTypeSymbol typeRefSymbol = (TypeReferenceTypeSymbol) symbol;
            TypeSymbol typeSymbol = typeRefSymbol.typeDescriptor();
            String moduleId = typeRefSymbol.getModule().isPresent()
                    ? typeRefSymbol.getModule().get().id().toString()
                    : null;
            return fromSemanticSymbol(typeSymbol, name, moduleId);
        } else if (kind == TypeDescKind.INT) {
            RefType refType = new RefType("int");
            refType.typeName = "int";
            return refType;
        } else if (kind == TypeDescKind.STRING) {
            RefType refType = new RefType("string");
            refType.typeName = "string";
            return refType;
        } else if (kind == TypeDescKind.FLOAT) {
            RefType refType = new RefType("float");
            refType.typeName = "float";
            return refType;
        } else if (kind == TypeDescKind.BOOLEAN) {
            RefType refType = new RefType("boolean");
            refType.typeName = "boolean";
            return refType;
        } else if (kind == TypeDescKind.NIL) {
            RefType refType = new RefType("nil");
            refType.typeName = "nil";
            return refType;
        } else if (kind == TypeDescKind.DECIMAL) {
            RefType refType = new RefType("decimal");
            refType.typeName = "decimal";
            return refType;
        } else if (kind == TypeDescKind.NEVER) {
            RefType refType = new RefType("never");
            refType.typeName = "never";
            return refType;
        } else if (kind == TypeDescKind.SINGLETON) {
            String typeName = symbol.signature();
            if (typeName.startsWith("\"") && typeName.endsWith("\"")) {
                typeName = typeName.substring(1, typeName.length() - 1);
            }
            return new RefType(typeName);
        }
        throw new UnsupportedOperationException(
                "Unsupported type kind: " + kind + " for symbol: " + symbol.getName().orElse("unknown"));
    }


    private static RefType getEnumType(EnumSymbol enumSymbol) {
        RefType type;
        List<RefType> fields = new ArrayList<>();
        enumSymbol.members().forEach(member -> {
            String name = member.getName().orElse("");
            String moduleId = member.getModule().isPresent()
                    ? member.getModule().get().id().toString()
                    : null;
            RefType semanticSymbol = fromSemanticSymbol(member.typeDescriptor(), name, moduleId);
            fields.add(semanticSymbol);

        });
        type = new RefEnumType(enumSymbol.getName().orElse(""), fields);
        return type;
    }
}
