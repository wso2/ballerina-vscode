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
import io.ballerina.compiler.api.ModuleID;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.Documentation;
import io.ballerina.compiler.api.symbols.ErrorTypeSymbol;
import io.ballerina.compiler.api.symbols.IntersectionTypeSymbol;
import io.ballerina.compiler.api.symbols.MapTypeSymbol;
import io.ballerina.compiler.api.symbols.ObjectTypeSymbol;
import io.ballerina.compiler.api.symbols.ParameterKind;
import io.ballerina.compiler.api.symbols.ParameterSymbol;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.StreamTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TableTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.api.symbols.VariableSymbol;
import io.ballerina.compiler.syntax.tree.ArrayTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.BuiltinSimpleNameReferenceNode;
import io.ballerina.compiler.syntax.tree.IntersectionTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.MapTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.Node;
import io.ballerina.compiler.syntax.tree.OptionalTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.RecordFieldNode;
import io.ballerina.compiler.syntax.tree.RecordTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.StreamTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.StreamTypeParamsNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.TableTypeDescriptorNode;
import io.ballerina.compiler.syntax.tree.UnionTypeDescriptorNode;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefArrayType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefEnumType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefErrorType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefInclusionType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefIntersectionType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefMapType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefObjectType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefPrimitiveType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefRecordType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefStreamType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefTableType;
import org.ballerinalang.diagramutil.connector.models.connector.reftypes.RefUnionType;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Reference-based type model.
 *
 * @since language-server 1.0.0
 */
public class RefType {

    private static final Map<String, RefVisitedType> visitedTypeMap = new HashMap<>();

    @Expose
    public Map<String, RefType> dependentTypes;
    @Expose
    public String hashCode;
    @Expose
    public String name;
    @Expose
    public String typeName;
    @Expose
    public boolean optional;
    @Expose
    public TypeInfo typeInfo;
    @Expose
    public boolean defaultable;
    @Expose
    public String defaultValue;
    @Expose
    public Map<String, String> displayAnnotation; //No need for data-mapper
    @Expose
    public String documentation; //No need for data-mapper
    @Expose
    public boolean isRestType;
    @Expose
    public String value; //No need for data-mapper
    @Expose
    public boolean selected = false; //No need for data-mapper

    public RefType() {

    }

    public RefType(String name, String typeName) {
        this.name = name;
        this.typeName = typeName;
    }

    public RefType(RefType refType) {
        this.name = refType.name;
        this.typeName = refType.typeName;
        this.hashCode = refType.hashCode;
        this.optional = refType.optional;
        this.typeInfo = refType.typeInfo;
        this.defaultable = refType.defaultable;
        this.defaultValue = refType.defaultValue;
        this.displayAnnotation = refType.displayAnnotation;
        this.documentation = refType.documentation;
        this.isRestType = refType.isRestType;
        this.value = refType.value;
        this.selected = refType.selected;
    }

    public RefType(String name, String typeName, boolean optional, TypeInfo typeInfo, boolean defaultable,
                   String defaultValue, Map<String, String> displayAnnotation, String documentation) {
        this.name = name;
        this.typeName = typeName;
        this.optional = optional;
        this.typeInfo = typeInfo;
        this.defaultable = defaultable;
        this.defaultValue = defaultValue;
        this.displayAnnotation = displayAnnotation;
        this.documentation = documentation;
    }

    public static void clearVisitedTypeMap() {
        visitedTypeMap.clear();
    }

