/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.core;

import com.google.gson.Gson;
import com.google.gson.JsonElement;
import io.ballerina.compiler.api.ModuleID;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.EnumSymbol;
import io.ballerina.compiler.api.symbols.ErrorTypeSymbol;
import io.ballerina.compiler.api.symbols.FutureTypeSymbol;
import io.ballerina.compiler.api.symbols.IntersectionTypeSymbol;
import io.ballerina.compiler.api.symbols.MapTypeSymbol;
import io.ballerina.compiler.api.symbols.ObjectTypeSymbol;
import io.ballerina.compiler.api.symbols.RecordFieldSymbol;
import io.ballerina.compiler.api.symbols.RecordTypeSymbol;
import io.ballerina.compiler.api.symbols.ServiceDeclarationSymbol;
import io.ballerina.compiler.api.symbols.StreamTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.SymbolKind;
import io.ballerina.compiler.api.symbols.TableTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeDescKind;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.compiler.syntax.tree.MetadataNode;
import io.ballerina.compiler.syntax.tree.ModulePartNode;
import io.ballerina.compiler.syntax.tree.NonTerminalNode;
import io.ballerina.compiler.syntax.tree.SyntaxKind;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.flowmodelgenerator.core.model.Codedata;
import io.ballerina.flowmodelgenerator.core.model.Member;
import io.ballerina.flowmodelgenerator.core.model.Property;
import io.ballerina.flowmodelgenerator.core.model.RecordSelectorType;
import io.ballerina.flowmodelgenerator.core.model.TypeData;
import io.ballerina.flowmodelgenerator.core.utils.SourceCodeGenerator;
import io.ballerina.flowmodelgenerator.core.utils.TypeTransformer;
import io.ballerina.flowmodelgenerator.core.utils.TypeUtils;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.tools.text.LinePosition;
import io.ballerina.tools.text.LineRange;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.eclipse.lsp4j.TextEdit;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeSet;
import java.util.stream.Collectors;

import static io.ballerina.flowmodelgenerator.core.utils.TypeTransformer.BUILT_IN_ERROR;
import static org.apache.commons.lang3.StringUtils.capitalize;

/**
 * Manage creation, retrieving and updating operations related to types.
 *
 * @since 1.0.0
 */
public class TypesManager {

    private static final Gson gson = new Gson();
    private final Module module;
    private final Document typeDocument;
    private static final List<SymbolKind> supportedSymbolKinds = List.of(SymbolKind.TYPE_DEFINITION, SymbolKind.ENUM,
            SymbolKind.CLASS, SymbolKind.TYPE);
    private static final List<SymbolKind> supportedGraphqlSymbolKinds = List.of(SymbolKind.TYPE_DEFINITION,
            SymbolKind.ENUM, SymbolKind.SERVICE_DECLARATION, SymbolKind.CLASS, SymbolKind.TYPE);

    public TypesManager(Document typeDocument) {
        this.typeDocument = typeDocument;
        this.module = typeDocument.module();
    }

    public JsonElement getAllTypes(SemanticModel semanticModel) {
        Map<String, Symbol> symbolMap = semanticModel.moduleSymbols().stream()
                .filter(s -> supportedSymbolKinds.contains(s.kind()))
                .collect(Collectors.toMap(symbol -> symbol.getName().orElse(""), symbol -> symbol));

        // Now we have all the defined types in the module scope
        // Now we need to get foreign types that we have defined members of the types
        // e.g: ballerina\time:UTC in Person record as a type of field `dateOfBirth`
        new HashMap<>(symbolMap).forEach((key, element) -> {
            if (element.kind() != SymbolKind.TYPE_DEFINITION) {
                return;
            }
            TypeSymbol typeSymbol = ((TypeDefinitionSymbol) element).typeDescriptor();
            addMemberTypes(typeSymbol, symbolMap);
        });

        List<Object> allTypes = symbolMap.values().stream().map(this::getTypeData).toList();

        return gson.toJsonTree(allTypes);
    }

