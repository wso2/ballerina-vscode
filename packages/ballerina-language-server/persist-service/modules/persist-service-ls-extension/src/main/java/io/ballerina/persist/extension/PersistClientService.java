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
import io.ballerina.servicemodelgenerator.extension.model.Value;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.Map;
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
     * Connection details are extracted from the {@code data.properties} array
     * (keyed by property label: "Database System", "Host", "Port", "User",
     * "Password", "Database"). When {@code data.modelFilePath} is present, the
     * referenced model file is parsed to find existing record types; the resulting
     * set is intersected with the live DB tables so that {@code selected} and
     * {@code existing} flags are set to {@code true} for already-modelled tables.
     *
     * @param request The database introspection request containing credential data
     * @return CompletableFuture containing the response with table entries or error information
     */
    @JsonRequest
    public CompletableFuture<DatabaseIntrospectionResponse> introspectDatabase(
            DatabaseIntrospectionRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            DatabaseIntrospectionResponse response = new DatabaseIntrospectionResponse();
            try {
                Path projectPath = Path.of(request.getProjectPath());
                this.workspaceManager.loadProject(projectPath);

                DatabaseIntrospectionRequest.IntrospectDatabaseData data = request.getData();
                String name = data.metadata() != null ? data.metadata().label() : "";
                String dbSystem = findPropertyValue(data.properties(), "Database System");
                String host = findPropertyValue(data.properties(), "Host");
                String portStr = findPropertyValue(data.properties(), "Port");
                String user = findPropertyValue(data.properties(), "User");
                String password = findPropertyValue(data.properties(), "Password");
                String database = findPropertyValue(data.properties(), "Database");
                Integer port = parsePort(portStr);
                String modelFilePath = data.modelFilePath();

                PersistClient generator = new PersistClient(
                        request.getProjectPath(),
                        name,
                        dbSystem,
                        host,
                        port,
                        user,
                        password,
                        database,
                        this.workspaceManager
                );

                response.setTables(generator.introspectDatabase(modelFilePath));
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

                String targetModule = request.getTargetModule();
                String modelFilePath = request.getModelFilePath();
                boolean hasExistingModule = targetModule != null && !targetModule.isEmpty()
                        && modelFilePath != null && !modelFilePath.isEmpty();

                // Derive the short module name (last segment of the fully-qualified targetModule)
                String module = targetModule != null && targetModule.contains(".")
                        ? targetModule.substring(targetModule.lastIndexOf('.') + 1)
                        : targetModule;

                String connection = request.getConnection();
                boolean hasConnection = connection != null && !connection.isEmpty();

                // The connector variable name: use explicit connection name when provided,
                // otherwise fall back to the short module name.
                String connectorName = hasConnection ? connection : module;

                String[] selectedTables = request.getTables() == null ? new String[0]
                        : request.getTables().stream()
                                .filter(PersistClientGeneratorRequest.TableEntry::selected)
                                .map(PersistClientGeneratorRequest.TableEntry::table)
                                .toArray(String[]::new);

                PersistClient generator;
                if (hasExistingModule) {
                    // Lightweight constructor: no DB credentials needed for regeneration.
                    generator = new PersistClient(
                            request.getProjectPath(), module, this.workspaceManager);
                } else {
                    // Full constructor: DB credentials are required for database introspection.
                    Map<String, Value> properties = request.getProperties();
                    String dbSystem = findPropertyValue(properties, "Database System");
                    String host = findPropertyValue(properties, "Host");
                    String portStr = findPropertyValue(properties, "Port");
                    String user = findPropertyValue(properties, "User");
                    String password = findPropertyValue(properties, "Password");
                    String database = findPropertyValue(properties, "Database");
                    Integer port = parsePort(portStr);
                    generator = new PersistClient(
                            request.getProjectPath(),
                            connectorName,
                            dbSystem,
                            host,
                            port,
                            user,
                            password,
                            database,
                            this.workspaceManager);
                }

                // For re-generation (hasExistingModule=true), pass the full targetModule so that
                // PersistClient can read options.datastore from Ballerina.toml.
                String nameParam = hasExistingModule ? targetModule : connectorName;
                JsonElement source = generator.generateClient(
                        selectedTables, module, nameParam, hasExistingModule, modelFilePath, !hasConnection);
                response.setSource(source);
            } catch (Exception e) {
                response.setError(e);
            }
            return response;
        });
    }

    // -------------------------------------------------------------------------
    // Helpers for extracting values from the typed CredentialsData
    // -------------------------------------------------------------------------

    private String findPropertyValue(Map<String, Value> properties, String label) {
        if (properties == null) {
            return null;
        }
        Value prop = properties.get(label);
        if (prop == null) {
            return null;
        }
        String val = prop.getValueString();
        return val != null && !val.isEmpty() ? val : null;
    }

    private Integer parsePort(String portStr) {
        if (portStr == null || portStr.isEmpty()) {
            return null;
        }
        try {
            return Integer.parseInt(portStr);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