    public static Optional<RefType> fromSyntaxNode(Node node, SemanticModel semanticModel) {
        Optional<RefType> type = Optional.empty();

        switch (node.kind()) {
            case SIMPLE_NAME_REFERENCE:
            case QUALIFIED_NAME_REFERENCE:
                Optional<Symbol> optSymbol = Optional.empty();
                try {
                    optSymbol = semanticModel.symbol(node);
                } catch (NullPointerException ignored) {
                }
                if (optSymbol != null && optSymbol.isPresent()) {
                    Symbol symbol = optSymbol.get();
                    type = Optional.of(fromSemanticSymbol(symbol));
                    clearVisitedTypeMap();
                }
                break;
            case OPTIONAL_TYPE_DESC:
                OptionalTypeDescriptorNode optionalTypeDescriptorNode = (OptionalTypeDescriptorNode) node;
                type = fromSyntaxNode(optionalTypeDescriptorNode.typeDescriptor(), semanticModel);
                if (type.isPresent()) {
                    RefType optionalType = type.get();
                    optionalType.optional = true;
                    type = Optional.of(optionalType);
                }
                break;
            case UNION_TYPE_DESC:
                RefUnionType unionType = new RefUnionType();
                flattenUnionNode(node, semanticModel, unionType.members);
                type = Optional.of(unionType);
                break;
            case INTERSECTION_TYPE_DESC:
                RefIntersectionType intersectionType = new RefIntersectionType();
                flattenIntersectionNode(node, semanticModel, intersectionType.members);
                type = Optional.of(intersectionType);
                break;
            case ARRAY_TYPE_DESC:
                ArrayTypeDescriptorNode arrayTypeDescriptorNode = (ArrayTypeDescriptorNode) node;
                Optional<RefType> syntaxNode = fromSyntaxNode(arrayTypeDescriptorNode.memberTypeDesc(), semanticModel);
                if (syntaxNode.isPresent()) {
                    type = Optional.of(new RefArrayType(syntaxNode.get()));
                }
                break;
            case STREAM_TYPE_DESC:
                StreamTypeDescriptorNode streamNode = (StreamTypeDescriptorNode) node;
                StreamTypeParamsNode streamParams = streamNode.streamTypeParamsNode().isPresent() ?
                        (StreamTypeParamsNode) streamNode.streamTypeParamsNode().get() : null;
                Optional<RefType> leftParam = Optional.empty();
                Optional<RefType> rightParam = Optional.empty();
                if (streamParams != null) {
                    leftParam = fromSyntaxNode(streamParams.leftTypeDescNode(), semanticModel);
                    if (streamParams.rightTypeDescNode().isPresent()) {
                        rightParam = fromSyntaxNode(streamParams.rightTypeDescNode().get(), semanticModel);
                    }
                }
                type = Optional.of(new RefStreamType(leftParam, rightParam));
                break;
            case RECORD_TYPE_DESC:
                RecordTypeDescriptorNode recordNode = (RecordTypeDescriptorNode) node;
                List<RefType> fields = new ArrayList<>();
                recordNode.fields().forEach(node1 -> {
                    Optional<RefType> optionalType = fromSyntaxNode(node1, semanticModel);
                    optionalType.ifPresent(fields::add);
                });

                Optional<RefType> restType = recordNode.recordRestDescriptor().isPresent() ?
                        fromSyntaxNode(recordNode.recordRestDescriptor().get().typeName(), semanticModel) :
                        Optional.empty();
                type = Optional.of(new RefRecordType(fields, restType));
                break;
            case RECORD_FIELD:
                RecordFieldNode recordField = (RecordFieldNode) node;
                type = fromSyntaxNode(recordField.typeName(), semanticModel);
                if (type.isPresent()) {
                    RefType recordType = type.get();
                    recordType.name = recordField.fieldName().text();
                    type = Optional.of(recordType);
                }
                break;
            case MAP_TYPE_DESC:
                MapTypeDescriptorNode mapNode = (MapTypeDescriptorNode) node;
                Optional<RefType> mapStNode = fromSyntaxNode(mapNode.mapTypeParamsNode().typeNode(), semanticModel);
                if (mapStNode.isPresent()) {
                    type = Optional.of(new RefMapType(mapStNode.get()));
                }
                break;
            case TABLE_TYPE_DESC:
                TableTypeDescriptorNode tableTypeNode = (TableTypeDescriptorNode) node;
                Optional<Symbol> optTableTypeSymbol = Optional.empty();
                TableTypeSymbol tableTypeSymbol = null;
                List<String> keySpecifiers = null;
                try {
                    optTableTypeSymbol = semanticModel.symbol(tableTypeNode);
                } catch (NullPointerException ignored) {
                }
                if (optTableTypeSymbol != null && optTableTypeSymbol.isPresent()) {
                    tableTypeSymbol = (TableTypeSymbol) optTableTypeSymbol.get();
                }
                if (tableTypeSymbol != null) {
                    keySpecifiers = tableTypeSymbol.keySpecifiers();
                }
                if (tableTypeNode.keyConstraintNode().isEmpty()) {
                    break;
                }
                Node keyConstraint = tableTypeNode.keyConstraintNode().get();
                Optional<RefType> tableStNode = fromSyntaxNode(tableTypeNode.rowTypeParameterNode(), semanticModel);
                Optional<RefType> constraintStNode = fromSyntaxNode(keyConstraint, semanticModel);
                if (tableStNode.isPresent() && constraintStNode.isPresent()) {
                    type = Optional.of(new RefTableType(tableStNode.get(), keySpecifiers, constraintStNode.get()));
                }
                break;
            default:
                if (node instanceof BuiltinSimpleNameReferenceNode builtinSimpleNameReferenceNode) {
                    type = Optional.of(new RefPrimitiveType(builtinSimpleNameReferenceNode.name().text()));
                } else {
                    type = Optional.of(new RefPrimitiveType(node.toSourceCode()));
                }
                break;
        }

        return type;
    }