    public JsonElement getGraphqlType(SemanticModel semanticModel, Document document, LinePosition linePosition) {
        NonTerminalNode node = CommonUtil.findNode(CommonUtils.toRange(linePosition), document.syntaxTree());

        Optional<Symbol> optSymbol = Optional.empty();
        // TODO: This needs to be applied for other type definitions when adding annotation support
        if (SyntaxKind.ANNOTATION == node.kind() && node.parent().kind() == SyntaxKind.METADATA) {
            MetadataNode metadata = (MetadataNode) node.parent();
            NonTerminalNode parentNode = metadata.parent();
            if (SyntaxKind.SERVICE_DECLARATION == parentNode.kind()) {
                optSymbol = semanticModel.symbol(parentNode);
            }
        } else if (SyntaxKind.MARKDOWN_DOCUMENTATION_LINE == node.kind()) {
            NonTerminalNode docNode = node.parent();
            if (docNode.kind() == SyntaxKind.MARKDOWN_DOCUMENTATION &&
                    docNode.parent().kind() == SyntaxKind.METADATA) {
                MetadataNode metadata = (MetadataNode) docNode.parent();
                NonTerminalNode parentNode = metadata.parent();
                if (SyntaxKind.SERVICE_DECLARATION == parentNode.kind()) {
                    optSymbol = semanticModel.symbol(parentNode);
                }
            }
        } else {
            optSymbol = semanticModel.symbol(document, linePosition);
        }

        if (optSymbol.isEmpty() || !supportedGraphqlSymbolKinds.contains(optSymbol.get().kind())) {
            return null;
        }

        Object type = getTypeData(optSymbol.get());

        Map<String, Object> refs = new HashMap<>();
        if (optSymbol.get().kind() == SymbolKind.SERVICE_DECLARATION) {
            addDependencyTypes((ServiceDeclarationSymbol) optSymbol.get(), refs, true);
        } else {
            TypeSymbol typeDescriptor = getTypeDescriptor(optSymbol.get());
            if (typeDescriptor != null) {
                addDependencyTypes(typeDescriptor, refs, true);
            }
        }

        return gson.toJsonTree(new TypeDataWithRefs(type, refs.values().stream().toList()));

    }

    public JsonElement getType(SemanticModel semanticModel, Document document, LinePosition linePosition) {
        Optional<Symbol> symbol = semanticModel.symbol(document, linePosition);
        if (symbol.isEmpty() || !supportedGraphqlSymbolKinds.contains(symbol.get().kind())) {
            return null;
        }

        Object type = getTypeData(symbol.get());

        Map<String, Object> refs = new HashMap<>();
        if (symbol.get().kind() == SymbolKind.SERVICE_DECLARATION) {
            addDependencyTypes((ServiceDeclarationSymbol) symbol.get(), refs, false);
        } else {
            TypeSymbol typeDescriptor = getTypeDescriptor(symbol.get());
            if (typeDescriptor != null) {
                addDependencyTypes(typeDescriptor, refs, false);
            }
        }

        return gson.toJsonTree(new TypeDataWithRefs(type, refs.values().stream().toList()));
    }

    public TypeDataWithRefs getTypeDataWithRefs(TypeDefinitionSymbol typeDefSymbol) {
        Object type = getTypeData(typeDefSymbol);
        Map<String, Object> refs = new HashMap<>();
        TypeSymbol typeDescriptor = getTypeDescriptor(typeDefSymbol);
        if (typeDescriptor != null) {
            addDependencyTypes(typeDescriptor, refs, false);
        }
        return genTypeDataRefWithoutPosition(type, refs.values().stream().toList());
    }

    /**
     * Get the record selector type for a given type symbol. This is used to populate the record selector
     * in the property view when the type of a property is a record
     *
     * @param typeSymbol the type symbol to get the record selector type for
     * @param module the module to resolve the type symbol in
     * @return the record selector type for the given type symbol, or null if the type
     * symbol is not a record or if the record selector type cannot be generated
     */
    public RecordSelectorType getRecordSelectorType(TypeSymbol typeSymbol, Module module) {
        TypeTransformer typeTransformer = new TypeTransformer(module);
        TypeData.TypeDataBuilder typeDataBuilder = new TypeData.TypeDataBuilder();
        Object transformedType = typeTransformer.transform(typeSymbol, typeDataBuilder);

        if (transformedType instanceof String typeName) {
            Map<String, Object> refs = new HashMap<>();
            addDependencyTypes(typeSymbol, refs, false);
            if (refs.isEmpty() || !refs.containsKey(typeName)) {
                return null;
            }
            transformedType = refs.get(typeName);
            typeSymbol = CommonUtil.getRawType(typeSymbol);
        }

        if (!(transformedType instanceof TypeData typeData)) {
            return null;
        }

        typeData = typeData.toBuilder()
                .name(null)
                .build();

        // Collect referenced types
        Map<String, Object> refs = new HashMap<>();
        addDependencyTypes(typeSymbol, refs, false);

        List<TypeData> result = new ArrayList<>();
        // Add referenced types
        for (Object ref : refs.values()) {
            if (ref instanceof TypeData refTypeData) {
                result.add(refTypeData);
            }
        }

        return new RecordSelectorType(typeData, result);
    }

