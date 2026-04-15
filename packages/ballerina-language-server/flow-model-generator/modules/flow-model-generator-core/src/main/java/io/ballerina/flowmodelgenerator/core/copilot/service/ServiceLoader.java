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
import com.google.gson.JsonParser;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.logging.Logger;

/**
 * Service loader for loading library service definitions.
 * Loads trigger services from service-index.sqlite and generic services from generic-services.json.
 *
 * @since 1.7.0
 */
public class ServiceLoader {

    private static final Logger LOGGER = Logger.getLogger(ServiceLoader.class.getName());
    private static final String GENERIC_SERVICES_JSON_PATH = "/copilot/generic-services.json";

    // Lazily cached generic services keyed by library name
    private static volatile Map<String, JsonArray> genericServicesCache;

    private ServiceLoader() {
        // Prevent instantiation
    }

    /**
     * Loads all services for a given library from the service-index DB and generic services.
     *
     * @param libraryName the library name (e.g., "ballerina/http", "ballerinax/kafka")
     * @return JsonArray containing all services for this library
     */
    public static JsonArray loadAllServices(String libraryName) {
        JsonArray services = new JsonArray();
        ServiceIndexLoader.loadFromServiceIndex(libraryName).forEach(services::add);
        getGenericServices(libraryName).forEach(services::add);
        return services;
    }

    /**
     * Returns cached generic services for a specific library from the generic-services.json resource.
     *
     * @param libraryName the library name (e.g., "ballerina/http")
     * @return JsonArray containing services for this library, or empty array if not found
     */
    private static JsonArray getGenericServices(String libraryName) {
        Map<String, JsonArray> cache = genericServicesCache;
        if (cache == null) {
            synchronized (ServiceLoader.class) {
                cache = genericServicesCache;
                if (cache == null) {
                    cache = loadGenericServicesMap();
                    genericServicesCache = cache;
                }
            }
        }
        return cache.getOrDefault(libraryName, new JsonArray());
    }

    /**
     * Parses generic-services.json once and indexes entries by library name.
     */
    private static Map<String, JsonArray> loadGenericServicesMap() {
        Map<String, JsonArray> map = new HashMap<>();

        try (InputStream inputStream = ServiceLoader.class.getResourceAsStream(GENERIC_SERVICES_JSON_PATH)) {
            if (inputStream == null) {
                LOGGER.warning("Generic services resource not found: " + GENERIC_SERVICES_JSON_PATH);
                return map;
            }

            try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {
                JsonObject genericServicesData = JsonParser.parseReader(reader).getAsJsonObject();

                JsonArray allServices = genericServicesData.getAsJsonArray("services");
                if (allServices == null || allServices.isEmpty()) {
                    return map;
                }

                for (JsonElement serviceElement : allServices) {
                    JsonObject service = serviceElement.getAsJsonObject();

                    if (service.has("libraryName")) {
                        String libName = service.get("libraryName").getAsString();

                        JsonObject serviceObj = new JsonObject();
                        serviceObj.addProperty("type", service.get("type").getAsString());
                        serviceObj.addProperty("instructions", service.get("instructions").getAsString());

                        if (service.has("listener")) {
                            serviceObj.add("listener", service.get("listener"));
                        }

                        map.computeIfAbsent(libName, k -> new JsonArray()).add(serviceObj);
                    }
                }
            }
        } catch (IOException e) {
            LOGGER.warning("Failed to load generic services: " + e.getMessage());
        }

        return map;
    }
}
