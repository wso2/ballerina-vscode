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

package io.ballerina.flowmodelgenerator.core;

import io.ballerina.compiler.api.symbols.ArrayTypeSymbol;
import io.ballerina.compiler.api.symbols.ModuleSymbol;
import io.ballerina.compiler.api.symbols.TypeReferenceTypeSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.compiler.api.symbols.UnionTypeSymbol;
import io.ballerina.flowmodelgenerator.core.model.TypeLink;

import java.util.List;
import java.util.Optional;

/**
 * Utility class for extracting type information from TypeSymbol instances.
 * Handles type name extraction, import statement generation, and type link creation.
 *
 * @since 1.0.1
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
     * Extracts import statements from a TypeSymbol by analyzing its module information.
     * Returns a comma-separated string of package paths (e.g., "org/package, org2/package2").
     *
     * @param typeSymbol the type symbol to extract import statements from
     * @return comma-separated package paths, or null if no module found
     */
    public static String extractImportStatements(TypeSymbol typeSymbol) {
        if (typeSymbol == null) {
            return null;
        }

        // Get the module information from the type symbol
        Optional<ModuleSymbol> moduleOpt = typeSymbol.getModule();
        if (moduleOpt.isEmpty()) {
            return null;
        }

        ModuleSymbol moduleSymbol = moduleOpt.get();

        // Get org and module name
        String org = moduleSymbol.id().orgName();
        String moduleName = moduleSymbol.id().moduleName();

        // Return the package path
        return org + "/" + moduleName;
    }

    /**
     * Extracts type links from import statements string combined with type symbol.
     *
     * @param importStatements comma-separated import statements
     * @param recordName the record name to link to
     * @param currentOrg the current package organization
     * @param currentPackage the current package name
     * @return List of TypeLink objects
     */
    public static List<TypeLink> extractTypeLinks(String importStatements,
                                                   String recordName,
                                                   String currentOrg,
                                                   String currentPackage) {
        return TypeLinkBuilder.createLinksFromImports(importStatements, recordName, currentOrg, currentPackage);
    }
}