    record ReferenceTypeInfo(String typeName, Codedata codedata) {
    }

    public static RecordSelectorType mergeWithTargetVarRecordSelectorType(RecordSelectorType source,
                                                                          RecordSelectorType target) {
        TypeData sourceRoot = source.rootType();
        TypeData targetRoot = target.rootType();

        List<Member> mergedMembers = new ArrayList<>();
        Map<String, ReferenceTypeInfo> updatedTypeNames = new HashMap<>();
        for (Member targetMember : targetRoot.members()) {
            Optional<Member> sourceMember = sourceRoot.members().stream()
                    .filter(member -> member.name().equals(targetMember.name()))
                    .findFirst();
            if (sourceMember.isPresent() && isMemberSelected(sourceMember.get(), source.referencedTypes())) {
                Member.MemberBuilder memberBuilder = targetMember.toBuilder();
                if (sourceMember.get().type() instanceof String) {
                    memberBuilder.selected(!sourceMember.get().optional() ||
                            sourceMember.get().defaultValue() != null);
                }
                String sourceMemberTypeName = typeNameFromMember(sourceMember.get());
                String targetMemberTypeName = typeNameFromMember(targetMember);
                Codedata sourceMemberCodedata = source.referencedTypes().stream()
                        .filter(typeData -> typeData.name().equals(sourceMemberTypeName))
                        .findFirst()
                        .map(TypeData::codedata)
                        .orElse(null);
                if (sourceMemberTypeName != null && !sourceMemberTypeName.equals(targetMemberTypeName)) {
                    updatedTypeNames.put(targetMemberTypeName,
                            new ReferenceTypeInfo(sourceMemberTypeName, sourceMemberCodedata));
                    memberBuilder.typeName(sourceMemberTypeName)
                            .type(sourceMember.get().type());
                }
                mergedMembers.add(memberBuilder
                        .build());
            } else {
                mergedMembers.add(targetMember);
            }
        }

        Codedata sourceCodedata = sourceRoot.codedata();

        TypeData mergedRoot = targetRoot.toBuilder()
                .members(mergedMembers)
                .codedata()
                    .from(sourceCodedata)
                .stepOut()
                .build();

        List<TypeData> referencedTypes = new ArrayList<>();
        for (TypeData targetRefType : target.referencedTypes()) {
            if (updatedTypeNames.containsKey(targetRefType.name())) {
                ReferenceTypeInfo referenceTypeInfo = updatedTypeNames.get(targetRefType.name());
                String typeName = referenceTypeInfo.typeName();
                Codedata codedata = referenceTypeInfo.codedata();
                TypeData.TypeDataBuilder typeDataBuilder = targetRefType.toBuilder()
                        .name(typeName)
                        .codedata()
                            .from(codedata)
                        .stepOut();
                Optional<TypeData> sourceRefType = source.referencedTypes().stream()
                        .filter(typeData -> typeData.name().equals(typeName))
                        .findFirst();
                if (sourceRefType.isPresent()) {
                    List<Member> mergedRefMembers = new ArrayList<>();
                    for (Member targetMember : targetRefType.members()) {
                        Optional<Member> sourceMember = sourceRefType.get().members().stream()
                                .filter(member -> member.name().equals(targetMember.name()))
                                .findFirst();
                        if (sourceMember.isPresent() &&
                                isMemberSelected(sourceMember.get(), source.referencedTypes())) {
                            mergedRefMembers.add(targetMember.toBuilder()
                                    .selected(!sourceMember.get().optional() ||
                                            sourceMember.get().defaultValue() != null)
                                    .build());
                        } else {
                            mergedRefMembers.add(targetMember);
                        }
                    }
                    typeDataBuilder.members(mergedRefMembers);
                }
                TypeData updatedReferencedType = typeDataBuilder.build();
                referencedTypes.add(updatedReferencedType);
            } else {
                referencedTypes.add(targetRefType);
            }
        }

        return new RecordSelectorType(mergedRoot, referencedTypes);
    }