    public static void flattenUnionNode(Node node, SemanticModel semanticModel, List<RefType> fields) {
        if (node.kind() == SyntaxKind.UNION_TYPE_DESC) {
            UnionTypeDescriptorNode unionTypeNode = (UnionTypeDescriptorNode) node;
            flattenUnionNode(unionTypeNode.leftTypeDesc(), semanticModel, fields);
            flattenUnionNode(unionTypeNode.rightTypeDesc(), semanticModel, fields);
            return;
        }
        Optional<RefType> optionalType = fromSyntaxNode(node, semanticModel);
        optionalType.ifPresent(fields::add);
    }

    public static void flattenIntersectionNode(Node node, SemanticModel semanticModel, List<RefType> fields) {
        if (node.kind() == SyntaxKind.INTERSECTION_TYPE_DESC) {
            IntersectionTypeDescriptorNode intersectionTypeNode = (IntersectionTypeDescriptorNode) node;
            flattenUnionNode(intersectionTypeNode.leftTypeDesc(), semanticModel, fields);
            flattenUnionNode(intersectionTypeNode.rightTypeDesc(), semanticModel, fields);
            return;
        }
        Optional<RefType> optionalType = fromSyntaxNode(node, semanticModel);
        optionalType.ifPresent(fields::add);
    }

    public static RefVisitedType getVisitedType(String typeName) {
        if (visitedTypeMap.containsKey(typeName)) {
            return visitedTypeMap.get(typeName);
        }
        return null;
    }

    public static void completeVisitedTypeEntry(String typeName, RefType typeNode,
                                                Map<String, RefType> dependentTypes) {
        RefVisitedType visitedType = visitedTypeMap.get(typeName);
        typeNode.dependentTypes = new HashMap<>();
        for (Map.Entry<String, RefType> entry : dependentTypes.entrySet()) {
            if (entry.getValue() != null) {
                typeNode.dependentTypes.put(entry.getKey(), entry.getValue());
            }
        }
        visitedType.setCompleted(true);
        visitedType.setTypeNode(typeNode);
    }

    public static RefType fromSemanticSymbol(Symbol symbol) {
        return fromSemanticSymbol(symbol, null);
    }

    public static RefType fromSemanticSymbol(Symbol symbol, SemanticModel semanticModel) {
        return fromSemanticSymbol(symbol, new HashMap<>(), semanticModel);
    }

    private static RefType fromSemanticSymbol(Symbol symbol, Map<String, String> documentationMap,
                                              SemanticModel semanticModel) {
        Map<String, RefType> dependentTypes = new HashMap<>();
        return  fromSemanticSymbol(symbol, documentationMap, semanticModel, dependentTypes, true);

    }

