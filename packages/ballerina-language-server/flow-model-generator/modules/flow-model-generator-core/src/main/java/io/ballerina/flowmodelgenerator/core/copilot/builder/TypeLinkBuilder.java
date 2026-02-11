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

package io.ballerina.flowmodelgenerator.core.copilot.builder;

import io.ballerina.flowmodelgenerator.core.copilot.model.TypeLink;

import java.util.ArrayList;
import java.util.List;

/**
 * Builder class for creating TypeLink objects.
 * Handles union types and internal/external categorization.
 *
 * @since 1.6.0
 */
public class TypeLinkBuilder {

    private TypeLinkBuilder() {
        // Prevent instantiation
    }

    /**
     * Creates internal type links for the given record name.
     * Handles union types by splitting on "|" and creating separate links.
     *
     * @param recordName the record name (may contain union types like "TypeA|TypeB")
     * @return list of internal TypeLink objects
     */
    public static List<TypeLink> createInternalLinks(String recordName) {
        List<TypeLink> links = new ArrayList<>();

        if (recordName == null || recordName.isEmpty()) {
            return links;
        }

        // Split by "|" to handle union types
        String[] typeNames = recordName.split("\\|");
        for (String typeName : typeNames) {
            String trimmedName = typeName.trim();
            if (!trimmedName.isEmpty()) {
                TypeLink link = new TypeLink();
                link.setCategory("internal");
                link.setRecordName(trimmedName);
                links.add(link);
            }
        }

        return links;
    }

    /**
     * Creates type links from import statements.
     * Handles union types and determines internal/external category for each type.
     *
     * @param importStatements comma-separated import statements
     * @param recordName the record name (may contain union types like "TypeA|TypeB")
     * @param currentOrg the current package organization
     * @param currentPackage the current package name
     * @return list of TypeLink objects with appropriate categories and library names
     */
    public static List<TypeLink> createLinksFromImports(String importStatements,
                                                         String recordName,
                                                         String currentOrg,
                                                         String currentPackage) {
        List<TypeLink> links = new ArrayList<>();

        if (importStatements == null || importStatements.trim().isEmpty()) {
            return links;
        }

        // Split recordName by "|" to handle union types
        String[] recordNames = recordName != null ? recordName.split("\\|") : new String[]{null};

        // Split by comma to get individual import statements
        String[] imports = importStatements.split(",");
        for (String importStmt : imports) {
            String packagePath = importStmt.trim();

            if (packagePath.isEmpty()) {
                continue;
            }

            // Handle "as alias" part if present
            int asIndex = packagePath.indexOf(" as ");
            if (asIndex > 0) {
                packagePath = packagePath.substring(0, asIndex).trim();
            }

            String[] parts = packagePath.split("/");
            if (parts.length >= 2) {
                String org = parts[0];
                String pkgName = parts[1];

                // Skip predefined lang libs
                if (isPredefinedLangLib(org, pkgName)) {
                    continue;
                }

                // Determine if it's internal or external
                boolean isInternal = org.equals(currentOrg) && pkgName.equals(currentPackage);
                String category = isInternal ? "internal" : "external";
                String libraryName = isInternal ? null : org + "/" + pkgName;

                // Create a separate link for each type in the union
                for (String singleRecordName : recordNames) {
                    String trimmedName = singleRecordName.trim();
                    if (!trimmedName.isEmpty()) {
                        TypeLink link = new TypeLink(category, trimmedName, libraryName);
                        links.add(link);
                    }
                }
            }
        }

        return links;
    }

    /**
     * Filters links to only include internal or external categories.
     *
     * @param links the list of links to filter
     * @return filtered list containing only internal or external links
     */
    public static List<TypeLink> filterInternalExternal(List<TypeLink> links) {
        if (links == null || links.isEmpty()) {
            return new ArrayList<>();
        }

        return links.stream()
                .filter(link -> "internal".equals(link.getCategory()) ||
                              "external".equals(link.getCategory()))
                .toList();
    }

    /**
     * Checks if a module is a predefined language library.
     *
     * @param orgName the organization name
     * @param packageName the package name
     * @return true if it's a predefined lang lib, false otherwise
     */
    private static boolean isPredefinedLangLib(String orgName, String packageName) {
        return "ballerina".equals(orgName) &&
               packageName.startsWith("lang.") &&
               !packageName.equals("lang.annotations");
    }
}