    public List<TextEdit> getTextEditsForRecordSelectorTypes(RecordSelectorType recordSelectorType,
                                                             String typePrefix, boolean updateExisting) {
        TypeData rootTypeData = recordSelectorType.rootType();
        List<TypeData> referencedTypes = recordSelectorType.referencedTypes();
        if (referencedTypes == null) {
            referencedTypes = List.of();
        }

        List<TypeData> finalReferencedTypes = referencedTypes.stream().toList();
        if (rootTypeData.members() == null ||
                rootTypeData.members()
                        .stream()
                        .noneMatch(member -> isMemberSelected(member, finalReferencedTypes))) {
            return List.of();
        }

        if (rootTypeData.name() == null) {
            rootTypeData = rootTypeData.toBuilder()
                    .name(typePrefix + "Type")
                    .build();
        }

        rootTypeData = updateWithSelectedFields(rootTypeData, finalReferencedTypes);

        List<TypeData> updatedReferencedTypes = new ArrayList<>();
        List<Member> updatedMembers = new ArrayList<>(rootTypeData.members());

        for (TypeData referencedType : referencedTypes) {
            String referencedTypeName = referencedType.name();
            if (referencedTypeName == null ||
                    referencedType.members() != null &&
                            referencedType.members().stream()
                                    .allMatch(member -> isMemberSelected(member, finalReferencedTypes))) {

                continue;
            }

            Optional<Member> field = rootTypeData.members().stream()
                    .filter(member -> matchingType(member, referencedTypeName) &&
                            isMemberSelected(member, finalReferencedTypes))
                    .findFirst();
            if (field.isPresent()) {
                String newTypeName = typePrefix + capitalize(referencedTypeName) + "Type";
                TypeData updatedRefType = referencedType.toBuilder()
                        .name(newTypeName)
                        .build();
                updatedReferencedTypes.add(updatedRefType);
                TypeData typeData = field.get().getTypeAsTypeData();
                Member member;
                if (typeData == null) {
                    member = field.get().toBuilder()
                            .type(newTypeName)
                            .build();
                } else {
                    Member arrayMember = typeData.members().getFirst();
                    Member updatedArrayMember = arrayMember.toBuilder()
                            .type(newTypeName)
                            .build();
                    TypeData updatedTypeData = typeData.toBuilder()
                            .members(List.of(updatedArrayMember))
                            .build();
                    member = field.get().toBuilder()
                            .type(updatedTypeData)
                            .build();
                }
                updatedMembers.remove(field.get());
                updatedMembers.add(member);
            }
        }

        rootTypeData = rootTypeData.toBuilder()
                .members(updatedMembers)
                .build();

        referencedTypes = updatedReferencedTypes;

        referencedTypes = referencedTypes.stream()
                .map(typeData -> updateWithSelectedFields(typeData, finalReferencedTypes))
                .toList();

        List<TypeData> allTypes = new ArrayList<>();
        allTypes.add(rootTypeData);
        allTypes.addAll(referencedTypes);

        if (updateExisting) {
            List<TextEdit> textEdits = new ArrayList<>();
            for (TypeData typeData : allTypes) {
                textEdits.addAll(updateType(typeData));
            }
            return textEdits;
        }
        return createMultipleTypes(allTypes);
    }

    private static boolean isMemberSelected(Member member, List<TypeData> referencedTypes) {
        if (member.selected() || !member.optional() || member.defaultValue() != null) {
            return true;
        }

        String memberTypeName = typeNameFromMember(member);
        if (memberTypeName == null) {
            return false;
        }

        Optional<TypeData> referencedType = referencedTypes.stream()
                .filter(typeData -> memberTypeName.equals(typeData.name()))
                .findFirst();
        return referencedType.isPresent() && referencedType.get().members() != null &&
                referencedType.get().members().stream().anyMatch(m -> isMemberSelected(m, referencedTypes));
    }

    private static boolean matchingType(Member member, String typeName) {
        String memberTypeName = typeNameFromMember(member);
        return memberTypeName != null && memberTypeName.equals(typeName);
    }