    private static RefType fromSemanticSymbol(Symbol symbol, Map<String, String> documentationMap,
                                              SemanticModel semanticModel, Map<String, RefType> dependentTypes,
                                              boolean isRoot) {
        RefType type = null;
        if (symbol instanceof TypeReferenceTypeSymbol typeReferenceTypeSymbol) {
            type = getEnumType(typeReferenceTypeSymbol, symbol,
                    documentationMap, semanticModel, dependentTypes, isRoot);
        } else if (symbol instanceof RecordTypeSymbol recordTypeSymbol) {
            String typeName = String.valueOf(recordTypeSymbol.hashCode());
            RefVisitedType visitedType = getVisitedType(typeName);
            if (visitedType != null) {
                return getAlreadyVisitedType(symbol, typeName, visitedType, false);
            } else {
                if (typeName.contains("record {")) {
                    type = getRecordType(recordTypeSymbol, documentationMap, semanticModel, dependentTypes);
                } else {
                    visitedTypeMap.put(typeName, new RefVisitedType());
                    type = getRecordType(recordTypeSymbol, documentationMap, semanticModel, dependentTypes);
                    if (!dependentTypes.isEmpty()) {
                        Map<String, RefType> depTypes = new HashMap<>();
                        dependentTypes.forEach((key, value) -> {
                            if (value != null) {
                                depTypes.put(key, value);
                            }
                        });
                        type.dependentTypes = depTypes;
                    }

                    completeVisitedTypeEntry(typeName, type, dependentTypes);
                }
            }
        } else if (symbol instanceof ArrayTypeSymbol arrayTypeSymbol) {
            type = new RefArrayType(fromSemanticSymbol(arrayTypeSymbol.memberTypeDescriptor(), documentationMap,
                    semanticModel));
        } else if (symbol instanceof MapTypeSymbol mapTypeSymbol) {
            type = new RefMapType(fromSemanticSymbol(mapTypeSymbol.typeParam(), documentationMap, semanticModel));
        } else if (symbol instanceof TableTypeSymbol tableTypeSymbol) {
            TypeSymbol keyConstraint = null;
            if (tableTypeSymbol.keyConstraintTypeParameter().isPresent()) {
                keyConstraint = tableTypeSymbol.keyConstraintTypeParameter().get();
            }
            type = new RefTableType(fromSemanticSymbol(tableTypeSymbol.rowTypeParameter(), documentationMap,
                    semanticModel),
                    tableTypeSymbol.keySpecifiers(), fromSemanticSymbol(keyConstraint, documentationMap,
                    semanticModel));
        } else if (symbol instanceof UnionTypeSymbol unionSymbol) {
            String typeName = String.valueOf(unionSymbol.hashCode());
            RefVisitedType visitedType = getVisitedType(typeName);
            if (visitedType != null) {
                return getAlreadyVisitedType(symbol, typeName, visitedType, true);
            } else {
                visitedTypeMap.put(typeName, new RefVisitedType());
                type = getUnionType(unionSymbol, documentationMap, semanticModel);
                completeVisitedTypeEntry(typeName, type, dependentTypes);
            }
        } else if (symbol instanceof ErrorTypeSymbol errSymbol) {
            RefErrorType errType = new RefErrorType();
            if (errSymbol.detailTypeDescriptor() instanceof TypeReferenceTypeSymbol) {
                errType.detailType = fromSemanticSymbol(errSymbol.detailTypeDescriptor(), documentationMap,
                        semanticModel);
            }
            type = errType;
        } else if (symbol instanceof IntersectionTypeSymbol intersectionTypeSymbol) {
            String typeName = String.valueOf(intersectionTypeSymbol.hashCode());
            RefVisitedType visitedType = getVisitedType(typeName);
            if (visitedType != null) {
                return getAlreadyVisitedType(symbol, typeName, visitedType, false);
            } else {
                visitedTypeMap.put(typeName, new RefVisitedType());
                type = getIntersectionType(intersectionTypeSymbol, documentationMap, semanticModel);
                completeVisitedTypeEntry(typeName, type, dependentTypes);
            }
        } else if (symbol instanceof StreamTypeSymbol streamTypeSymbol) {
            type = getStreamType(streamTypeSymbol, documentationMap, semanticModel);
        } else if (symbol instanceof ObjectTypeSymbol objectTypeSymbol) {
            RefObjectType objectType = new RefObjectType();
            objectTypeSymbol.fieldDescriptors()
                    .forEach((typeName, typeSymbol) -> {
                RefType semanticSymbol = fromSemanticSymbol(typeSymbol, documentationMap, semanticModel);
                if (semanticSymbol != null) {
                    objectType.fields.add(semanticSymbol);
                }
            });
            objectTypeSymbol.typeInclusions().forEach(typeSymbol -> {
                RefType semanticSymbol = fromSemanticSymbol(typeSymbol, documentationMap, semanticModel);
                if (semanticSymbol != null) {
                    objectType.fields.add(new RefInclusionType(semanticSymbol));
                }
            });
            type = objectType;
        } else if (symbol instanceof RecordFieldSymbol recordFieldSymbol) {
            type = fromSemanticSymbol(recordFieldSymbol.typeDescriptor(), documentationMap, semanticModel);
        } else if (symbol instanceof ParameterSymbol parameterSymbol) {
            type = fromSemanticSymbol(parameterSymbol.typeDescriptor(), documentationMap, semanticModel);
            if (type != null) {
                type.defaultable = parameterSymbol.paramKind() == ParameterKind.DEFAULTABLE;
            }
        } else if (symbol instanceof VariableSymbol variableSymbol) {
            type = fromSemanticSymbol(variableSymbol.typeDescriptor(),
                    documentationMap, semanticModel, dependentTypes, isRoot);
        } else if (symbol instanceof TypeSymbol typeSymbol) {
            String typeName = typeSymbol.signature();
            if (typeName.startsWith("\"") && typeName.endsWith("\"")) {
                typeName = typeName.substring(1, typeName.length() - 1);
            }
            type = new RefPrimitiveType(typeName);
        } else if (symbol instanceof TypeDefinitionSymbol typeDefinitionSymbol) {
            AtomicReference<String> typeDocumentation = new AtomicReference<>();
            typeDefinitionSymbol.documentation().ifPresent(doc -> {
                documentationMap.putAll(doc.parameterMap());
                typeDocumentation.set(doc.description().orElse(null));
            });
            type = fromSemanticSymbol(typeDefinitionSymbol.typeDescriptor(), documentationMap, semanticModel);
            type.documentation = typeDocumentation.get();
        }

        return type;
    }


