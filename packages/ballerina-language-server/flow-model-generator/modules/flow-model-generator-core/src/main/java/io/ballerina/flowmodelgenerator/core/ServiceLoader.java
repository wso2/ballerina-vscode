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

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Service loader for loading library service definitions.
 * Handles loading from inbuilt-triggers and generic-services JSON files.
 *
 * @since 1.0.1
 */
public class ServiceLoader {

    private static final String GENERIC_SERVICES_JSON_PATH = "/copilot/generic-services.json";

    private ServiceLoader() {
        // Prevent instantiation
    }

    /**
     * Loads all services for a given library from both inbuilt triggers and generic services.
     *
     * @param libraryName the library name (e.g., "ballerina/http", "ballerinax/kafka")
     * @return JsonArray containing all services for this library
     */
    public static JsonArray loadAllServices(String libraryName) {
        JsonArray services = new JsonArray();

        // Load from inbuilt triggers
        JsonArray triggerServices = loadFromInbuiltTriggers(libraryName);
        triggerServices.forEach(services::add);

        // Load from generic services
        JsonArray genericServices = loadFromGenericServices(libraryName);
        genericServices.forEach(services::add);

        return services;
    }

    /**
     * Loads services from inbuilt-triggers JSON files.
     * These JSON files contain service definitions with listener and function information.
     *
     * @param libraryName the library name (e.g., "ballerinax/kafka")
     * @return JsonArray containing services, or empty array if not found
     */
    private static JsonArray loadFromInbuiltTriggers(String libraryName) {
        JsonArray services = new JsonArray();

        // Map library names to inbuilt-triggers file names
        String triggerFileName = getInbuiltTriggerFileName(libraryName);
        if (triggerFileName == null) {
            return services; // No inbuilt trigger for this library
        }

        try (InputStream inputStream = ServiceLoader.class.getResourceAsStream("/inbuilt-triggers/" +
                triggerFileName)) {
            if (inputStream == null) {
                return services; // File not found
            }

            try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {

                JsonObject triggerData = JsonParser.parseReader(reader).getAsJsonObject();

                // Extract listener information
                JsonObject listener = triggerData.getAsJsonObject("listener");
                if (listener == null) {
                    return services;
                }

                // Extract service types
                JsonArray serviceTypes = triggerData.getAsJsonArray("serviceTypes");
                if (serviceTypes == null || serviceTypes.isEmpty()) {
                    return services;
                }

                // For each service type, create a service object
                for (JsonElement serviceTypeElement : serviceTypes) {
                    JsonObject serviceType = serviceTypeElement.getAsJsonObject();

                    JsonObject serviceObj = new JsonObject();

                    // Service type: "fixed" for specific listeners
                    serviceObj.addProperty("type", "fixed");

                    // Build listener object
                    JsonObject listenerObj = buildListenerFromTriggerData(listener);
                    serviceObj.add("listener", listenerObj);

                    // Extract functions from service type and add as methods for fixed services
                    JsonArray functionsFromService = serviceType.getAsJsonArray("functions");
                    if (functionsFromService != null && !functionsFromService.isEmpty()) {
                        JsonArray transformedMethods = new JsonArray();
                        for (JsonElement funcElement : functionsFromService) {
                            JsonObject func = funcElement.getAsJsonObject();
                            JsonObject transformedMethod = transformServiceMethod(func);
                            transformedMethods.add(transformedMethod);
                        }
                        serviceObj.add("methods", transformedMethods);
                    }

                    services.add(serviceObj);
                }

            }
        } catch (IOException e) {
            // If file doesn't exist or cannot be read, return empty array
            return services;
        }

        return services;
    }