    private static String typeNameFromMember(Member member) {
        Object type = member.type();
        if (type instanceof String) {
            return (String) type;
        }
        TypeData memberTypeData = member.getTypeAsTypeData();
        if (memberTypeData == null || memberTypeData.members().isEmpty()) {
            return null;
        }
        Property property = memberTypeData.properties().get(Property.IS_ARRAY_KEY);
        if (property == null || property.value() == null || !property.value().equals("true")) {
            return null;
        }
        Member arrayElement = memberTypeData.members().getFirst();
        return typeNameFromMember(arrayElement);
    }

    private TypeData updateWithSelectedFields(TypeData typeData, List<TypeData> referencedTypes) {
        List<Member> members = typeData.members();
        if (members == null || members.isEmpty()) {
            return typeData;
        }
        List<Member> updatedMembers = new ArrayList<>();
        for (Member member : members) {
            if (isMemberSelected(member, referencedTypes)) {
                updatedMembers.add(member.toBuilder()
                        .optional(false)
                        .build());
            }
        }
        return typeData.toBuilder()
                .members(updatedMembers)
                .includes(List.of())
                .build();
    }

    public JsonElement updateType(Path filePath, TypeData typeData) {
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        textEditsMap.put(filePath, updateType(typeData));
        return gson.toJsonTree(textEditsMap);
    }

    private List<TextEdit> updateType(TypeData typeData) {
        List<TextEdit> textEdits = new ArrayList<>();
        // Regenerate code snippet for the type
        SourceCodeGenerator sourceCodeGenerator = new SourceCodeGenerator();
        String codeSnippet = sourceCodeGenerator.generateCodeSnippetForType(typeData);

        SyntaxTree syntaxTree = this.typeDocument.syntaxTree();
        ModulePartNode rootNode = syntaxTree.rootNode();
        LineRange lineRange = typeData.codedata().lineRange();
        if (lineRange == null) {
            textEdits.add(new TextEdit(CommonUtils.toRange(rootNode.lineRange().endLine()), codeSnippet));
        } else {
            NonTerminalNode node = CommonUtil.findNode(CommonUtils.toRange(lineRange), syntaxTree);
            textEdits.add(new TextEdit(CommonUtils.toRange(node.lineRange()), codeSnippet));
        }
        addImportsToTextEdits(sourceCodeGenerator.getImports(), rootNode, textEdits);
        return textEdits;
    }

    public JsonElement createMultipleTypes(Path filePath, List<TypeData> typeDataList) {
        List<TextEdit> textEdits = createMultipleTypes(typeDataList);
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        textEditsMap.put(filePath, textEdits);
        return gson.toJsonTree(textEditsMap);
    }

    private List<TextEdit> createMultipleTypes(List<TypeData> typeDataList) {
        List<TextEdit> textEdits = new ArrayList<>();
        SyntaxTree syntaxTree = this.typeDocument.syntaxTree();
        ModulePartNode rootNode = syntaxTree.rootNode();

        List<String> codeSnippets = new ArrayList<>();
        for (TypeData typeData : typeDataList) {
            SourceCodeGenerator sourceCodeGenerator = new SourceCodeGenerator();
            String codeSnippet = sourceCodeGenerator.generateCodeSnippetForType(typeData);
            codeSnippets.add(codeSnippet);
            addImportsToTextEdits(sourceCodeGenerator.getImports(), rootNode, textEdits);
        }

        textEdits.add(new TextEdit(CommonUtils.toRange(rootNode.lineRange().endLine()),
                String.join(System.lineSeparator(), codeSnippets)));
        return textEdits;
    }

    public JsonElement createGraphqlClassType(Path filePath, TypeData typeData) {
        List<TextEdit> textEdits = new ArrayList<>();
        Map<Path, List<TextEdit>> textEditsMap = new HashMap<>();
        textEditsMap.put(filePath, textEdits);

        // Generate code snippet for the type
        SourceCodeGenerator sourceCodeGenerator = new SourceCodeGenerator();
        String codeSnippet = sourceCodeGenerator.generateGraphqlClassType(typeData);

        SyntaxTree syntaxTree = this.typeDocument.syntaxTree();
        ModulePartNode rootNode = syntaxTree.rootNode();
        textEdits.add(new TextEdit(CommonUtils.toRange(rootNode.lineRange().endLine()), codeSnippet));

        addImportsToTextEdits(sourceCodeGenerator.getImports(), rootNode, textEdits);

        return gson.toJsonTree(textEditsMap);
    }

