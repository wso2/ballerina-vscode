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
import io.ballerina.compiler.api.symbols.MapTypeSymbol;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.StreamTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TupleTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefConstType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefEnumType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefMapType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefRecordType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefStreamType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefTupleType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefUnionType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

public class ReferenceType {
    private static final Map<String, RefType> visitedTypeMap = new ConcurrentHashMap<>();

    public record Field(String fieldName, RefType type, boolean optional, String defaultValue) {
    }

    public static RefType fromSemanticSymbol(Symbol symbol, List<Symbol> typeDefSymbols) {
        SymbolKind kind = symbol.kind();
        if (kind == SymbolKind.CONSTANT) {
            return new RefConstType(symbol.getName().orElse(""),
                    ((ConstantSymbol) symbol).broaderTypeDescriptor().signature());
        } else if (kind == SymbolKind.ENUM) {
            return getEnumType((EnumSymbol) symbol, typeDefSymbols);
        }

        TypeInfo typeInfo = getTypeInfo(symbol);
        TypeSymbol typeSymbol = typeInfo.typeSymbol();
        String name = typeInfo.name();
        if (typeSymbol == null) {
            return null;
        }

        ModuleID moduleId = getModuleID(symbol);
        if (moduleId == null) {
            moduleId = getModuleID(typeSymbol, null);
        }
        RefType type = fromSemanticSymbol(typeSymbol, name, moduleId, typeDefSymbols);

        if (type.dependentTypes == null && !type.dependentTypeKeys.isEmpty()) {
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

    private static TypeInfo getTypeInfo(Symbol symbol) {
        String name = "";
        TypeSymbol typeSymbol = null;
        if (symbol.kind() == SymbolKind.TYPE_DEFINITION) {
            typeSymbol = ((TypeDefinitionSymbol) symbol).typeDescriptor();
            name = symbol.getName().orElse("");
        } else if (symbol.kind() == SymbolKind.PARAMETER) {
            typeSymbol = ((ParameterSymbol) symbol).typeDescriptor();
            name = typeSymbol.getName().orElse("");
        } else if (symbol.kind() == SymbolKind.RECORD_FIELD) {
            typeSymbol = ((RecordFieldSymbol) symbol).typeDescriptor();
            name = typeSymbol.getName().orElse("");
        } else if (symbol.kind() == SymbolKind.VARIABLE) {
            typeSymbol = ((VariableSymbol) symbol).typeDescriptor();
            name = typeSymbol.getName().orElseGet(() -> symbol.getName().orElse(""));
        } else if (symbol.kind() == SymbolKind.TYPE) {
            typeSymbol = (TypeSymbol) symbol;
            name = typeSymbol.getName().orElseGet(typeSymbol::signature);
        }
        return new TypeInfo(name, typeSymbol);
    }

    public static RefType fromSemanticSymbol(TypeSymbol symbol, String name, ModuleID moduleID,
                                             List<Symbol> typeDefSymbols) {
        TypeDescKind kind = symbol.typeKind();
        RefType primitiveType = getPrimitiveType(kind, name);
        if (primitiveType != null) {
            return primitiveType;
        }

        String moduleIdString = moduleID != null ?  moduleID.toString() : null;
        String typeHash = String.valueOf(Objects.hash(moduleIdString, name, symbol.signature()));
        String typeKey = String.valueOf((moduleIdString + ":" + name).hashCode());

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

        if (kind == TypeDescKind.RECORD) {
            RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) symbol;
            RefRecordType recordType = new RefRecordType(name);
            recordType.hashCode = typeHash;
            recordType.moduleInfo = moduleID != null ? createTypeInfo(moduleID) : null;
            recordType.key = typeKey;
            if (name.isEmpty()) {
                typeKey = typeHash;
                recordType.key = typeKey;
            }
            visitedTypeMap.put(typeKey, recordType);

            Map<String, RecordFieldSymbol> fieldDescriptors = recordTypeSymbol.fieldDescriptors();
            fieldDescriptors.forEach((fieldName, fieldSymbol) -> {
                TypeSymbol fieldTypeSymbol = fieldSymbol.typeDescriptor();
                fieldName = fieldSymbol.getName().orElse(fieldName);
                String fieldTypeName = fieldTypeSymbol.getName().orElse("");
                ModuleID fieldModuleId = getModuleID(fieldSymbol);
                if (fieldModuleId == null) {
                    fieldModuleId = getModuleID(fieldTypeSymbol, moduleID);
                }
                RefType fieldType = fromSemanticSymbol(fieldTypeSymbol, fieldTypeName, fieldModuleId, typeDefSymbols);
                RefType processedFieldType = processMemberType(fieldType, recordType);
                recordType.fields.add(new Field(fieldName, processedFieldType, fieldSymbol.isOptional(), ""));
            });

            return recordType;
        } else if (kind == TypeDescKind.ARRAY) {
            ArrayTypeSymbol arrayTypeSymbol = (ArrayTypeSymbol) symbol;
            RefArrayType arrayType = new RefArrayType(name);
            arrayType.hashCode = typeHash;
            arrayType.key = typeKey;
            arrayType.moduleInfo = moduleID != null ? createTypeInfo(moduleID) : null;
            TypeSymbol elementTypeSymbol = arrayTypeSymbol.memberTypeDescriptor();
            String elementTypeName = elementTypeSymbol.getName().orElse("");
            ModuleID elementModuleId = getModuleID(elementTypeSymbol, moduleID);
            RefType elementType = fromSemanticSymbol(elementTypeSymbol, elementTypeName, elementModuleId,
                    typeDefSymbols);
            arrayType.elementType = processMemberType(elementType, arrayType);
            arrayType.hashCode = arrayType.elementType.hashCode;
            arrayType.key = arrayType.elementType.key;
            return arrayType;
        } else if (kind == TypeDescKind.MAP) {
            MapTypeSymbol mapTypeSymbol = (MapTypeSymbol) symbol;
            RefMapType mapType = new RefMapType(name);
            mapType.hashCode = typeHash;
            mapType.key = typeKey;
            mapType.moduleInfo = moduleID != null ? createTypeInfo(moduleID) : null;
            TypeSymbol valueTypeSymbol = mapTypeSymbol.typeParam();
            String valueTypeName = valueTypeSymbol.getName().orElse("");
            ModuleID valueModuleId = getModuleID(valueTypeSymbol, moduleID);
            RefType valueType = fromSemanticSymbol(valueTypeSymbol, valueTypeName, valueModuleId,
                    typeDefSymbols);
            mapType.valueType = processMemberType(valueType, mapType);
            return mapType;
        } else if (kind == TypeDescKind.STREAM) {
            StreamTypeSymbol streamTypeSymbol = (StreamTypeSymbol) symbol;
            RefStreamType streamType = new RefStreamType(name);
            streamType.hashCode = typeHash;
            streamType.key = typeKey;
            streamType.moduleInfo = moduleID != null ? createTypeInfo(moduleID) : null;
            TypeSymbol valueTypeSymbol = streamTypeSymbol.typeParameter();
            String valueTypeName = valueTypeSymbol.getName().orElse("");
            ModuleID valueModuleId = getModuleID(valueTypeSymbol, moduleID);
            RefType valueType = fromSemanticSymbol(valueTypeSymbol, valueTypeName, valueModuleId,
                    typeDefSymbols);
            streamType.valueType = processMemberType(valueType, streamType);
            TypeSymbol completionTypeSymbol = streamTypeSymbol.completionValueTypeParameter();
            String completionTypeName = completionTypeSymbol.getName().orElse("");
            ModuleID completionModuleId = getModuleID(completionTypeSymbol, moduleID);
            RefType completionType = fromSemanticSymbol(completionTypeSymbol, completionTypeName, completionModuleId,
                    typeDefSymbols);
            streamType.completionType = processMemberType(completionType, streamType);
            return streamType;
        } else if (kind == TypeDescKind.UNION) {
            UnionTypeSymbol unionTypeSymbol = (UnionTypeSymbol) symbol;
            List<TypeSymbol> typeSymbols = filterNilOrError(unionTypeSymbol);
            if (typeSymbols.size() == 1) {
                TypeSymbol soleTypeSymbol = typeSymbols.getFirst();
                ModuleID soleModuleId = getModuleID(soleTypeSymbol, moduleID);
                String soleTypeName = soleTypeSymbol.getName().orElse(soleTypeSymbol.signature()) + "?";
                return fromSemanticSymbol(soleTypeSymbol, soleTypeName, soleModuleId, typeDefSymbols);
            }
            RefUnionType unionType = new RefUnionType(name);
            unionType.hashCode = typeHash;
            unionType.key = typeKey;
            unionType.moduleInfo = moduleID != null ? createTypeInfo(moduleID) : null;
            visitedTypeMap.put(typeKey, unionType);

            for (TypeSymbol memberTypeSymbol : typeSymbols) {
                String memberTypeName = memberTypeSymbol.getName().orElse("");
                ModuleID memberModuleId = getModuleID(memberTypeSymbol, moduleID);
                RefType memberType = fromSemanticSymbol(memberTypeSymbol, memberTypeName,
                        memberModuleId, typeDefSymbols);
                RefType processedMemberType = processMemberType(memberType, unionType);
                unionType.memberTypes.add(processedMemberType);
            }
            return unionType;
        } else if (kind == TypeDescKind.INTERSECTION) {
            IntersectionTypeSymbol intersectionTypeSymbol = (IntersectionTypeSymbol) symbol;
            return fromSemanticSymbol(intersectionTypeSymbol.effectiveTypeDescriptor(),
                    getIntersectionTypeName(intersectionTypeSymbol, name), moduleID, typeDefSymbols);
        } else if (kind == TypeDescKind.TYPE_REFERENCE) {
            TypeReferenceTypeSymbol typeRefSymbol = (TypeReferenceTypeSymbol) symbol;
            TypeSymbol typeSymbol = typeRefSymbol.typeDescriptor();
            return fromSemanticSymbol(typeSymbol, name, moduleID, typeDefSymbols);
        } else if (kind == TypeDescKind.SINGLETON) {
            String typeName = symbol.signature();
            if (typeName.startsWith("\"") && typeName.endsWith("\"")) {
                typeName = typeName.substring(1, typeName.length() - 1);
            }
            return new RefType(typeName);
        } else if (kind == TypeDescKind.JSON) {
            return new RefType("json");
        } else if (kind == TypeDescKind.ANY) {
            return new RefType("any");
        } else if (kind == TypeDescKind.ANYDATA) {
            return new RefType("anydata");
        } else if (kind == TypeDescKind.XML) {
            return new RefType("xml");
        } else if (kind == TypeDescKind.XML_ELEMENT) {
            return new RefType("xml:Element");
        } else if (kind == TypeDescKind.XML_TEXT) {
            return new RefType("xml:Text");
        } else if (kind == TypeDescKind.XML_COMMENT) {
            return new RefType("xml:Comment");
        } else if (kind == TypeDescKind.XML_PROCESSING_INSTRUCTION) {
            return new RefType("xml:ProcessingInstruction");
        } else if (kind == TypeDescKind.TUPLE) {
            TupleTypeSymbol typeSymbol = (TupleTypeSymbol) symbol;
            RefTupleType tupleType = new RefTupleType(name);
            for (TypeSymbol memberTypeSymbol : typeSymbol.memberTypeDescriptors()) {
                String memberTypeName = memberTypeSymbol.getName().orElse("");
                ModuleID memberModuleId = getModuleID(memberTypeSymbol, moduleID);
                RefType refType = fromSemanticSymbol(memberTypeSymbol, memberTypeName, memberModuleId, typeDefSymbols);
                tupleType.memberTypes.add(refType);
            }
            return tupleType;
        } else if (kind == TypeDescKind.REGEXP) {
            return new RefType("regexp:RegExp");
        }

        throw new UnsupportedOperationException(
                "Unsupported type kind: " + kind + " for symbol: " + symbol.getName().orElse("unknown"));
    }

    /**
     * Creates a shallow reference copy of a RefType (without dependent types).
     */
    private static RefType createShallowRef(RefType type) {
        RefType ref = new RefType(type.name);
        ref.hashCode = type.hashCode;
        ref.key = type.key;
        ref.typeName = type.typeName;
        ref.moduleInfo = type.moduleInfo;
        return ref;
    }

    /**
     * Processes a member type and returns either the original type or a shallow reference.
     * This handles the logic for record types and dependent types, and updates the parent's dependent keys.
     */
    private static RefType processMemberType(RefType memberType, RefType parentType) {
        boolean hasDependentTypes = memberType.dependentTypeKeys != null && !memberType.dependentTypeKeys.isEmpty();
        boolean shouldCreateRef = (hasDependentTypes && memberType instanceof RefRecordType) ||
                (!hasDependentTypes && memberType.hashCode != null &&
                        memberType.typeName.equals("record"));

        if (shouldCreateRef) {
            RefType ref = createShallowRef(memberType);
            if (hasDependentTypes) {
                parentType.dependentTypeKeys.addAll(memberType.dependentTypeKeys);
            }
            addDependentTypeKey(parentType, memberType);
            return ref;
        }

        if (hasDependentTypes) {
            parentType.dependentTypeKeys.addAll(memberType.dependentTypeKeys);
        }
        addDependentTypeKey(parentType, memberType);
        return memberType;
    }

    /**
     * Adds the member type's key to the parent type's dependent keys.
     */
    private static void addDependentTypeKey(RefType parentType, RefType memberType) {
        if (memberType.key != null) {
            if (memberType.name.isEmpty()) {
                parentType.dependentTypeKeys.add(memberType.hashCode);
            } else {
                parentType.dependentTypeKeys.add(memberType.key);
            }
        }
    }

    private static List<TypeSymbol> filterNilOrError(UnionTypeSymbol unionTypeSymbol) {
        List<TypeSymbol> filteredMembers = new ArrayList<>();
        for (TypeSymbol member : unionTypeSymbol.memberTypeDescriptors()) {
            if (member.typeKind() != TypeDescKind.NIL && member.typeKind() != TypeDescKind.ERROR) {
                filteredMembers.add(member);
            }
        }
        return filteredMembers;
    }

    private static RefType getPrimitiveType(TypeDescKind kind, String typeName) {
        String primitiveTypeName = getPrimitiveTypeName(kind);
        if (primitiveTypeName == null) {
            return null;
        }
        RefType refType = new RefType(primitiveTypeName);
        refType.typeName = (typeName.contains("?")) ? typeName : primitiveTypeName;
        return refType;
    }

    private static String getIntersectionTypeName(IntersectionTypeSymbol intersectionTypeSymbol, String name) {
        List<String> names = new ArrayList<>();
        for (TypeSymbol typeSymbol : intersectionTypeSymbol.memberTypeDescriptors()) {
            if (typeSymbol.typeKind() == TypeDescKind.READONLY) {
                continue;
            }
            TypeInfo typeInfo = getTypeInfo(typeSymbol);
            String typeName = typeInfo.name();
            if (typeInfo.typeSymbol() == null || typeName.isEmpty()) {
                continue;
            }
            names.add(typeName);
        }

        if (names.isEmpty()) {
            return name;
        }
        return String.join("&", names);
    }

    private static String getPrimitiveTypeName(TypeDescKind kind) {
        return switch (kind) {
            case INT -> "int";
            case INT_SIGNED8 -> "int:Signed8";
            case INT_SIGNED16 -> "int:Signed16";
            case INT_SIGNED32 -> "int:Signed32";
            case INT_UNSIGNED8 -> "int:Unsigned8";
            case INT_UNSIGNED16 -> "int:Unsigned16";
            case INT_UNSIGNED32 -> "int:Unsigned32";
            case STRING -> "string";
            case FLOAT -> "float";
            case BOOLEAN -> "boolean";
            case NIL -> "()";
            case DECIMAL -> "decimal";
            case BYTE -> "byte";
            case STRING_CHAR -> "string:Char";
            case NEVER -> "never";
            case ERROR -> "error";
            default -> null;
        };
    }


    private static ModuleInfo createTypeInfo(ModuleID moduleID) {
        return new ModuleInfo(moduleID.orgName(),
                moduleID.moduleName(), moduleID.packageName(), moduleID.version(),
                moduleID.modulePrefix());
    }

    private static ModuleID getModuleID(Symbol symbol) {
        if (symbol.kind() == SymbolKind.RECORD_FIELD) {
            Symbol typeDescriptor = ((RecordFieldSymbol) symbol).typeDescriptor();
            return getModuleID(typeDescriptor);
        }
        return symbol.getModule().isPresent()
                ? symbol.getModule().get().id()
                : null;
    }

    /**
     * Helper method to resolve ModuleID, trying direct lookup first, then recursive lookup with fallback.
     */
    private static ModuleID resolveModuleIDWithFallback(TypeSymbol typeSymbol, ModuleID fallbackModuleId) {
        ModuleID moduleId = getModuleID(typeSymbol);
        return moduleId != null ? moduleId : getModuleID(typeSymbol, fallbackModuleId);
    }

    private static ModuleID getModuleID(TypeSymbol typeSymbol, ModuleID fallbackModuleId) {
        switch (typeSymbol.typeKind()) {
            case ARRAY -> {
                ArrayTypeSymbol arrayType = (ArrayTypeSymbol) typeSymbol;
                return resolveModuleIDWithFallback(arrayType.memberTypeDescriptor(), fallbackModuleId);
            }
            case MAP -> {
                MapTypeSymbol mapType = (MapTypeSymbol) typeSymbol;
                return resolveModuleIDWithFallback(mapType.typeParam(), fallbackModuleId);
            }
            case STREAM -> {
                StreamTypeSymbol streamType = (StreamTypeSymbol) typeSymbol;
                return resolveModuleIDWithFallback(streamType.typeParameter(), fallbackModuleId);
            }
            case UNION -> {
                UnionTypeSymbol unionType = (UnionTypeSymbol) typeSymbol;
                return unionType.memberTypeDescriptors().stream()
                        .map(member -> resolveModuleIDWithFallback(member, fallbackModuleId))
                        .filter(Objects::nonNull)
                        .findFirst()
                        .orElse(fallbackModuleId);
            }
            case INTERSECTION -> {
                IntersectionTypeSymbol intersectionType = (IntersectionTypeSymbol) typeSymbol;
                TypeSymbol effectiveType = intersectionType.effectiveTypeDescriptor();
                ModuleID effectiveModuleId = getModuleID(effectiveType);
                return effectiveModuleId != null ? effectiveModuleId : fallbackModuleId;
            }
            case TYPE_REFERENCE -> {
                TypeReferenceTypeSymbol typeRefSymbol = (TypeReferenceTypeSymbol) typeSymbol;
                return getModuleID(typeRefSymbol);
            }
            default -> {
                ModuleID directModuleId = getModuleID(typeSymbol);
                return directModuleId != null ? directModuleId : fallbackModuleId;
            }
        }
    }

    private static RefType getEnumType(EnumSymbol enumSymbol, List<Symbol> typeDefSymbols) {
        RefType type;
        List<RefType> fields = new ArrayList<>();
        enumSymbol.members().forEach(member -> {
            String name = member.getName().orElse("");
            ModuleID moduleId = getModuleID(member);
            RefType semanticSymbol = fromSemanticSymbol(member.typeDescriptor(), name, moduleId, typeDefSymbols);
            fields.add(semanticSymbol);

        });
        type = new RefEnumType(enumSymbol.getName().orElse(""), fields);
        ModuleID moduleId = getModuleID(enumSymbol);
        type.moduleInfo = moduleId != null ? createTypeInfo(moduleId) : null;
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
                    .filter(sym -> {
                        if (!depType.name.equals(sym.getName().orElse(""))) {
                            return false;
                        }
                        ModuleInfo depModuleInfo = depType.moduleInfo;
                        if (depModuleInfo != null) {
                            ModuleID symModuleId = getModuleID(sym);
                            if (symModuleId != null) {
                                return depModuleInfo.orgName.equals(symModuleId.orgName()) &&
                                        depModuleInfo.moduleName.equals(symModuleId.moduleName()) &&
                                        depModuleInfo.version.equals(symModuleId.version());
                            }
                        }
                        return true;
                    })
                    .findFirst()
                    .orElse(null);

            if (depSymbol != null) {
                TypeDefinitionSymbol typeDefSymbol = (TypeDefinitionSymbol) depSymbol;
                TypeSymbol typeDesc = typeDefSymbol.typeDescriptor();
                ModuleID moduleId = getModuleID(depSymbol);
                if (moduleId == null) {
                    moduleId = getModuleID(typeDesc, null);
                }
                String moduleIdString = moduleId != null ? moduleId.toString() : null;
                String updatedHashCode = String.valueOf(Objects.hash(
                        moduleIdString,
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

    public static void clearVisitedTypeMap() {
        visitedTypeMap.clear();
    }

    private record TypeInfo(String name, TypeSymbol typeSymbol) {

    }
}
