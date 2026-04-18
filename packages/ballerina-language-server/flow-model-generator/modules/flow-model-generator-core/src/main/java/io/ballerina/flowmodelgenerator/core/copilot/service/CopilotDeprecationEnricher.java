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
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.MethodSymbol;
import io.ballerina.compiler.api.symbols.ObjectTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.modelgenerator.commons.CommonUtils;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Applies deprecation flags to Copilot service JSON using module symbols. The SQLite
 * service-index does not store deprecation, so it is resolved from the symbols and
 * written onto the services produced by {@link ServiceLoader#loadAllServices(String)}.
 * Reads the service-type {@code name} on each index-sourced entry (e.g.
 * {@code "IssuesService"}) as a lookup key; the field is left in place so downstream
 * consumers can identify which service type each entry is.
 *
 * @since 1.7.0
 */
public final class CopilotDeprecationEnricher {

    private static final String NAME_KEY = "name";

    private CopilotDeprecationEnricher() {
        // Prevent instantiation
    }

    /**
     * Applies {@code isDeprecated: true} to services and methods whose underlying symbols
     * are {@code @deprecated}. Both arguments may be null; a null or empty
     * {@code moduleSymbols} is a no-op.
     */
    public static void enrich(JsonArray services, List<Symbol> moduleSymbols) {
        if (services == null || services.isEmpty() || moduleSymbols == null || moduleSymbols.isEmpty()) {
            return;
        }

        Set<String> wanted = new HashSet<>();
        for (JsonElement element : services) {
            JsonObject svc = element.getAsJsonObject();
            if (svc.has(NAME_KEY)) {
                wanted.add(svc.get(NAME_KEY).getAsString());
            }
        }

        Map<String, ServiceTypeDeprecation> deprecationByType =
                resolveServiceTypeDeprecations(moduleSymbols, wanted);

        for (JsonElement element : services) {
            JsonObject svc = element.getAsJsonObject();
            if (!svc.has(NAME_KEY)) {
                continue;
            }
            String serviceTypeName = svc.get(NAME_KEY).getAsString();

            ServiceTypeDeprecation deprecation = deprecationByType.get(serviceTypeName);
            if (deprecation == null) {
                continue;
            }
            if (deprecation.typeDeprecated) {
                svc.addProperty("isDeprecated", true);
            }
            if (!deprecation.deprecatedMethods.isEmpty() && svc.has("methods")) {
                markDeprecatedMethods(svc.getAsJsonArray("methods"), deprecation.deprecatedMethods);
            }
        }
    }

    private static void markDeprecatedMethods(JsonArray methods, Set<String> deprecatedNames) {
        for (JsonElement element : methods) {
            JsonObject method = element.getAsJsonObject();
            if (method.has("name") && deprecatedNames.contains(method.get("name").getAsString())) {
                method.addProperty("isDeprecated", true);
            }
        }
    }

    private static Map<String, ServiceTypeDeprecation> resolveServiceTypeDeprecations(
            List<Symbol> moduleSymbols, Set<String> wanted) {
        if (wanted.isEmpty()) {
            return Collections.emptyMap();
        }

        Map<String, ServiceTypeDeprecation> result = new HashMap<>();
        for (Symbol symbol : moduleSymbols) {
            String name = symbol.getName().orElse(null);
            if (name == null || !wanted.contains(name) || result.containsKey(name)) {
                continue;
            }

            boolean typeDeprecated;
            ObjectTypeSymbol objectType;
            if (symbol instanceof TypeDefinitionSymbol typeDef) {
                typeDeprecated = typeDef.deprecated();
                TypeSymbol raw = CommonUtils.getRawType(typeDef.typeDescriptor());
                objectType = raw instanceof ObjectTypeSymbol ots ? ots : null;
            } else if (symbol instanceof ClassSymbol classSymbol) {
                typeDeprecated = classSymbol.deprecated();
                objectType = classSymbol;
            } else {
                continue;
            }

            Set<String> deprecatedMethods = Collections.emptySet();
            if (objectType != null) {
                for (Map.Entry<String, MethodSymbol> entry : objectType.methods().entrySet()) {
                    if (entry.getValue().deprecated()) {
                        if (deprecatedMethods.isEmpty()) {
                            deprecatedMethods = new HashSet<>();
                        }
                        deprecatedMethods.add(entry.getKey());
                    }
                }
            }
            result.put(name, new ServiceTypeDeprecation(typeDeprecated, deprecatedMethods));
        }

        return result;
    }

    private record ServiceTypeDeprecation(boolean typeDeprecated, Set<String> deprecatedMethods) {
    }
}
