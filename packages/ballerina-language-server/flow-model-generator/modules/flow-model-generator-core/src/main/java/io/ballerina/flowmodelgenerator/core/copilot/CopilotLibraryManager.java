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

package io.ballerina.flowmodelgenerator.core.copilot;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.reflect.TypeToken;
import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.flowmodelgenerator.core.InstructionLoader;
import io.ballerina.flowmodelgenerator.core.copilot.database.LibraryDatabaseAccessor;
import io.ballerina.flowmodelgenerator.core.copilot.model.Client;
import io.ballerina.flowmodelgenerator.core.copilot.model.Library;
import io.ballerina.flowmodelgenerator.core.copilot.model.Service;
import io.ballerina.flowmodelgenerator.core.copilot.service.ServiceLoader;
import io.ballerina.flowmodelgenerator.core.copilot.util.SymbolProcessor;
import io.ballerina.modelgenerator.commons.ModuleInfo;
import io.ballerina.modelgenerator.commons.PackageUtil;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.lang.reflect.Type;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Core orchestrator for Copilot library operations.
 * Coordinates between database access, symbol processing, and service loading.
 *
 * @since 1.6.0
 */
public class CopilotLibraryManager {

    private static final Gson GSON = new Gson();
    private static final String EXCLUSION_JSON_PATH = "/copilot/exclusion.json";
    private static final String TYPE_GENERIC = "generic";

    /**
     * Loads all libraries from the database.
     * Returns a list of libraries with name and description only.
     *
     * @return List of Library objects containing name and description
     */
    public List<Library> loadLibrariesFromDatabase(String mode) {
        List<Library> libraries = new ArrayList<>();

        try {
            Map<String, String> packageToDescriptionMap = LibraryDatabaseAccessor.loadAllPackages(mode);

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
     * Applies exclusions and augments with instructions before returning.
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
            JsonArray servicesJson = ServiceLoader.loadAllServices(libraryName);
            List<Service> services = new ArrayList<>();
            for (JsonElement serviceElement : servicesJson) {
                Service service = GSON.fromJson(serviceElement, Service.class);
                services.add(service);
            }
            library.setServices(services);

            libraries.add(library);
        }

        applyLibraryExclusions(libraries);
        augmentLibrariesWithInstructions(libraries);

        return libraries;
    }

    /**
     * Searches libraries by keywords across packages, types, connectors, and functions.
     *
     * @param keywords Array of search keywords
     * @return List of Library objects containing name and description (up to 20 results)
     */
    public List<Library> getLibrariesBySearch(String[] keywords) {
        List<Library> libraries = new ArrayList<>();

        try {
            Map<String, String> packageToDescriptionMap = LibraryDatabaseAccessor.searchLibrariesByKeywords(keywords);

            for (Map.Entry<String, String> entry : packageToDescriptionMap.entrySet()) {
                Library library = new Library(entry.getKey(), entry.getValue());
                libraries.add(library);
            }
        } catch (IOException | SQLException e) {
            throw new RuntimeException("Failed to search libraries by keywords: " + e.getMessage(), e);
        }

        return libraries;
    }

    /**
     * Applies library exclusions by removing excluded functions from libraries and clients.
     * Exclusions are loaded from the exclusion.json resource file.
     *
     * @param libraries the list of libraries to apply exclusions to
     */
    public void applyLibraryExclusions(List<Library> libraries) {
        List<ExclusionEntry> exclusions = loadExclusions();
        if (exclusions == null || exclusions.isEmpty()) {
            return;
        }

        Map<String, ExclusionEntry> exclusionMap = new LinkedHashMap<>();
        for (ExclusionEntry entry : exclusions) {
            if (entry.name != null) {
                exclusionMap.put(entry.name, entry);
            }
        }

        for (Library library : libraries) {
            String libraryName = library.getName();
            if (libraryName == null || !exclusionMap.containsKey(libraryName)) {
                continue;
            }

            ExclusionEntry exclusion = exclusionMap.get(libraryName);

            // Exclude module-level functions
            if (exclusion.functions != null && library.getFunctions() != null) {
                Set<String> excludedNames = exclusion.functions.stream()
                        .map(f -> f.name)
                        .collect(Collectors.toSet());
                library.getFunctions().removeIf(f -> excludedNames.contains(f.getName()));
            }

            // Exclude client functions
            if (exclusion.clients != null && library.getClients() != null) {
                applyClientExclusions(library.getClients(), exclusion.clients);
            }
        }
    }

    private void applyClientExclusions(List<Client> clients, List<ExcludedClient> exclusionClients) {
        Map<String, Set<String>> clientExclusionMap = new LinkedHashMap<>();
        for (ExcludedClient clientExclusion : exclusionClients) {
            if (clientExclusion.name != null && clientExclusion.functions != null) {
                Set<String> funcNames = clientExclusion.functions.stream()
                        .map(f -> f.name)
                        .collect(Collectors.toSet());
                clientExclusionMap.put(clientExclusion.name, funcNames);
            }
        }

        for (Client client : clients) {
            String clientName = client.getName();
            if (clientName != null && clientExclusionMap.containsKey(clientName)
                    && client.getFunctions() != null) {
                Set<String> excludedFuncs = clientExclusionMap.get(clientName);
                client.getFunctions().removeIf(f -> excludedFuncs.contains(f.getName()));
            }
        }
    }

    private List<ExclusionEntry> loadExclusions() {
        try (InputStream inputStream = CopilotLibraryManager.class.getResourceAsStream(EXCLUSION_JSON_PATH)) {
            if (inputStream == null) {
                return null;
            }
            try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {
                Type listType = new TypeToken<List<ExclusionEntry>>() { }.getType();
                return GSON.fromJson(reader, listType);
            }
        } catch (IOException e) {
            return null;
        }
    }

    /**
     * Augments libraries with custom instructions loaded from resource files.
     * Adds library-level instructions, service instructions for generic services,
     * and test generation instructions for all services.
     *
     * @param libraries the libraries to augment
     */
    public void augmentLibrariesWithInstructions(List<Library> libraries) {
        for (Library library : libraries) {
            String libraryName = library.getName();
            if (libraryName == null || libraryName.isEmpty()) {
                continue;
            }

            // Add library-level instructions
            InstructionLoader.loadLibraryInstruction(libraryName)
                    .ifPresent(library::setInstructions);

            // Process services for service and test instructions
            if (library.getServices() != null) {
                augmentServicesWithInstructions(library.getServices(), libraryName);
            }
        }
    }

    private void augmentServicesWithInstructions(List<Service> services, String libraryName) {
        for (Service service : services) {
            // Add test generation instruction to all services
            InstructionLoader.loadTestInstruction(libraryName)
                    .ifPresent(service::setTestGenerationInstruction);

            // Add service instruction only to generic services
            if (TYPE_GENERIC.equals(service.getType())) {
                InstructionLoader.loadServiceInstruction(libraryName)
                        .ifPresent(service::setInstructions);
            }
        }
    }

    // Exclusion model classes for deserializing exclusion.json
    private static class ExclusionEntry {
        String name = "";
        List<ExcludedFunction> functions = new ArrayList<>();
        List<ExcludedClient> clients = new ArrayList<>();
    }

    private static class ExcludedClient {
        String name = "";
        List<ExcludedFunction> functions = new ArrayList<>();
    }

    private static class ExcludedFunction {
        String name = "";
    }
}