    /**
     * Loads generic services for a specific library from the generic-services.json file.
     *
     * @param libraryName the library name (e.g., "ballerina/http")
     * @return JsonArray containing services for this library, or empty array if not found
     */
    private static JsonArray loadFromGenericServices(String libraryName) {
        JsonArray matchingServices = new JsonArray();

        try (InputStream inputStream = ServiceLoader.class.getResourceAsStream(GENERIC_SERVICES_JSON_PATH)) {
            if (inputStream == null) {
                return matchingServices; // File not found, return empty array
            }

            try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {
                JsonObject genericServicesData = JsonParser.parseReader(reader).getAsJsonObject();

                // Get the services array
                JsonArray allServices = genericServicesData.getAsJsonArray("services");
                if (allServices == null || allServices.isEmpty()) {
                    return matchingServices;
                }

                // Filter services by library name
                for (JsonElement serviceElement : allServices) {
                    JsonObject service = serviceElement.getAsJsonObject();

                    // Check if this service belongs to the requested library
                    if (service.has("libraryName") &&
                        service.get("libraryName").getAsString().equals(libraryName)) {

                        // Create a copy of the service without the libraryName field
                        JsonObject serviceObj = new JsonObject();
                        serviceObj.addProperty("type", service.get("type").getAsString());
                        serviceObj.addProperty("instructions", service.get("instructions").getAsString());

                        // Copy listener object
                        if (service.has("listener")) {
                            serviceObj.add("listener", service.get("listener"));
                        }

                        matchingServices.add(serviceObj);
                    }
                }
            }
        } catch (IOException e) {
            // If file doesn't exist or cannot be read, return empty array
            return matchingServices;
        }

        return matchingServices;
    }

    /**
     * Maps library names to inbuilt-trigger file names.
     *
     * @param libraryName the library name (e.g., "ballerinax/kafka")
     * @return the trigger file name (e.g., "kafka.json") or null if not a trigger library
     */
    private static String getInbuiltTriggerFileName(String libraryName) {
        // Remove org prefix if present
        String packageName = libraryName.contains("/") ?
                libraryName.substring(libraryName.indexOf("/") + 1) : libraryName;

        // Map known trigger libraries to their JSON file names
        return switch (packageName) {
            case "kafka" -> "kafka.json";
            case "asb" -> "asb.json";
            case "jms" -> "jms.json";
            case "rabbitmq" -> "rabbitmq.json";
            case "nats" -> "nats.json";
            case "ftp" -> "ftp.json";
            case "mqtt" -> "mqtt.json";
            case "salesforce" -> "salesforce.json";
            case "trigger.github", "github" -> "github.json";
            default -> null;
        };
    }

    /**
     * Builds a listener object from inbuilt-triggers listener data.
     *
     * @param listenerData the listener JSON object from triggers file
     * @return JsonObject representing the listener
     */
    private static JsonObject buildListenerFromTriggerData(JsonObject listenerData) {
        JsonObject listenerObj = new JsonObject();

        // Get listener name from valueTypeConstraint
        String listenerName = listenerData.has("valueTypeConstraint") ?
                listenerData.get("valueTypeConstraint").getAsString() : "Listener";
        listenerObj.addProperty("name", listenerName);

        // Extract parameters from listener properties
        JsonArray parametersArray = new JsonArray();
        if (listenerData.has("properties")) {
            JsonObject properties = listenerData.getAsJsonObject("properties");
            for (String propKey : properties.keySet()) {
                JsonObject prop = properties.getAsJsonObject(propKey);
                JsonObject paramObj = buildParameterFromProperty(propKey, prop);
                parametersArray.add(paramObj);
            }
        }

        listenerObj.add("parameters", parametersArray);
        return listenerObj;
    }