    private static RefType getAlreadyVisitedType(Symbol symbol, String typeName, RefVisitedType visitedType,
                                                 boolean getClone) {
        if (visitedType.isCompleted()) {
            RefType existingType = visitedType.getTypeNode();
            if (getClone) {
                if (existingType instanceof RefUnionType unionType) {
                    return new RefUnionType(unionType);
                }
                return new RefType(existingType.getName(), existingType.getTypeName(), existingType.isOptional(),
                        existingType.getTypeInfo(), existingType.isDefaultable(), existingType.getDefaultValue(),
                        existingType.getDisplayAnnotation(), existingType.getDocumentation());
            }
            if (existingType instanceof RefRecordType recordType) {
                return new RefRecordType(recordType, true);
            }
            return existingType;
        } else {
            RefType type = new RefType();
            setTypeInfo(typeName, symbol, type);
            return type;
        }
    }

    private static RefType getIntersectionType(IntersectionTypeSymbol intersectionTypeSymbol,
                                               Map<String, String> documentationMap, SemanticModel semanticModel) {
        RefType type;
        RefIntersectionType intersectionType = new RefIntersectionType();
        intersectionTypeSymbol.memberTypeDescriptors().forEach(typeSymbol -> {
            RefType semanticSymbol = fromSemanticSymbol(typeSymbol, documentationMap, semanticModel);
            if (semanticSymbol != null) {
                intersectionType.members.add(semanticSymbol);
            }
        });

        type = intersectionType;
        return type;
    }

    private static RefType getUnionType(UnionTypeSymbol unionSymbol,
                                        Map<String, String> documentationMap, SemanticModel semanticModel) {
        RefType type;
        RefUnionType unionType = new RefUnionType();
        unionSymbol.memberTypeDescriptors().forEach(typeSymbol -> {
            RefType semanticSymbol = fromSemanticSymbol(typeSymbol, documentationMap, semanticModel);
            if (semanticSymbol != null) {
                unionType.members.add(semanticSymbol);
            }
        });
        if (unionType.members.stream().allMatch(type1 -> type1 instanceof RefErrorType)) {
            RefErrorType errType = new RefErrorType();
            errType.isErrorUnion = true;
            errType.errorUnion = unionType;
            type = errType;
        } else {
            type = unionType;
        }
        return type;
    }