    private void addMemberTypes(TypeSymbol typeSymbol, Map<String, Symbol> symbolMap) {
        // Record
        switch (typeSymbol.typeKind()) {
            case RECORD -> {
                RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) typeSymbol;

                // Type inclusions
                List<TypeSymbol> inclusions = recordTypeSymbol.typeInclusions();
                inclusions.forEach(inc -> {
                    addToMapIfForeignAndNotAdded(symbolMap, inc);
                });

                // Rest field
                Optional<TypeSymbol> restTypeDescriptor = recordTypeSymbol.restTypeDescriptor();
                if (restTypeDescriptor.isPresent()) {
                    TypeSymbol restType = restTypeDescriptor.get();
                    addToMapIfForeignAndNotAdded(symbolMap, restType);
                }

                // Field members
                Map<String, RecordFieldSymbol> fieldSymbolMap = recordTypeSymbol.fieldDescriptors();
                fieldSymbolMap.forEach((key, field) -> {
                    TypeSymbol ts = field.typeDescriptor();
                    if (ts.typeKind() == TypeDescKind.ARRAY || ts.typeKind() == TypeDescKind.UNION) {
                        addMemberTypes(ts, symbolMap);
                    } else {
                        addToMapIfForeignAndNotAdded(symbolMap, ts);
                    }
                });
            }
            case UNION -> {
                UnionTypeSymbol unionTypeSymbol = (UnionTypeSymbol) typeSymbol;
                List<TypeSymbol> unionMembers = unionTypeSymbol.memberTypeDescriptors();
                unionMembers.forEach(member -> {
                    if (member.typeKind() == TypeDescKind.ARRAY) {
                        addMemberTypes(member, symbolMap);
                    } else {
                        addToMapIfForeignAndNotAdded(symbolMap, member);
                    }
                });
            }
            case ARRAY -> {
                ArrayTypeSymbol arrayTypeSymbol = (ArrayTypeSymbol) typeSymbol;
                TypeSymbol arrMemberTypeDesc = arrayTypeSymbol.memberTypeDescriptor();
                if (arrMemberTypeDesc.typeKind() == TypeDescKind.ARRAY
                        || arrMemberTypeDesc.typeKind() == TypeDescKind.UNION) {
                    addMemberTypes(arrMemberTypeDesc, symbolMap);
                } else {
                    addToMapIfForeignAndNotAdded(symbolMap, arrMemberTypeDesc);
                }
            }
            default -> {
            }
        }
    }

    private Object getTypeData(Symbol symbol) {
        TypeTransformer typeTransformer = new TypeTransformer(this.module);
        return switch (symbol.kind()) {
            case TYPE_DEFINITION -> typeTransformer.transform((TypeDefinitionSymbol) symbol);
            case CLASS -> typeTransformer.transform((ClassSymbol) symbol);
            case ENUM -> typeTransformer.transform((EnumSymbol) symbol);
            case SERVICE_DECLARATION -> typeTransformer.transform((ServiceDeclarationSymbol) symbol);
            case TYPE -> getTypeData(((TypeReferenceTypeSymbol) symbol).definition());
            default -> null;
        };
    }

    // Get type descriptor from the symbol
    private TypeSymbol getTypeDescriptor(Symbol symbol) {
        return switch (symbol.kind()) {
            case TYPE_DEFINITION -> ((TypeDefinitionSymbol) symbol).typeDescriptor();
            case CLASS -> ((ClassSymbol) symbol);
            default -> null;
        };
    }

    private void addToMapIfForeignAndNotAdded(Map<String, Symbol> foreignSymbols, TypeSymbol type) {
        if (type.typeKind() != TypeDescKind.TYPE_REFERENCE
                || type.getName().isEmpty()
                || type.getModule().isEmpty()) {
            return;
        }

        String name = type.getName().get();

        ModuleInfo moduleInfo = ModuleInfo.from(this.module.descriptor());
        ModuleID typeModuleId = type.getModule().get().id();
        if (CommonUtils.isWithinPackage(type, moduleInfo) ||
                CommonUtils.isPredefinedLangLib(typeModuleId.orgName(), typeModuleId.packageName())) {
            return;
        }

        String typeName = TypeUtils.generateReferencedTypeId(type, moduleInfo);
        if (!foreignSymbols.containsKey(name)) {
            foreignSymbols.put(typeName, type);
        }
    }

    private void addDependencyTypes(ServiceDeclarationSymbol serviceDeclarationSymbol,
                                    Map<String, Object> references,
                                    boolean skipParameters) {
        // attributes
        if (!skipParameters) {
            serviceDeclarationSymbol.fieldDescriptors().forEach((key, field) -> {
                addDependencyTypes(field.typeDescriptor(), references, skipParameters);
            });
        }

        // methods
        serviceDeclarationSymbol.methods().forEach((key, method) -> {
            // Skipping Parameters. e.g. GraphQL service class methods
            if (!skipParameters) {
                method.typeDescriptor().params().ifPresent(params -> params.forEach(param -> {
                    addDependencyTypes(param.typeDescriptor(), references, skipParameters);
                }));
            }

            // return type
            method.typeDescriptor().returnTypeDescriptor().ifPresent(returnType -> {
                addDependencyTypes(returnType, references, skipParameters);
            });

            // rest param
            method.typeDescriptor().restParam().ifPresent(restParam -> {
                addDependencyTypes(restParam.typeDescriptor(), references, skipParameters);
            });
        });
    }

    private void addDependencyTypes(TypeSymbol typeSymbol, Map<String, Object> references, boolean skipParameters) {
        switch (typeSymbol.typeKind()) {
            case RECORD -> {
                RecordTypeSymbol recordTypeSymbol = (RecordTypeSymbol) typeSymbol;

                // type inclusions
                recordTypeSymbol.typeInclusions().forEach(includedType -> {
                    addDependencyTypes(includedType, references, skipParameters);
                });

                // members
                recordTypeSymbol.fieldDescriptors().forEach((key, field) -> {
                    addDependencyTypes(field.typeDescriptor(), references, skipParameters);
                });

                // rest member
                if (recordTypeSymbol.restTypeDescriptor().isPresent()) {
                    addDependencyTypes(recordTypeSymbol.restTypeDescriptor().get(), references, skipParameters);
                }
            }
            case ARRAY -> addDependencyTypes(
                    ((ArrayTypeSymbol) typeSymbol).memberTypeDescriptor(),
                    references,
                    skipParameters
            );
            case UNION -> ((UnionTypeSymbol) typeSymbol).userSpecifiedMemberTypes().forEach(memberType -> {
                addDependencyTypes(memberType, references, skipParameters);
            });
            case ERROR -> {
                ErrorTypeSymbol errorTypeSymbol = (ErrorTypeSymbol) typeSymbol;
                if (errorTypeSymbol.signature().equals(BUILT_IN_ERROR)) {
                    return;
                }
                addDependencyTypes((errorTypeSymbol).detailTypeDescriptor(), references, skipParameters);
            }
            case FUTURE -> {
                Optional<TypeSymbol> typeParam = ((FutureTypeSymbol) typeSymbol).typeParameter();
                if (typeParam.isEmpty()) {
                    return;
                }
                addDependencyTypes(typeParam.get(), references, skipParameters);
            }
            case MAP -> {
                TypeSymbol typeParam = ((MapTypeSymbol) typeSymbol).typeParam();
                addDependencyTypes(typeParam, references, skipParameters);
            }
            case STREAM -> {
                TypeSymbol typeParam = ((StreamTypeSymbol) typeSymbol).typeParameter();
                addDependencyTypes(typeParam, references, skipParameters);
            }
            case INTERSECTION -> ((IntersectionTypeSymbol) typeSymbol).memberTypeDescriptors().forEach(memberTypes -> {
                addDependencyTypes(memberTypes, references, skipParameters);
            });
            case TABLE -> {
                TableTypeSymbol tableTypeSymbol = (TableTypeSymbol) typeSymbol;
                addDependencyTypes(tableTypeSymbol.rowTypeParameter(), references, skipParameters);
                if (tableTypeSymbol.keyConstraintTypeParameter().isPresent()) {
                    addDependencyTypes(tableTypeSymbol.keyConstraintTypeParameter().get(), references, skipParameters);
                }
            }
            case OBJECT -> {
                ObjectTypeSymbol objectTypeSymbol = (ObjectTypeSymbol) typeSymbol;

                // inclusions
                objectTypeSymbol.typeInclusions().forEach(includedType -> {
                    addDependencyTypes(includedType, references, skipParameters);
                });

                // attributes
                objectTypeSymbol.fieldDescriptors().forEach((key, field) -> {
                    addDependencyTypes(field.typeDescriptor(), references, skipParameters);
                });

                // methods
                objectTypeSymbol.methods().forEach((key, method) -> {
                    // params - skip for GraphQL
                    if (!skipParameters) {
                        method.typeDescriptor().params().ifPresent(params -> params.forEach(param -> {
                            addDependencyTypes(param.typeDescriptor(), references, skipParameters);
                        }));
                    }

                    // return type
                    method.typeDescriptor().returnTypeDescriptor().ifPresent(returnType -> {
                        addDependencyTypes(returnType, references, skipParameters);
                    });

                    // rest param
                    method.typeDescriptor().restParam().ifPresent(restParam -> {
                        addDependencyTypes(restParam.typeDescriptor(), references, skipParameters);
                    });
                });
            }
            case FUNCTION, TUPLE -> {
                // TODO: Implement
            }
            case TYPE_REFERENCE -> {
                Symbol definition = ((TypeReferenceTypeSymbol) typeSymbol).definition();
                ModuleInfo moduleInfo = ModuleInfo.from(this.module.descriptor());
                String typeName = TypeUtils.generateReferencedTypeId(typeSymbol, moduleInfo);
                if (references.containsKey(typeName)) {
                    return;
                }
                references.putIfAbsent(typeName, getTypeData(definition));
                if (CommonUtils.isWithinPackage(definition, moduleInfo)) {
                    addDependencyTypes(
                            ((TypeReferenceTypeSymbol) typeSymbol).typeDescriptor(),
                            references,
                            skipParameters
                    );
                }
            }
            default -> {
            }
        }
    }

    private TypeDataWithRefs genTypeDataRefWithoutPosition(Object type, List<Object> refs) {
        List<Object> newRefs = new ArrayList<>();
        for (Object ref : refs) {
            if (ref instanceof TypeData) {
                newRefs.add(getTypeDataWithoutPosition((TypeData) ref));
            } else {
                newRefs.add(ref);
            }
        }

        if (type instanceof TypeData) {
            return new TypeDataWithRefs(getTypeDataWithoutPosition((TypeData) type), newRefs);
        }
        return new TypeDataWithRefs(type, newRefs);
    }

    private TypeData getTypeDataWithoutPosition(TypeData typeData) {
        Codedata codedata = typeData.codedata();
        Codedata newCodedata = getCodedataWithoutPosition(codedata);
        return new TypeData(
                typeData.name(),
                typeData.editable(),
                typeData.metadata(),
                newCodedata,
                typeData.properties(),
                typeData.members(),
                typeData.restMember(),
                typeData.includes(),
                typeData.functions(),
                typeData.annotationAttachments(),
                typeData.allowAdditionalFields()
        );
    }

    private Codedata getCodedataWithoutPosition(Codedata codedata) {
        return new Codedata(
                codedata.node(),
                codedata.org(),
                codedata.module(),
                codedata.packageName(),
                codedata.object(),
                codedata.symbol(),
                codedata.version(),
                null,
                codedata.sourceCode(),
                codedata.parentSymbol(),
                codedata.resourcePath(),
                codedata.id(),
                codedata.isNew(),
                codedata.isGenerated(),
                codedata.inferredReturnType(),
                codedata.data()
        );
    }

    private static void addImportsToTextEdits(Map<String, String> imports,
                                              ModulePartNode rootNode,
                                              List<TextEdit> textEdits) {
        TreeSet<String> importStmts = new TreeSet<>();
        imports.values().forEach(moduleId -> {
            String[] importParts = moduleId.split("/");
            String orgName = importParts[0];
            String moduleName = importParts[1].split(":")[0];
            if (!CommonUtils.importExists(rootNode, orgName, moduleName)) {
                importStmts.add(getImportStmt(orgName, moduleName));
            }
        });

        if (!importStmts.isEmpty()) {
            String importsStmts = String.join(System.lineSeparator(), importStmts);
            textEdits.addFirst(new TextEdit(CommonUtils.toRange(rootNode.lineRange().startLine()), importsStmts));
        }
    }

    private static String getImportStmt(String org, String module) {
        return String.format("%nimport %s/%s;%n", org, module);
    }

    public record TypeDataWithRefs(Object type, List<Object> refs) {

    }
}
