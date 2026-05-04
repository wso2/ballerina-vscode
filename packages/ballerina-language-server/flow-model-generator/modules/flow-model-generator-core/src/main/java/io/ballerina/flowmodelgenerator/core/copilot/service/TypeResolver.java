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

package io.ballerina.flowmodelgenerator.core.copilot.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

/**
 * Shared type-resolution utilities for Copilot service loaders.
 * Strips matching package prefixes from type names and emits internal links
 * so the Copilot UI can navigate to record definitions within the same library.
 *
 * @since 1.7.0
 */
final class TypeResolver {

    private TypeResolver() {
        // Prevent instantiation
    }

    /**
     * Resolves a type name by stripping the package prefix if it matches the current library,
     * and adding internal links for each non-primitive type component.
     *
     * @param typeName the raw type name (e.g., "salesforce:ListenerConfig", "error?")
     * @param packageName the current package name (e.g., "salesforce")
     * @return JsonObject with "name" and optionally "links"
     */
    static JsonObject resolveTypeWithLinks(String typeName, String packageName) {
        JsonObject typeObj = new JsonObject();

        // Fast path for non-union types (the common case)
        if (!typeName.contains("|")) {
            String prefix = findMatchingPrefix(typeName, packageName);
            if (prefix != null) {
                String strippedName = typeName.substring(prefix.length());
                String recordName = strippedName.endsWith("?") ?
                        strippedName.substring(0, strippedName.length() - 1) : strippedName;
                typeObj.addProperty("name", strippedName);
                JsonArray links = new JsonArray();
                JsonObject link = new JsonObject();
                link.addProperty("category", "internal");
                link.addProperty("recordName", recordName);
                links.add(link);
                typeObj.add("links", links);
            } else {
                typeObj.addProperty("name", typeName);
            }
            return typeObj;
        }

        // Union type handling
        JsonArray links = new JsonArray();
        String[] parts = typeName.split("\\|");
        StringBuilder resolvedBuilder = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            String part = parts[i].trim();

            String prefix = findMatchingPrefix(part, packageName);
            if (prefix != null) {
                String strippedName = part.substring(prefix.length());
                String recordName = strippedName.endsWith("?") ?
                        strippedName.substring(0, strippedName.length() - 1) : strippedName;
                part = strippedName;

                JsonObject link = new JsonObject();
                link.addProperty("category", "internal");
                link.addProperty("recordName", recordName);
                links.add(link);
            }

            if (i > 0) {
                resolvedBuilder.append("|");
            }
            resolvedBuilder.append(part);
        }

        typeObj.addProperty("name", resolvedBuilder.toString());
        if (!links.isEmpty()) {
            typeObj.add("links", links);
        }

        return typeObj;
    }

    /**
     * Finds the matching package prefix for a type name.
     * For submodule packages (e.g., "trigger.github"), also tries the module alias
     * (e.g., "github:") since Ballerina import aliases use the last segment.
     *
     * @param typeName the type name to check
     * @param packageName the package name (e.g., "trigger.github" or "salesforce")
     * @return the matching prefix string, or null if no prefix matches
     */
    static String findMatchingPrefix(String typeName, String packageName) {
        String fullPrefix = packageName + ":";
        if (typeName.startsWith(fullPrefix)) {
            return fullPrefix;
        }
        // For submodule packages (e.g., "trigger.github"), try the module alias ("github:")
        if (packageName.contains(".")) {
            String aliasPrefix = packageName.substring(packageName.lastIndexOf('.') + 1) + ":";
            if (typeName.startsWith(aliasPrefix)) {
                return aliasPrefix;
            }
        }
        return null;
    }
}