    private static RefType getRecordType(RecordTypeSymbol recordTypeSymbol, Map<String, String> documentationMap,
                                         SemanticModel semanticModel, Map<String, RefType> dependentTypes) {
        RefType type;
        List<RefType> fields = new ArrayList<>();
        collectRecordDocumentation(recordTypeSymbol, semanticModel, documentationMap);
        recordTypeSymbol.fieldDescriptors().forEach((name, field) -> {
            RefType subType = fromSemanticSymbol(field.typeDescriptor(),
                    documentationMap, semanticModel, dependentTypes, false);
            if (subType != null) {
                if (subType instanceof RefPrimitiveType) {
                    subType.setName(name);
                    subType.setOptional(field.isOptional());
                    subType.setDefaultable(field.hasDefaultValue());
                    subType.setDocumentation(documentationMap.get(name));
                    fields.add(subType);
                } else if (subType instanceof RefRecordType) {
                    RefType recordSubType = new RefType(name, subType.getName());
                    TypeInfo typeInfo = subType.getTypeInfo();
                    String hashCode = String.valueOf(
                            (typeInfo.name + typeInfo.orgName + typeInfo.moduleName + typeInfo.version).hashCode());
                    recordSubType.setHashCode(hashCode);
                    fields.add(recordSubType);
                    RefType depType = new RefRecordType((RefRecordType) subType, false);
                    dependentTypes.put(hashCode, depType);
                    if (subType.dependentTypes != null) {
                        dependentTypes.putAll(subType.dependentTypes);
                    }
                } else if (subType instanceof RefArrayType) {
                    RefArrayType arraySubType = new RefArrayType(((RefArrayType) subType).memberType);
                    TypeInfo typeInfo = ((RefArrayType) subType).memberType.getTypeInfo();
                    String hashCode = String.valueOf(
                            (typeInfo.name + typeInfo.orgName + typeInfo.moduleName + typeInfo.version).hashCode());
                    arraySubType.memberType.setHashCode(hashCode);

                    if(arraySubType.memberType instanceof RefRecordType) {
                        RefType recordSubType = new RefType(arraySubType.memberType.getName(), arraySubType.memberType.getTypeName()
                        );
                        recordSubType.setHashCode(hashCode);
                        RefArrayType arraySubTypeWithRecord = new RefArrayType(recordSubType, name);
                        fields.add(arraySubTypeWithRecord);
                    }else{
                        fields.add(arraySubType);
                    }
                    RefType depType = new RefRecordType((RefRecordType) (((RefArrayType) subType).memberType), false);
                    dependentTypes.put(hashCode, depType);
                    if (subType.dependentTypes != null) {
                        dependentTypes.putAll(subType.dependentTypes);
                    }
                } else {
                    subType.setName(name);
                    subType.setOptional(field.isOptional());
                    subType.setDefaultable(field.hasDefaultValue());
                    subType.setDocumentation(documentationMap.get(name));
                    fields.add(subType);
                }
            }
        });
        RefType restType = recordTypeSymbol.restTypeDescriptor().isPresent() ?
                fromSemanticSymbol(recordTypeSymbol.restTypeDescriptor().get(),
                        documentationMap, semanticModel, dependentTypes, false) : null;
        type = new RefRecordType(fields, restType);
        return type;
    }

