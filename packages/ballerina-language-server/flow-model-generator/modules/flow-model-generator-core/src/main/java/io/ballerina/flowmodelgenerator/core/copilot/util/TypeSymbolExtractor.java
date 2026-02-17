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

package io.ballerina.flowmodelgenerator.core.copilot.util;

import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.flowmodelgenerator.core.copilot.builder.TypeLinkBuilder;
import io.ballerina.flowmodelgenerator.core.copilot.model.TypeLink;

import java.util.List;
import java.util.Optional;

/**
 * Utility class for extracting type information from TypeSymbol instances.
 * Handles type name extraction, import statement generation, and type link creation.
 *
 * @since 1.7.0
 */
public class TypeSymbolExtractor {

    private TypeSymbolExtractor() {
        // Prevent instantiation
    }

    /**
     * Extracts the record name from TypeSymbol handling Union, TypeReference, Array, and basic types.
     *
     * @param typeSymbol the type symbol to extract from
     * @return the extracted type name, or empty string if null
     */
    public static String extractRecordName(TypeSymbol typeSymbol) {
        if (typeSymbol == null) {
            return "";
        }

        switch (typeSymbol.typeKind()) {
            case UNION:
                // Handle union types
                UnionTypeSymbol unionType = (UnionTypeSymbol) typeSymbol;
                List<String> memberTypes = new java.util.ArrayList<>();
                for (TypeSymbol member : unionType.memberTypeDescriptors()) {
                    memberTypes.add(extractRecordName(member));
                }
                return String.join("|", memberTypes);

            case TYPE_REFERENCE:
                // Handle type references - get the definition name from the referenced type
                TypeReferenceTypeSymbol typeRef = (TypeReferenceTypeSymbol) typeSymbol;
                return typeRef.definition().getName()
                        .or(() -> typeRef.typeDescriptor().getName())
                        .orElse(typeSymbol.typeKind().getName());

            case ARRAY:
                // Handle array types - recursively get the member type name
                ArrayTypeSymbol arrayType = (ArrayTypeSymbol) typeSymbol;
                return extractRecordName(arrayType.memberTypeDescriptor()) + "[]";

            default:
                // For other types, use getName() directly
                return typeSymbol.getName().orElse(typeSymbol.signature());
        }
    }

    /**
     * Extracts type links directly from a TypeSymbol, properly handling union types
     * by processing each member separately with its own module information.
     *
     * @param typeSymbol the type symbol to extract links from
     * @param currentOrg the current package organization
     * @param currentPackage the current package name
     * @return List of TypeLink objects, one for each type in the union (if applicable)
     */
    public static List<TypeLink> extractTypeLinksFromSymbol(TypeSymbol typeSymbol,
                                                             String currentOrg,
                                                             String currentPackage) {
        List<TypeLink> allLinks = new java.util.ArrayList<>();

        if (typeSymbol == null) {
            return allLinks;
        }

        switch (typeSymbol.typeKind()) {
            case UNION:
                // Handle union types by processing each member separately
                UnionTypeSymbol unionType = (UnionTypeSymbol) typeSymbol;
                for (TypeSymbol member : unionType.memberTypeDescriptors()) {
                    // Recursively extract links for each member
                    List<TypeLink> memberLinks = extractTypeLinksFromSymbol(member, currentOrg, currentPackage);
                    allLinks.addAll(memberLinks);
                }
                break;

            case TYPE_REFERENCE:
                // Handle type references - extract module and create link
                TypeReferenceTypeSymbol typeRef = (TypeReferenceTypeSymbol) typeSymbol;
                String recordName = typeRef.definition().getName()
                        .or(() -> typeRef.typeDescriptor().getName())
                        .orElse(typeSymbol.typeKind().getName());

                Optional<ModuleSymbol> moduleOpt = typeSymbol.getModule();
                if (moduleOpt.isPresent()) {
                    ModuleSymbol moduleSymbol = moduleOpt.get();
                    String org = moduleSymbol.id().orgName();
                    String moduleName = moduleSymbol.id().moduleName();
                    String importStatements = org + "/" + moduleName;

                    List<TypeLink> links = TypeLinkBuilder.createLinksFromImports(
                            importStatements, recordName, currentOrg, currentPackage);
                    allLinks.addAll(links);
                } else if (recordName != null && !recordName.isEmpty()) {
                    // No module - assume internal type
                    allLinks.addAll(TypeLinkBuilder.createInternalLinks(recordName));
                }
                break;

            case ARRAY:
                // Handle array types - recursively process the member type
                ArrayTypeSymbol arrayType = (ArrayTypeSymbol) typeSymbol;
                allLinks.addAll(extractTypeLinksFromSymbol(
                        arrayType.memberTypeDescriptor(), currentOrg, currentPackage));
                break;

            default:
                // For other types, no links needed (primitives, etc.)
                break;
        }

        return allLinks;
    }
}
