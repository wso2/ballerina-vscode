/*
 *  Copyright (c) 2025, WSO2 LLC. (http://www.wso2.com)
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

package io.ballerina.flowmodelgenerator.extension;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.stream.JsonReader;
import io.ballerina.flowmodelgenerator.extension.request.GetAllLibrariesRequest;
import io.ballerina.flowmodelgenerator.extension.request.GetSelectedLibrariesRequest;
import io.ballerina.flowmodelgenerator.extension.response.GetAllLibrariesResponse;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

/**
 * Service for managing Copilot library operations.
 * Provides streaming JSON processing for efficient memory usage.
 *
 * @since 1.0.1
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("copilotLibraryManager")
public class CopilotLibraryService implements ExtendedLanguageServerService {

    private static final String CORE_CONTEXT_JSON_PATH = "/copilot/context.json";
    private static final String HEALTHCARE_CONTEXT_JSON_PATH = "/copilot/healthcare-context.json";
    private static final String MODE_CORE = "CORE";
    private static final String MODE_HEALTHCARE = "HEALTHCARE";

    // JSON field names
    private static final String FIELD_NAME = "name";
    private static final String FIELD_DESCRIPTION = "description";

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager) {
        // Initialization logic if needed
    }

    @Override
    public Class<?> getRemoteInterface() {

        return null;
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getLibrariesList(GetAllLibrariesRequest request) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                String mode = request.mode() != null ? request.mode() : MODE_CORE;
                JsonArray libraries = loadLibrariesFromContext(null, true, mode);
                return createResponse(libraries);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load libraries: " + e.getMessage(), e);
            }
        });
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getFilteredLibraries(GetSelectedLibrariesRequest request) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                String[] libraryNames = request.libNames();
                if (libraryNames == null || libraryNames.length == 0) {
                    // Return empty response if no library names provided
                    return createResponse(new JsonArray());
                }

                String mode = request.mode() != null ? request.mode() : MODE_CORE;
                // Convert to Set for efficient lookup during streaming
                Set<String> requestedLibraries = new HashSet<>(Arrays.asList(libraryNames));
                JsonArray filteredLibraries = loadLibrariesFromContext(requestedLibraries, false, mode);
                return createResponse(filteredLibraries);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load filtered libraries: " + e.getMessage(), e);
            }
        });
    }

    /**
     * Loads libraries from the context.json file using streaming JSON parsing with optional filtering.
     *
     * @param requestedLibraries Set of library names to filter by, or null to load all libraries
     * @param limitedFields      whether to return only name and description fields (true) or full objects (false)
     * @param mode               The mode to determine which context file to read ("CORE" or "HEALTHCARE")
     * @return JsonArray containing library information
     * @throws IOException if file reading fails
     */
    private JsonArray loadLibrariesFromContext(Set<String> requestedLibraries, boolean limitedFields, String mode)
            throws IOException {

        JsonArray libraries = new JsonArray();

        try (InputStream inputStream = getContextInputStream(mode);
             InputStreamReader reader = new InputStreamReader(inputStream);
             JsonReader jsonReader = new JsonReader(reader)) {

            processLibraryArray(jsonReader, libraries, requestedLibraries, limitedFields);
        }

        return libraries;
    }

    /**
     * Gets the input stream for the context file based on the mode.
     *
     * @param mode The mode to determine which context file to read
     * @return InputStream for the context file
     * @throws IOException if file not found
     */
    private InputStream getContextInputStream(String mode) throws IOException {

        String contextPath;
        if (MODE_HEALTHCARE.equals(mode)) {
            contextPath = HEALTHCARE_CONTEXT_JSON_PATH;
        } else {
            contextPath = CORE_CONTEXT_JSON_PATH; // Default to CORE
        }

        InputStream inputStream = getClass().getResourceAsStream(contextPath);
        if (inputStream == null) {
            throw new IOException("Context file not found: " + contextPath);
        }
        return inputStream;
    }

    /**
     * Processes the JSON array containing library information with optional filtering.
     *
     * @param jsonReader         the JSON reader
     * @param libraries          the array to populate with library data
     * @param requestedLibraries Set of library names to filter by, or null to include all libraries
     * @param limitedFields      whether to return only name and description fields (true) or full objects (false)
     * @throws IOException if JSON parsing fails
     */
    private void processLibraryArray(JsonReader jsonReader, JsonArray libraries, Set<String> requestedLibraries,
                                     boolean limitedFields) throws IOException {

        jsonReader.beginArray();

        while (jsonReader.hasNext()) {
            JsonObject libraryInfo = parseLibraryObject(jsonReader, limitedFields);
            if (isValidLibrary(libraryInfo) && shouldIncludeLibrary(libraryInfo, requestedLibraries)) {
                libraries.add(libraryInfo);
            }
        }

        jsonReader.endArray();
    }

    /**
     * Parses a single library object from the JSON stream.
     *
     * @param jsonReader    the JSON reader
     * @param limitedFields whether to return only name and description fields (true) or full objects (false)
     * @return JsonObject representing the library
     * @throws IOException if JSON parsing fails
     */
    private JsonObject parseLibraryObject(JsonReader jsonReader, boolean limitedFields) throws IOException {

        JsonObject libraryInfo = new JsonObject();
        jsonReader.beginObject();
        while (jsonReader.hasNext()) {
            String fieldName = jsonReader.nextName();
            processLibraryField(jsonReader, libraryInfo, fieldName, limitedFields);
        }

        jsonReader.endObject();

        return libraryInfo;
    }

    /**
     * Processes a single field in the library object.
     *
     * @param jsonReader  the JSON reader
     * @param libraryInfo the library object to populate
     * @param fieldName   the current field name
     * @throws IOException if JSON parsing fails
     */
    private void processLibraryField(JsonReader jsonReader, JsonObject libraryInfo, String fieldName,
                                     boolean limitedFields) throws IOException {

        if (limitedFields) {
            // For limited fields, only process name and description
            switch (fieldName) {
                case FIELD_NAME:
                    String name = jsonReader.nextString();
                    libraryInfo.addProperty(FIELD_NAME, name);
                    break;
                case FIELD_DESCRIPTION:
                    String description = jsonReader.nextString();
                    libraryInfo.addProperty(FIELD_DESCRIPTION, description);
                    break;
                default:
                    jsonReader.skipValue(); // Skip other fields
                    break;
            }
        } else {
            // Add all fields to the libraryInfo object as a exact copy.
            JsonElement element = JsonParser.parseReader(jsonReader);
            libraryInfo.add(fieldName, element);
        }

    }

    /**
     * Validates if a library object contains required information.
     *
     * @param libraryInfo the library object to validate
     * @return true if valid, false otherwise
     */
    private boolean isValidLibrary(JsonObject libraryInfo) {

        return libraryInfo.has(FIELD_NAME) &&
                libraryInfo.get(FIELD_NAME).getAsString() != null &&
                !libraryInfo.get(FIELD_NAME).getAsString().trim().isEmpty();
    }

    /**
     * Determines if a library should be included based on the filter criteria.
     *
     * @param libraryInfo        the library object to check
     * @param requestedLibraries Set of library names to filter by, or null to include all libraries
     * @return true if the library should be included, false otherwise
     */
    private boolean shouldIncludeLibrary(JsonObject libraryInfo, Set<String> requestedLibraries) {

        if (requestedLibraries == null || requestedLibraries.isEmpty()) {
            return true; // Include all libraries if no filter specified
        }

        if (!libraryInfo.has(FIELD_NAME)) {
            return false; // Skip libraries without names
        }

        String libraryName = libraryInfo.get(FIELD_NAME).getAsString();
        return requestedLibraries.contains(libraryName);
    }

    /**
     * Creates the response object with the loaded libraries.
     *
     * @param libraries the loaded libraries
     * @return the response object
     */
    private GetAllLibrariesResponse createResponse(JsonArray libraries) {

        GetAllLibrariesResponse response = new GetAllLibrariesResponse();
        response.setLibraries(libraries);
        return response;
    }
}