    private static void collectRecordDocumentation(RecordTypeSymbol recordTypeSymbol, SemanticModel semanticModel,
                                                   Map<String, String> documentationMap) {
        recordTypeSymbol.typeInclusions().forEach(includedType -> {
            if (Objects.nonNull(semanticModel) && includedType.getModule().isPresent()
                    && includedType.getName().isPresent()) {
                ModuleID id = includedType.getModule().get().id();
                Optional<Symbol> typeByName = semanticModel.types().getTypeByName(id.orgName(), id.moduleName(),
                        "", includedType.getName().get());
                if (typeByName.isPresent() && typeByName.get() instanceof TypeDefinitionSymbol typeDefinitionSymbol) {
                    Optional<Documentation> documentation = typeDefinitionSymbol.documentation();
                    documentation.ifPresent(documentation1
                            -> documentationMap.putAll(documentation1.parameterMap()));
                }
            }
        });
        recordTypeSymbol.fieldDescriptors().forEach((name, field) -> {
            String paramDescription = field.documentation().flatMap(Documentation::description).orElse("");
            if (documentationMap.containsKey(name) && !paramDescription.isEmpty()) {
                documentationMap.put(name, paramDescription);
            } else if (!documentationMap.containsKey(name)) {
                documentationMap.put(name, paramDescription);
            }
        });
    }

    private static RefType getEnumType(TypeReferenceTypeSymbol typeReferenceTypeSymbol, Symbol symbol,
                                       Map<String, String> documentationMap,
                                       SemanticModel semanticModel, Map<String, RefType> dependentTypes,
                                       boolean isRoot) {
        RefType type;
        if (typeReferenceTypeSymbol.definition().kind().equals(SymbolKind.ENUM)) {
            List<RefType> fields = new ArrayList<>();
            ((UnionTypeSymbol) typeReferenceTypeSymbol.typeDescriptor()).memberTypeDescriptors()
                    .forEach(typeSymbol -> {
                        RefType semanticSymbol = fromSemanticSymbol(typeSymbol,
                                documentationMap, semanticModel, dependentTypes, isRoot);
                        if (semanticSymbol != null) {
                            fields.add(semanticSymbol);
                        }
                    });
            type = new RefEnumType(fields);
        } else {
            type = fromSemanticSymbol(typeReferenceTypeSymbol.typeDescriptor(),
                    documentationMap, semanticModel, dependentTypes, isRoot);
        }
        setTypeInfo(typeReferenceTypeSymbol.getName().isPresent() ? typeReferenceTypeSymbol.getName().get()
                : null, symbol, type);
        return type;
    }

    private static RefType getStreamType(StreamTypeSymbol streamSymbol, Map<String, String> documentationMap,
                                         SemanticModel semanticModel) {
        RefType leftType = fromSemanticSymbol(streamSymbol.typeParameter(), documentationMap, semanticModel);
        RefType rightType = fromSemanticSymbol(streamSymbol.completionValueTypeParameter(), documentationMap,
                semanticModel);
        return new RefStreamType(leftType, rightType);
    }

    public static void clearParentSymbols() {
        clearVisitedTypeMap();
    }

    private static void setTypeInfo(String typeName, Symbol symbol, RefType type) {
        if (type != null && symbol.getName().isPresent() && symbol.getModule().isPresent()) {
            ModuleID moduleID = symbol.getModule().get().id();
            type.typeInfo = new TypeInfo(symbol.getName().get(), moduleID.orgName(), moduleID.moduleName(),
                    null, moduleID.version());
            type.name = typeName;
        }
    }


    public String getHashCode() {
        return hashCode;
    }

    public void setHashCode(String hashCode) {
        this.hashCode = hashCode;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTypeName() {
        return typeName;
    }

    public void setTypeName(String typeName) {
        this.typeName = typeName;
    }

    public boolean isOptional() {
        return optional;
    }

    public void setOptional(boolean optional) {
        this.optional = optional;
    }

    public TypeInfo getTypeInfo() {
        return typeInfo;
    }

    public boolean isDefaultable() {
        return defaultable;
    }

    public void setDefaultable(boolean defaultable) {
        this.defaultable = defaultable;
    }

    public String getDefaultValue() {
        return defaultValue;
    }

    public Map<String, String> getDisplayAnnotation() {
        return displayAnnotation;
    }

    public String getDocumentation() {
        return documentation;
    }

    public void setDocumentation(String documentation) {
        this.documentation = documentation;
    }

    public void setRestType(boolean restType) {
        isRestType = restType;
    }

    public void setDependentTypes(Map<String, RefType> dependentTypes) {
        this.dependentTypes = dependentTypes;
    }
}
