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

package io.ballerina.persist.extension;

import com.google.gson.JsonElement;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.concurrent.CompletableFuture;

/**
 * The extended service for the Persist client generator LS extension endpoint.
 *
 * @since 1.5.0
 */
@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("persistService")
public class PersistClientService implements ExtendedLanguageServerService {
    private WorkspaceManager workspaceManager;

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager) {
        this.workspaceManager = workspaceManager;
    }

    @Override
    public Class<?> getRemoteInterface() {
        return getClass();
    }

    /**
     * Introspect a database and retrieve table metadata.
     *
     * @param request The database introspection request containing connection details
     * @return CompletableFuture containing the response with tables metadata or error information
     */
    @JsonRequest
    public CompletableFuture<DatabaseIntrospectionResponse> introspectDatabase(
            DatabaseIntrospectionRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DatabaseIntrospectionResponse response = new DatabaseIntrospectionResponse();
            try {
                this.workspaceManager.loadProject(Path.of(request.getProjectPath()));

                PersistClient generator = new PersistClient(
                        request.getProjectPath(),
                        request.getName(),
                        request.getDbSystem(),
                        request.getHost(),
                        request.getPort(),
                        request.getUser(),
                        request.getPassword(),
                        request.getDatabase()
                );

                String[] tables = generator.introspectDatabaseTables();
                response.setTables(tables);
            } catch (Exception e) {
                response.setError(e);
            }
            return response;
        });
    }

    /**
     * Generate Ballerina persist client from database introspection.
     *
     * @param request The persist client generator request containing connection details and selected tables
     * @return CompletableFuture containing the response with source (text edits map) or error information
     */
    @JsonRequest
    public CompletableFuture<PersistClientGeneratorResponse> generatePersistClient(
            PersistClientGeneratorRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            PersistClientGeneratorResponse response = new PersistClientGeneratorResponse();
            try {
                this.workspaceManager.loadProject(Path.of(request.getProjectPath()));

                PersistClient generator = new PersistClient(
                        request.getProjectPath(),
                        request.getName(),
                        request.getDbSystem(),
                        request.getHost(),
                        request.getPort(),
                        request.getUser(),
                        request.getPassword(),
                        request.getDatabase()
                );

                JsonElement source = generator.generateClient(
                        request.getSelectedTables(),
                        request.getModule()
                );
                response.setSource(source);
            } catch (Exception e) {
                response.setError(e);
            }
            return response;
        });
    }
}
