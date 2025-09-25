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
import io.ballerina.compiler.api.symbols.ConstantSymbol;
import io.ballerina.compiler.api.symbols.EnumSymbol;
import io.ballerina.compiler.api.symbols.IntersectionTypeSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefConstType;
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

    public static RefType fromSemanticSymbol(Symbol symbol, List<Symbol> typeDefSymbols) {
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
            return new RefConstType(symbol.getName().orElse(""),
                    ((ConstantSymbol) symbol).broaderTypeDescriptor().signature());
        } else if (kind == SymbolKind.ENUM) {
            return getEnumType((EnumSymbol) symbol, typeDefSymbols);
        }

        if (typeSymbol == null) {
            return null;
        }

        String moduleId = symbol.getModule().isPresent()
                ? symbol.getModule().get().id().toString()
                : null;
        RefType type = fromSemanticSymbol(typeSymbol, name, moduleId, typeDefSymbols);

        if (type.dependentTypes == null) {
            type.dependentTypes = new HashMap<>();
            for (String dependentTypeKey : type.dependentTypeKeys) {
                RefType dependentType = visitedTypeMap.get(dependentTypeKey);
                if (dependentType != null) {
                    RefType clonedDependentType = dependentType.clone();
                    clonedDependentType.dependentTypes = null;
                    type.dependentTypes.put(dependentTypeKey, clonedDependentType);
                }
            }
        }

        return type;
    }

    public static RefType fromSemanticSymbol(TypeSymbol symbol, String name, String moduleID,
                                             List<Symbol> typeDefSymbols) {
        String typeHash = String.valueOf(Objects.hash(moduleID, name, symbol.signature()));
        String typeKey = String.valueOf((moduleID + ":" + name).hashCode());

        RefType type = visitedTypeMap.get(typeKey);
        if (type != null && !(symbol.typeKind().equals(TypeDescKind.TYPE_REFERENCE))) {
            if (type.hashCode != null && !type.hashCode.equals(typeHash)) {
                visitedTypeMap.remove(typeKey);
            } else if (type.dependentTypes != null) {
                validateDependentTypes(type, typeDefSymbols);
                return type;
            } else {
                return type;
            }
        }

        TypeDescKind kind = symbol.typeKind();
        if (kind == TypeDescKind.RECORD) {
            RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) symbol;
            RefRecordType recordType = new RefRecordType(name);
            recordType.hashCode = typeHash;
            recordType.key = typeKey;
            if (name.isEmpty()) {
                typeKey = typeHash;
                recordType.key = typeKey;
            }
            visitedTypeMap.put(typeKey, recordType);

            Map<String, RecordFieldSymbol> fieldDescriptors = recordTypeSymbol.fieldDescriptors();
            fieldDescriptors.forEach((fieldName, fieldSymbol) -> {
                TypeSymbol fieldTypeSymbol = fieldSymbol.typeDescriptor();
                String fieldTypeName = fieldTypeSymbol.getName().orElse("");
                String fieldModuleId = fieldSymbol.getModule().isPresent()
                        ? fieldSymbol.getModule().get().id().toString()
                        : null;
                RefType fieldType = fromSemanticSymbol(fieldTypeSymbol, fieldTypeName, fieldModuleId, typeDefSymbols);
                if (fieldType.dependentTypeKeys == null || fieldType.dependentTypeKeys.isEmpty()) {
                    if (fieldType.hashCode != null && fieldType.typeName.equals("record")) {
                        RefType t = new RefType(fieldType.name);
                        t.hashCode = fieldType.hashCode;
                        t.key = fieldType.key;
                        t.typeName = fieldType.typeName;
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    } else {
                        recordType.fields.add(new Field(fieldName, fieldType, fieldSymbol.isOptional(), ""));
                    }
                } else {
                    if (fieldType instanceof RefRecordType) {
                        RefType t = new RefType(fieldType.name);
                        t.hashCode = fieldType.hashCode;
                        t.key = fieldType.key;
                        t.typeName = fieldType.typeName;
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    } else {
                        recordType.fields.add(new Field(fieldName, fieldType, fieldSymbol.isOptional(), ""));
                    }
                    recordType.dependentTypeKeys.addAll(fieldType.dependentTypeKeys);
                }
                if (fieldType.hashCode != null) {
                    if (fieldType.name.isEmpty()) {
                        recordType.dependentTypeKeys.add(fieldType.hashCode);
                    } else {
                        recordType.dependentTypeKeys.add(
                                String.valueOf((fieldModuleId + ":" + fieldTypeName).hashCode()));
                    }
                }
            });

            return recordType;
        } else if (kind == TypeDescKind.ARRAY) {
            ArrayTypeSymbol arrayTypeSymbol = (ArrayTypeSymbol) symbol;
            RefArrayType arrayType = new RefArrayType(name);
            arrayType.hashCode = typeHash;
            arrayType.key = typeKey;
            TypeSymbol elementTypeSymbol = arrayTypeSymbol.memberTypeDescriptor();
            String elementTypeName = elementTypeSymbol.getName().orElse("");
            String elementModuleId = elementTypeSymbol.getModule().isPresent()
                    ? elementTypeSymbol.getModule().get().id().toString()
                    : null;
            RefType elementType = fromSemanticSymbol(elementTypeSymbol, elementTypeName,
                    elementModuleId, typeDefSymbols);
            if (elementType.dependentTypeKeys == null || elementType.dependentTypeKeys.isEmpty()) {
                if (elementType.hashCode != null && elementType.typeName.equals("record")) {
                    RefType t = new RefType(elementType.name);
                    t.hashCode = elementType.hashCode;
                    t.key = elementType.key;
                    t.typeName = elementType.typeName;
                    arrayType.elementType = t;
                } else {
                    arrayType.elementType = elementType;
                }
            } else {
                if (elementType instanceof RefRecordType) {
                    RefType t = new RefType(elementType.name);
                    t.hashCode = elementType.hashCode;
                    t.key = elementType.key;
                    t.typeName = elementType.typeName;
                    arrayType.elementType = t;
                } else {
                    arrayType.elementType = elementType;
                }
                arrayType.dependentTypeKeys.addAll(elementType.dependentTypeKeys);
            }
            if (elementType.hashCode != null) {
                if (elementType.name.isEmpty()) {
                    arrayType.dependentTypeKeys.add(elementType.hashCode);
                } else {
                    arrayType.dependentTypeKeys.add(
                            String.valueOf((elementModuleId + ":" + elementTypeName).hashCode()));
                }
            }
            arrayType.hashCode = arrayType.elementType.hashCode;
            arrayType.key = arrayType.elementType.key;
            return arrayType;
        } else if (kind == TypeDescKind.UNION) {
            UnionTypeSymbol unionTypeSymbol = (UnionTypeSymbol) symbol;
            RefUnionType unionType = new RefUnionType(name);
            unionType.hashCode = typeHash;
            unionType.key = typeKey;
            visitedTypeMap.put(typeKey, unionType);

            for (TypeSymbol memberTypeSymbol : unionTypeSymbol.memberTypeDescriptors()) {
                String memberTypeName = memberTypeSymbol.getName().orElse("");
                String memberModuleId = memberTypeSymbol.getModule().isPresent()
                        ? memberTypeSymbol.getModule().get().id().toString()
                        : null;
                RefType memberType = fromSemanticSymbol(memberTypeSymbol,
                        memberTypeName, memberModuleId, typeDefSymbols);
                if (memberType.dependentTypeKeys == null || memberType.dependentTypeKeys.isEmpty()) {
                    if (memberType.hashCode != null && memberType.typeName.equals("record")) {
                        RefType t = new RefType(memberType.name);
                        t.hashCode = memberType.hashCode;
                        t.key = memberType.key;
                        t.typeName = memberType.typeName;
                        unionType.memberTypes.add(t);
                    } else {
                        unionType.memberTypes.add(memberType);
                    }
                } else {
                    if (memberType instanceof RefRecordType) {
                        RefType t = new RefType(memberType.name);
                        t.hashCode = memberType.hashCode;
                        t.key = memberType.key;
                        t.typeName = memberType.typeName;
                        unionType.memberTypes.add(t);
                    } else {
                        unionType.memberTypes.add(memberType);
                    }
                    unionType.dependentTypeKeys.addAll(memberType.dependentTypeKeys);

                }
                if (memberType.hashCode != null) {
                    if (memberType.name.isEmpty()) {
                        unionType.dependentTypeKeys.add(memberType.hashCode);
                    } else {
                        unionType.dependentTypeKeys.add(
                                String.valueOf((memberModuleId + ":" + memberTypeName).hashCode()));
                    }
                }
            }
            return unionType;
        } else if (kind == TypeDescKind.INTERSECTION) {
            IntersectionTypeSymbol intersectionTypeSymbol = (IntersectionTypeSymbol) symbol;
            return fromSemanticSymbol(intersectionTypeSymbol.effectiveTypeDescriptor(), name, moduleID, typeDefSymbols);
        } else if (kind == TypeDescKind.TYPE_REFERENCE) {
            TypeReferenceTypeSymbol typeRefSymbol = (TypeReferenceTypeSymbol) symbol;
            TypeSymbol typeSymbol = typeRefSymbol.typeDescriptor();
            String moduleId = typeRefSymbol.getModule().isPresent()
                    ? typeRefSymbol.getModule().get().id().toString()
                    : null;
            return fromSemanticSymbol(typeSymbol, name, moduleId, typeDefSymbols);
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
            refType.typeName = "()";
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

    private static RefType getEnumType(EnumSymbol enumSymbol, List<Symbol> typeDefSymbols) {
        RefType type;
        List<RefType> fields = new ArrayList<>();
        enumSymbol.members().forEach(member -> {
            String name = member.getName().orElse("");
            String moduleId = member.getModule().isPresent()
                    ? member.getModule().get().id().toString()
                    : null;
            RefType semanticSymbol = fromSemanticSymbol(member.typeDescriptor(), name, moduleId, typeDefSymbols);
            fields.add(semanticSymbol);

        });
        type = new RefEnumType(enumSymbol.getName().orElse(""), fields);
        return type;
    }

    private static void validateDependentTypes(RefType type, List<Symbol> typeDefSymbols) {
        if (type.dependentTypes == null) {
            return;
        }

        for (Map.Entry<String, RefType> entry : type.dependentTypes.entrySet()) {
            String depTypeKey = entry.getKey();
            RefType depType = entry.getValue();
            Symbol depSymbol = typeDefSymbols.stream()
                    .filter(sym -> depType.name.equals(sym.getName().orElse("")))
                    .findFirst()
                    .orElse(null);

            if (depSymbol != null) {
                TypeDefinitionSymbol typeDefSymbol = (TypeDefinitionSymbol) depSymbol;
                TypeSymbol typeDesc = typeDefSymbol.typeDescriptor();
                String moduleId = typeDefSymbol.getModule().isPresent() ?
                        typeDefSymbol.getModule().get().id().toString() : null;
                String updatedHashCode = String.valueOf(Objects.hash(
                        moduleId,
                        typeDefSymbol.getName().orElse(""),
                        typeDesc.signature()));

                if (depType.hashCode != null && depType.hashCode.equals(updatedHashCode)) {
                    continue;
                }
                visitedTypeMap.remove(depTypeKey);
                RefType updatedDepType = fromSemanticSymbol(depSymbol, typeDefSymbols);
                Objects.requireNonNull(updatedDepType,
                        "fromSemanticSymbol returned null for depSymbol: " + depSymbol);
                entry.setValue(updatedDepType);
                visitedTypeMap.put(depTypeKey, updatedDepType);
            }
        }
    }

}
