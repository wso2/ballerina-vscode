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

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.flowmodelgenerator.core.model.Library;
import io.ballerina.flowmodelgenerator.core.model.Service;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;

import java.io.IOException;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Core orchestrator for Copilot library operations.
 * Coordinates between database access, symbol processing, and service loading.
 *
 * @since 1.0.1
 */
public class CopilotLibraryManager {

    private static final Gson GSON = new Gson();

    /**
     * Loads all libraries from the database.
     * Returns a list of libraries with name and description only.
     *
     * @return List of Library objects containing name and description
     */
    public List<Library> loadLibrariesFromDatabase() {
        List<Library> libraries = new ArrayList<>();

        try {
            Map<String, String> packageToDescriptionMap = LibraryDatabaseAccessor.loadAllPackages();

            for (Map.Entry<String, String> entry : packageToDescriptionMap.entrySet()) {
                Library library = new Library(entry.getKey(), entry.getValue());
                libraries.add(library);
            }
        } catch (IOException | SQLException e) {
            throw new RuntimeException("Failed to load libraries from database: " + e.getMessage(), e);
        }

        return libraries;
    }

    /**
     * Loads filtered libraries using the semantic model.
     * Returns libraries with full details including clients, functions, typedefs, and services.
     *
     * @param libraryNames Array of library names in "org/package_name" format to filter
     * @return List of Library objects with complete information
     */
    public List<Library> loadFilteredLibraries(String[] libraryNames) {
        List<Library> libraries = new ArrayList<>();

        for (String libraryName : libraryNames) {
            // Parse library name "org/package_name"
            String[] parts = libraryName.split("/");
            if (parts.length != 2) {
                continue; // Skip invalid format
            }
            String org = parts[0];
            String packageName = parts[1];

            // Create module info (use latest version by passing null)
            ModuleInfo moduleInfo = new ModuleInfo(org, packageName, org + "/" +
                    packageName, null);

            // Get semantic model for the module
            Optional<SemanticModel> optSemanticModel = PackageUtil.getSemanticModel(org, packageName);
            if (optSemanticModel.isEmpty()) {
                continue; // Skip if semantic model not found
            }

            SemanticModel semanticModel = optSemanticModel.get();

            // Get the package description from database
            String description = LibraryDatabaseAccessor.getPackageDescription(org, packageName).orElse("");

            // Create library object
            Library library = new Library(libraryName, description);

            // Process module symbols to extract clients, functions, and typedefs
            SymbolProcessor.SymbolProcessingResult symbolResult = SymbolProcessor.processModuleSymbols(
                    semanticModel,
                    moduleInfo,
                    org,
                    packageName
            );

            library.setClients(symbolResult.getClients());
            library.setFunctions(symbolResult.getFunctions());
            library.setTypeDefs(symbolResult.getTypeDefs());

            // Load services from both inbuilt triggers and generic services
            // For now, keep using JSON and convert to Service POJOs
            JsonArray servicesJson = ServiceLoader.loadAllServices(libraryName);
            List<Service> services = new ArrayList<>();
            for (JsonElement serviceElement : servicesJson) {
                Service service = GSON.fromJson(serviceElement, Service.class);
                services.add(service);
            }
            library.setServices(services);

            libraries.add(library);
        }

        return libraries;
    }
}
