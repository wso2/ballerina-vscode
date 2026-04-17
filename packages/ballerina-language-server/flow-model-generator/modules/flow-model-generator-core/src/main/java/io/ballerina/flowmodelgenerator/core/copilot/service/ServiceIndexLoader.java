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
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.api.symbols.ClassSymbol;
import io.ballerina.compiler.api.symbols.MethodSymbol;
import io.ballerina.compiler.api.symbols.ObjectTypeSymbol;
import io.ballerina.compiler.api.symbols.Symbol;
import io.ballerina.compiler.api.symbols.TypeDefinitionSymbol;
import io.ballerina.compiler.api.symbols.TypeSymbol;
import io.ballerina.modelgenerator.commons.CommonUtils;
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.modelgenerator.commons.ServiceTypeFunction;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.logging.Logger;

/**
 * Loads Copilot service descriptors from the service-index.sqlite database
 * (built from service_artifacts.json) as a replacement for the inbuilt-triggers JSON files.
 *
 * @since 1.7.0
 */
class ServiceIndexLoader {

    private static final Logger LOGGER = Logger.getLogger(ServiceIndexLoader.class.getName());

    static final Set<String> COVERED = Set.of(
            "kafka", "asb", "rabbitmq", "ftp", "mqtt", "salesforce", "trigger.github");

    private static final Set<ParameterData.Kind> LISTENER_PARAM_KINDS = Set.of(
            ParameterData.Kind.REQUIRED,
            ParameterData.Kind.DEFAULTABLE,
            ParameterData.Kind.INCLUDED_RECORD,
            ParameterData.Kind.REST_PARAMETER);

    private ServiceIndexLoader() {
        // Prevent instantiation
    }

    /**
     * Loads services from the service-index.sqlite database for the given library.
     * Produces the same JSON shape as {@link ServiceLoader#loadAllServices} for migration parity.
     * When a non-null {@code semanticModel} is supplied, deprecation flags for the service type
     * and its methods are looked up live; the SQLite index does not carry this information.
     *
     * @param libraryName   the library name (e.g., "ballerinax/kafka")
     * @param semanticModel semantic model of the library package, or {@code null} to skip enrichment
     * @return JsonArray containing services, or empty array if not covered or on failure
     */
    static JsonArray loadFromServiceIndex(String libraryName, SemanticModel semanticModel) {
        JsonArray services = new JsonArray();

        String packageName = stripOrg(libraryName);
        if (!COVERED.contains(packageName)) {
            return services;
        }

        String org = libraryName.contains("/")
                ? libraryName.substring(0, libraryName.indexOf('/'))
                : "ballerinax";

        try {
            ServiceDatabaseManager db = ServiceDatabaseManager.getInstance();

            Optional<FunctionData> listenerOpt = db.getListener(org, packageName);
            if (listenerOpt.isEmpty()) {
                LOGGER.warning("No listener found in service-index for: " + libraryName);
                return services;
            }

            FunctionData listenerData = listenerOpt.get();
            int listenerId = listenerData.functionId();
            int packageId = Integer.parseInt(listenerData.packageId());

            JsonObject listenerJson = buildListenerFromDb(db, packageName, listenerId);

            List<String> serviceTypes = db.getServiceTypes(packageId);

            if (serviceTypes.isEmpty()) {
                // No service types: emit single entry with just listener, no methods
                JsonObject svc = new JsonObject();
                svc.addProperty("type", "fixed");
                svc.add("listener", listenerJson);
                services.add(svc);
                return services;
            }

            Map<String, ServiceTypeDeprecation> deprecationByType =
                    resolveServiceTypeDeprecations(semanticModel, serviceTypes);

            for (String serviceTypeName : serviceTypes) {
                JsonObject svc = new JsonObject();
                svc.addProperty("type", "fixed");
                svc.add("listener", listenerJson);

                ServiceTypeDeprecation deprecation = deprecationByType.getOrDefault(
                        serviceTypeName, ServiceTypeDeprecation.EMPTY);
                if (deprecation.typeDeprecated) {
                    svc.addProperty("isDeprecated", true);
                }

                JsonArray methods = buildMethodsFromDb(db, packageId, serviceTypeName, packageName,
                        deprecation.deprecatedMethods);
                if (!methods.isEmpty()) {
                    svc.add("methods", methods);
                }

                services.add(svc);
            }
        } catch (RuntimeException e) {
            LOGGER.warning("Failed to load services from service-index for " + libraryName
                    + ": " + e.getMessage());
            return new JsonArray();
        }

        return services;
    }

    private static JsonObject buildListenerFromDb(ServiceDatabaseManager db, String packageName,
                                                   int listenerId) {
        JsonObject listenerObj = new JsonObject();
        listenerObj.addProperty("name", getAlias(packageName) + ":Listener");

        JsonArray parametersArray = new JsonArray();
        LinkedHashMap<String, ParameterData> params = db.getFunctionParametersAsMap(listenerId);

        for (ParameterData param : params.values()) {
            // Filter: only top-level params, not flattened included-record fields
            if (!LISTENER_PARAM_KINDS.contains(param.kind())) {
                continue;
            }

            JsonObject paramObj = new JsonObject();
            paramObj.addProperty("name", param.name());
            paramObj.addProperty("description", param.description() != null ? param.description() : "");

            String typeStr = param.type() != null ? param.type() : "";
            paramObj.add("type", TypeResolver.resolveTypeWithLinks(typeStr, packageName));

            if (param.optional()) {
                paramObj.addProperty("optional", true);
            }

            // Use placeholder as "default" (matching how the old path maps placeholder → default)
            if (param.placeholder() != null && !param.placeholder().isEmpty()) {
                paramObj.addProperty("default", param.placeholder());
            }

            parametersArray.add(paramObj);
        }

        listenerObj.add("parameters", parametersArray);
        return listenerObj;
    }

