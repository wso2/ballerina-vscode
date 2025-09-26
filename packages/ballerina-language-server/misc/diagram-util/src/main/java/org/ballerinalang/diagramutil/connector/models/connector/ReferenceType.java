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

import io.ballerina.compiler.api.ModuleID;
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
            RefConstType constType = new RefConstType(symbol.getName().orElse(""),
                    ((ConstantSymbol) symbol).broaderTypeDescriptor().signature());
            ModuleID moduleId = getModuleID(symbol);
            assert moduleId != null;
            constType.typeInfo = createTypeInfo(moduleId);
            return constType;
        } else if (kind == SymbolKind.ENUM) {
            return getEnumType((EnumSymbol) symbol);
        }

        if (typeSymbol == null) {
            return null;
        }

        ModuleID moduleId = getModuleID(symbol);
        assert moduleId != null;
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

    public static RefType fromSemanticSymbol(TypeSymbol symbol, String name, ModuleID moduleID) {
        String hashCode = String.valueOf(Objects.hash(moduleID.toString(), name, symbol.signature()));
        RefType type = visitedTypeMap.get(hashCode);
        if (type != null) {
            return type;
        }

        TypeDescKind kind = symbol.typeKind();
        if (kind == TypeDescKind.RECORD) {
            RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) symbol;
            RefRecordType recordType = new RefRecordType(name);
            recordType.hashCode = hashCode;
            recordType.typeInfo = createTypeInfo(moduleID);
            visitedTypeMap.put(hashCode, recordType);

            Map<String, RecordFieldSymbol> fieldDescriptors = recordTypeSymbol.fieldDescriptors();
            fieldDescriptors.forEach((fieldName, fieldSymbol) -> {
                TypeSymbol fieldTypeSymbol = fieldSymbol.typeDescriptor();
                String fieldTypeName = fieldTypeSymbol.getName().orElse("");
                ModuleID fieldModuleId = getModuleID(fieldSymbol);
                assert fieldModuleId != null;
                RefType fieldType = fromSemanticSymbol(fieldTypeSymbol, fieldTypeName, fieldModuleId);
                if (fieldType.dependentTypeHashes == null || fieldType.dependentTypeHashes.isEmpty()) {
                    if (fieldType.hashCode != null && fieldType.typeName.equals("record")) {
                        RefType t = new RefType(fieldType.name);
                        t.hashCode = fieldType.hashCode;
                        t.typeName = fieldType.typeName;
                        t.typeInfo = fieldType.typeInfo;
                        recordType.fields.add(new Field(fieldName, t, fieldSymbol.isOptional(), ""));
                    } else {
                        recordType.fields.add(new Field(fieldName, fieldType, fieldSymbol.isOptional(), ""));
                    }
                } else {
                    if (fieldType instanceof RefRecordType) {
                        RefType t = new RefType(fieldType.name);
                        t.hashCode = fieldType.hashCode;
                        t.typeName = fieldType.typeName;
                        t.typeInfo = fieldType.typeInfo;
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
            arrayType.typeInfo = createTypeInfo(moduleID);
            TypeSymbol elementTypeSymbol = arrayTypeSymbol.memberTypeDescriptor();
            String elementTypeName = elementTypeSymbol.getName().orElse("");
            ModuleID moduleId = getModuleID(elementTypeSymbol);
            assert moduleId != null;
            RefType elementType = fromSemanticSymbol(elementTypeSymbol, elementTypeName, moduleId);
            if (elementType.dependentTypeHashes == null || elementType.dependentTypeHashes.isEmpty()) {
                if (elementType.hashCode != null && elementType.typeName.equals("record")) {
                    RefType t = new RefType(elementType.name);
                    t.hashCode = elementType.hashCode;
                    t.typeName = elementType.typeName;
                    t.typeInfo = elementType.typeInfo;
                    arrayType.elementType = t;
                } else {
                    arrayType.elementType = elementType;
                }
            } else {
                if (elementType instanceof RefRecordType) {
                    RefType t = new RefType(elementType.name);
                    t.hashCode = elementType.hashCode;
                    t.typeName = elementType.typeName;
                    t.typeInfo = elementType.typeInfo;
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
            unionType.typeInfo = createTypeInfo(moduleID);
            visitedTypeMap.put(hashCode, unionType);

            for (TypeSymbol memberTypeSymbol : unionTypeSymbol.memberTypeDescriptors()) {
                String memberTypeName = memberTypeSymbol.getName().orElse("");
                RefType memberType = fromSemanticSymbol(memberTypeSymbol, memberTypeName, moduleID);
                if (memberType.dependentTypeHashes == null || memberType.dependentTypeHashes.isEmpty()) {
                    if (memberType.hashCode != null && memberType.typeName.equals("record")) {
                        RefType t = new RefType(memberType.name);
                        t.hashCode = memberType.hashCode;
                        t.typeName = memberType.typeName;
                        t.typeInfo = memberType.typeInfo;
                        unionType.memberTypes.add(t);
                    } else {
                        unionType.memberTypes.add(memberType);
                    }
                } else {
                    if (memberType instanceof RefRecordType) {
                        RefType t = new RefType(memberType.name);
                        t.hashCode = memberType.hashCode;
                        t.typeName = memberType.typeName;
                        t.typeInfo = memberType.typeInfo;
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
        } else if (kind == TypeDescKind.INTERSECTION) {
            IntersectionTypeSymbol intersectionTypeSymbol = (IntersectionTypeSymbol) symbol;
            return fromSemanticSymbol(intersectionTypeSymbol.effectiveTypeDescriptor(), name, moduleID);
        } else if (kind == TypeDescKind.TYPE_REFERENCE) {
            TypeReferenceTypeSymbol typeRefSymbol = (TypeReferenceTypeSymbol) symbol;
            TypeSymbol typeSymbol = typeRefSymbol.typeDescriptor();
            ModuleID moduleId = getModuleID(typeRefSymbol);
            assert moduleId != null;
            return fromSemanticSymbol(typeSymbol, name, moduleId);
        } else if (kind == TypeDescKind.INT) {
            RefType refType = new RefType("int");
            refType.typeName = "int";
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        } else if (kind == TypeDescKind.STRING) {
            RefType refType = new RefType("string");
            refType.typeName = "string";
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        } else if (kind == TypeDescKind.FLOAT) {
            RefType refType = new RefType("float");
            refType.typeName = "float";
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        } else if (kind == TypeDescKind.BOOLEAN) {
            RefType refType = new RefType("boolean");
            refType.typeName = "boolean";
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        } else if (kind == TypeDescKind.NIL) {
            RefType refType = new RefType("nil");
            refType.typeName = "()";
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        } else if (kind == TypeDescKind.DECIMAL) {
            RefType refType = new RefType("decimal");
            refType.typeName = "decimal";
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        } else if (kind == TypeDescKind.NEVER) {
            RefType refType = new RefType("never");
            refType.typeName = "never";
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        } else if (kind == TypeDescKind.SINGLETON) {
            String typeName = symbol.signature();
            if (typeName.startsWith("\"") && typeName.endsWith("\"")) {
                typeName = typeName.substring(1, typeName.length() - 1);
            }
            RefType refType = new RefType(typeName);
            refType.typeInfo = createTypeInfo(moduleID);
            return refType;
        }
        throw new UnsupportedOperationException(
                "Unsupported type kind: " + kind + " for symbol: " + symbol.getName().orElse("unknown"));
    }


    private static TypeInfo createTypeInfo(ModuleID moduleID) {
        return new TypeInfo(moduleID.orgName(), moduleID.moduleName(), moduleID.packageName(), moduleID.version(),
                moduleID.modulePrefix());
    }

    private static ModuleID getModuleID(Symbol symbol) {
        return symbol.getModule().isPresent()
                ? symbol.getModule().get().id()
                : null;
    }

    private static RefType getEnumType(EnumSymbol enumSymbol) {
        RefType type;
        List<RefType> fields = new ArrayList<>();
        enumSymbol.members().forEach(member -> {
            String name = member.getName().orElse("");
            ModuleID moduleId = getModuleID(member);
            assert moduleId != null;
            RefType semanticSymbol = fromSemanticSymbol(member.typeDescriptor(), name, moduleId);
            fields.add(semanticSymbol);

        });
        type = new RefEnumType(enumSymbol.getName().orElse(""), fields);
        ModuleID moduleId = getModuleID(enumSymbol);
        assert moduleId != null;
        type.typeInfo = createTypeInfo(moduleId);
        return type;
    }
}
