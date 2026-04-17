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
import io.ballerina.modelgenerator.commons.FunctionData;
import io.ballerina.modelgenerator.commons.ParameterData;
import io.ballerina.modelgenerator.commons.ServiceDatabaseManager;
import io.ballerina.modelgenerator.commons.ServiceTypeFunction;

import java.util.LinkedHashMap;
import java.util.List;
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
     *
     * @param libraryName the library name (e.g., "ballerinax/kafka")
     * @return JsonArray containing services, or empty array if not covered or on failure
     */
    static JsonArray loadFromServiceIndex(String libraryName) {
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

            for (String serviceTypeName : serviceTypes) {
                JsonObject svc = new JsonObject();
                svc.addProperty("type", "fixed");
                svc.add("listener", listenerJson);

                JsonArray methods = buildMethodsFromDb(db, packageId, serviceTypeName, packageName);
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
                                                 String serviceTypeName, String packageName) {
        JsonArray methods = new JsonArray();

        List<ServiceTypeFunction> functions = db.getMatchingServiceTypeFunctions(packageId, serviceTypeName);

        for (ServiceTypeFunction fn : functions) {
            JsonObject method = new JsonObject();

            // Method name
            if (fn.name() != null && !fn.name().isEmpty()) {
                method.addProperty("name", fn.name());
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