    private static JsonArray buildMethodsFromDb(ServiceDatabaseManager db, int packageId,
                                                 String serviceTypeName, String packageName,
                                                 Set<String> deprecatedMethods) {
        JsonArray methods = new JsonArray();

        List<ServiceTypeFunction> functions = db.getMatchingServiceTypeFunctions(packageId, serviceTypeName);

        for (ServiceTypeFunction fn : functions) {
            JsonObject method = new JsonObject();

            // Method name
            if (fn.name() != null && !fn.name().isEmpty()) {
                method.addProperty("name", fn.name());
            }

            if (fn.name() != null && deprecatedMethods.contains(fn.name())) {
                method.addProperty("isDeprecated", true);
            }

            // Map kind to lowercase type
            String methodType = "RESOURCE".equalsIgnoreCase(fn.kind()) ? "resource" : "remote";
            method.addProperty("type", methodType);

            if (fn.description() != null && !fn.description().isEmpty()) {
                method.addProperty("description", fn.description());
            }

            // Parameters
            if (fn.parameters() != null && !fn.parameters().isEmpty()) {
                JsonArray paramsArray = new JsonArray();
                for (ServiceTypeFunction.ServiceTypeFunctionParameter p : fn.parameters()) {
                    JsonObject paramObj = new JsonObject();
                    paramObj.addProperty("name", p.name());

                    if (p.description() != null && !p.description().isEmpty()) {
                        paramObj.addProperty("description", p.description());
                    }

                    String typeStr = p.type() != null ? p.type() : "";
                    paramObj.add("type", TypeResolver.resolveTypeWithLinks(typeStr, packageName));

                    // Map kind to optional flag
                    if ("OPTIONAL".equalsIgnoreCase(p.kind()) || "DEFAULTABLE".equalsIgnoreCase(p.kind())) {
                        paramObj.addProperty("optional", true);
                    }

                    paramsArray.add(paramObj);
                }
                method.add("parameters", paramsArray);
            }

            // Return type
            if (fn.returnType() != null && !fn.returnType().isEmpty()) {
                String canonicalized = canonicalizeReturnType(fn.returnType());
                JsonObject returnObj = new JsonObject();
                returnObj.add("type", TypeResolver.resolveTypeWithLinks(canonicalized, packageName));
                method.add("return", returnObj);
            }

            methods.add(method);
        }

        return methods;
    }

    /**
     * Canonicalizes return type signatures from the DB.
     * Converts union forms with nil (e.g., "error|()") to the shorthand nullable form ("error?").
     *
     * @param signature the raw return type string from the DB
     * @return the canonicalized form
     */
    static String canonicalizeReturnType(String signature) {
        if (signature == null || signature.isEmpty()) {
            return "";
        }

        String trimmed = signature.trim();

        // Already in canonical form
        if (!trimmed.contains("()")) {
            return trimmed;
        }

        String[] parts = trimmed.split("\\|");
        StringBuilder nonNilParts = new StringBuilder();
        boolean hadNil = false;
        int count = 0;

        for (String part : parts) {
            String p = part.trim();
            if ("()".equals(p)) {
                hadNil = true;
            } else {
                if (count > 0) {
                    nonNilParts.append("|");
                }
                nonNilParts.append(p);
                count++;
            }
        }

        if (!hadNil) {
            return trimmed;
        }

        String result = nonNilParts.toString();
        if (result.isEmpty()) {
            return "()";
        }

        // Append ? if not already suffixed
        if (!result.endsWith("?")) {
            result = result + "?";
        }

        return result;
    }

    /**
     * Resolves deprecation info for every service type in one pass over the module symbols.
     * The service-index SQLite does not store deprecation, so it is read live from the
     * {@link SemanticModel}. Returns an empty map when no enrichment is possible.
     */
    private static Map<String, ServiceTypeDeprecation> resolveServiceTypeDeprecations(
            SemanticModel semanticModel, List<String> serviceTypeNames) {
        if (semanticModel == null || serviceTypeNames == null || serviceTypeNames.isEmpty()) {
            return Collections.emptyMap();
        }

        Set<String> wanted = new HashSet<>(serviceTypeNames);
        Map<String, ServiceTypeDeprecation> result = new HashMap<>();

        for (Symbol symbol : semanticModel.moduleSymbols()) {
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
        static final ServiceTypeDeprecation EMPTY = new ServiceTypeDeprecation(false, Collections.emptySet());
    }

    static String stripOrg(String libraryName) {
        int idx = libraryName.indexOf('/');
        return idx >= 0 ? libraryName.substring(idx + 1) : libraryName;
    }

    private static String getAlias(String packageName) {
        if (packageName.contains(".")) {
            return packageName.substring(packageName.lastIndexOf('.') + 1);
        }
        return packageName;
    }
}
