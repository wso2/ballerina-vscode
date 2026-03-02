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
     * <p>
     * Connection details are extracted from the top-level {@code properties} map
     * (keyed by canonical property keys: {@code dbSystem}, {@code host}, {@code port},
     * {@code user}, {@code password}, {@code database}). The {@code connection} field
     * is used as the configurable-variable name prefix / client connection variable name.
     * {@code targetModule} and {@code modelFilePath} are expected to be empty strings for
     * introspection-only calls; when {@code modelFilePath} is non-empty the referenced model
     * file is parsed to find existing record types so that {@code selected} and {@code existing}
     * flags are set to {@code true} for already-modelled tables.
     *
     * @param request The request containing connection credentials and optional model file path
     * @return CompletableFuture containing the response with table entries or error information
     */
    @JsonRequest
    public CompletableFuture<DatabaseIntrospectionResponse> introspectDatabase(
            PersistClientGeneratorRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DatabaseIntrospectionResponse response = new DatabaseIntrospectionResponse();
            try {
                Path projectPath = Path.of(request.getProjectPath());
                this.workspaceManager.loadProject(projectPath);

                PersistClientUtils.DatabaseCredentials creds =
                        PersistClientUtils.extractDatabaseCredentials(request.getProperties());
                String modelFilePath = request.getModelFilePath();

                PersistClient generator = new PersistClient(
                        request.getProjectPath(),
                        request.getConnection(),
                        creds.dbSystem(),
                        creds.host(),
                        creds.port(),
                        creds.user(),
                        creds.password(),
                        creds.database(),
                        this.workspaceManager
                );

                String effectiveModelFilePath = (modelFilePath != null && !modelFilePath.isEmpty())
                        ? modelFilePath : null;
                response.setTables(generator.introspectDatabase(effectiveModelFilePath));
            } catch (Exception e) {
                response.setError(e);
            }
            return response;
        });
    }

    /**
     * Introspect credentials for an existing persist client connection.
     * <p>
     * Read find the client declaration, resolves the configurable default
     * values, and enriches a credential model with the discovered values.
     *
     * @param request The request containing the project path and an optional connection name
     * @return CompletableFuture containing the response with credential data or error information
     */
    @JsonRequest
    public CompletableFuture<IntrospectCredentialsResponse> introspectCredentials(
            IntrospectCredentialsRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            IntrospectCredentialsResponse response = new IntrospectCredentialsResponse();
            try {
                this.workspaceManager.loadProject(Path.of(request.getProjectPath()));

                CredentialsIntrospector introspector = new CredentialsIntrospector(
                        Path.of(request.getProjectPath()),
                        request.getConnection(),
                        this.workspaceManager);

                IntrospectCredentialsResponse.CredentialsData data = introspector.introspect();
                response.setData(data);
            } catch (Exception e) {
                response.setError(e);
            }
            return response;
        });
    }

    /**
     * Generate Ballerina persist client from database introspection.
     * <p>
     * When {@code targetModule} and {@code modelFilePath} are both non-empty the module already
     * exists: only the generated client source files are (re)generated and Ballerina.toml /
     * config / connections changes are skipped. When {@code targetModule} is {@code null} or
     * empty the full setup flow is executed (requires database credentials in {@code properties}).
     * <p>
     * When {@code connection} is non-empty, the connection name is used as the variable name
     * prefix for configurable variables and the persist client declaration (config.bal and
     * connections.bal are generated). When {@code connection} is empty, those files are skipped.
     *
     * @param request The persist client generator request
     * @return CompletableFuture containing the response with source (text edits map) or error information
     */
    @JsonRequest
    public CompletableFuture<PersistClientGeneratorResponse> generatePersistClient(
            PersistClientGeneratorRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            PersistClientGeneratorResponse response = new PersistClientGeneratorResponse();
            try {
                this.workspaceManager.loadProject(Path.of(request.getProjectPath()));

                String[] selectedTables = request.getTables() == null ? new String[0]
                        : request.getTables().stream()
                                .filter(PersistClientGeneratorRequest.TableEntry::selected)
                                .map(PersistClientGeneratorRequest.TableEntry::table)
                                .toArray(String[]::new);

                // Full constructor: DB credentials are required for database introspection.
                PersistClientUtils.DatabaseCredentials creds = PersistClientUtils.extractDatabaseCredentials(
                        request.getProperties());
                PersistClient generator = new PersistClient(
                        request.getProjectPath(),
                        request.getConnection(),
                        creds.dbSystem(),
                        creds.host(),
                        creds.port(),
                        creds.user(),
                        creds.password(),
                        creds.database(),
                        this.workspaceManager);

                // Derive the short module name (last segment of the fully-qualified targetModule)
                JsonElement source = generator.generateClient(selectedTables, null);
                response.setSource(source);
            } catch (Exception e) {
                response.setError(e);
            }
            return response;
        });
    }

}