    /**
     * Builds a parameter object from a listener property.
     *
     * @param propertyName the property name
     * @param property the property JSON object
     * @return JsonObject representing the parameter
     */
    private static JsonObject buildParameterFromProperty(String propertyName, JsonObject property) {
        JsonObject paramObj = new JsonObject();

        // Parameter name
        paramObj.addProperty("name", propertyName);

        // Parameter description from metadata
        String description = "";
        if (property.has("metadata")) {
            JsonObject metadata = property.getAsJsonObject("metadata");
            if (metadata.has("description")) {
                description = metadata.get("description").getAsString();
            }
        }
        paramObj.addProperty("description", description);

        // Parameter type
        JsonObject typeObj = new JsonObject();
        String typeName = property.has("valueTypeConstraint") ?
                property.get("valueTypeConstraint").getAsString() : "string";
        typeObj.addProperty("name", typeName);
        paramObj.add("type", typeObj);

        // Default value if present
        if (property.has("placeholder") && !property.get("placeholder").isJsonNull()) {
            paramObj.addProperty("default", property.get("placeholder").getAsString());
        }

        return paramObj;
    }

    /**
     * Transforms a service function from trigger data to a service method format.
     * Service methods don't include the name field (unlike LibraryFunction).
     *
     * @param functionData the function JSON object from triggers file
     * @return JsonObject representing the transformed service method
     */
    private static JsonObject transformServiceMethod(JsonObject functionData) {
        JsonObject method = new JsonObject();

        // Determine method type
        String methodType = "remote";
        if (functionData.has("qualifiers")) {
            JsonArray qualifiers = functionData.getAsJsonArray("qualifiers");
            if (qualifiers != null && !qualifiers.isEmpty()) {
                String qualifier = qualifiers.get(0).getAsString();
                methodType = qualifier.equals("resource") ? "resource" : "remote";
            }
        }
        method.addProperty("type", methodType);

        // Method documentation
        if (functionData.has("documentation")) {
            method.addProperty("description", functionData.get("documentation").getAsString());
        }

        // Parameters
        if (functionData.has("parameters")) {
            JsonArray parameters = functionData.getAsJsonArray("parameters");
            JsonArray transformedParams = new JsonArray();
            for (JsonElement paramElement : parameters) {
                JsonObject param = paramElement.getAsJsonObject();
                JsonObject transformedParam = new JsonObject();

                // Parameter name
                if (param.has("name")) {
                    transformedParam.addProperty("name", param.get("name").getAsString());
                }

                // Parameter description
                if (param.has("documentation")) {
                    transformedParam.addProperty("description", param.get("documentation").getAsString());
                }

                // Parameter type
                JsonObject typeObj = new JsonObject();
                if (param.has("type")) {
                    JsonElement typeElement = param.get("type");
                    if (typeElement.isJsonArray()) {
                        // If type is an array, get the first element (or default type)
                        JsonArray typeArray = typeElement.getAsJsonArray();
                        if (!typeArray.isEmpty()) {
                            typeObj.addProperty("name", typeArray.get(0).getAsString());
                        }
                    } else {
                        typeObj.addProperty("name", typeElement.getAsString());
                    }
                } else if (param.has("typeName")) {
                    typeObj.addProperty("name", param.get("typeName").getAsString());
                }
                transformedParam.add("type", typeObj);

                // Optional flag
                if (param.has("optional")) {
                    transformedParam.addProperty("optional", param.get("optional").getAsBoolean());
                }

                transformedParams.add(transformedParam);
            }
            method.add("parameters", transformedParams);
        }

        // Return type
        if (functionData.has("returnType")) {
            JsonObject returnTypeData = functionData.getAsJsonObject("returnType");
            JsonObject returnObj = new JsonObject();
            JsonObject returnTypeObj = new JsonObject();

            if (returnTypeData.has("typeName")) {
                returnTypeObj.addProperty("name", returnTypeData.get("typeName").getAsString());
            } else if (returnTypeData.has("type")) {
                JsonElement typeElement = returnTypeData.get("type");
                if (typeElement.isJsonArray()) {
                    JsonArray typeArray = typeElement.getAsJsonArray();
                    if (!typeArray.isEmpty()) {
                        returnTypeObj.addProperty("name", typeArray.get(0).getAsString());
                    }
                } else {
                    returnTypeObj.addProperty("name", typeElement.getAsString());
                }
            }
            returnObj.add("type", returnTypeObj);
            method.add("return", returnObj);
        }

        return method;
    }
}
