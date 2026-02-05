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
import io.ballerina.flowmodelgenerator.core.CopilotLibraryManager;
import io.ballerina.flowmodelgenerator.core.model.Library;
import io.ballerina.flowmodelgenerator.core.model.ModelToJsonConverter;
import io.ballerina.flowmodelgenerator.extension.request.GetSelectedLibrariesRequest;
import io.ballerina.flowmodelgenerator.extension.response.GetAllLibrariesResponse;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Service for managing Copilot library operations.
 * Provides API endpoints for loading library information.
 * Works with POJOs internally and converts to JSON only at the API boundary.
 *
 * @since 1.0.1
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("copilotLibraryManager")
public class CopilotLibraryService implements ExtendedLanguageServerService {

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager) {
        // Initialization logic if needed
    }

    @Override
    public Class<?> getRemoteInterface() {
        return null;
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getLibrariesList() {
        return CompletableFuture.supplyAsync(() -> {
            try {
                CopilotLibraryManager manager = new CopilotLibraryManager();
                List<Library> libraries = manager.loadLibrariesFromDatabase();
                JsonArray librariesJson = ModelToJsonConverter.librariesToJson(libraries);
                return createResponse(librariesJson);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load libraries from database: " + e.getMessage(), e);
            }
        });
    }

    @JsonRequest
    public CompletableFuture<GetAllLibrariesResponse> getFilteredLibraries(
            GetSelectedLibrariesRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                if (request.libNames() == null || request.libNames().length == 0) {
                    return createResponse(new JsonArray());
                }
                CopilotLibraryManager manager = new CopilotLibraryManager();
                List<Library> libraries = manager.loadFilteredLibraries(request.libNames());
                JsonArray librariesJson = ModelToJsonConverter.librariesToJson(libraries);
                return createResponse(librariesJson);
            } catch (Exception e) {
                throw new RuntimeException("Failed to load filtered libraries: " + e.getMessage(), e);
            }
        });
    }

    private GetAllLibrariesResponse createResponse(JsonArray libraries) {
        GetAllLibrariesResponse response = new GetAllLibrariesResponse();
        response.setLibraries(libraries);
        return response;
    }
}
