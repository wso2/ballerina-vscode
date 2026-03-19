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

import io.ballerina.servicemodelgenerator.extension.model.Value;

import java.util.List;
import java.util.Map;

/**
 * Represents a request to introspect a database or generate Ballerina persist client
 * from database introspection. This class is shared between the
 * {@code introspectDatabase} and {@code generatePersistClient} endpoints.
 * <p>
 * The {@code connection} field holds the prefix used for configurable variable names
 * and the persist client connection variable name (e.g. the database/connection name
 * such as {@code "testdb"}). It is derived from the metadata label of the credential
 * model returned by the {@code introspectCredentials} API.
 * <p>
 * For pure introspection calls, {@code targetModule} and {@code modelFilePath} should
 * be empty strings. The {@code properties} map uses canonical keys ({@code dbSystem},
 * {@code host}, {@code port}, {@code user}, {@code password}, {@code database}).
 *
 * @since 1.5.0
 */
public class PersistClientGeneratorRequest {
    private String projectPath;
    private String targetModule;
    private String modelFilePath;
    private String connection;
    private Map<String, Value> properties;
    private List<TableEntry> tables;

    public PersistClientGeneratorRequest() {
    }

    public String getProjectPath() {
        return projectPath;
    }

    public void setProjectPath(String projectPath) {
        this.projectPath = projectPath;
    }

    public String getTargetModule() {
        return targetModule;
    }

    public void setTargetModule(String targetModule) {
        this.targetModule = targetModule;
    }

    public String getModelFilePath() {
        return modelFilePath;
    }

    public void setModelFilePath(String modelFilePath) {
        this.modelFilePath = modelFilePath;
    }

    public String getConnection() {
        return connection;
    }

    public void setConnection(String connection) {
        this.connection = connection;
    }

    public Map<String, Value> getProperties() {
        return properties;
    }

    public void setProperties(Map<String, Value> properties) {
        this.properties = properties;
    }

    public List<TableEntry> getTables() {
        return tables;
    }

    public void setTables(List<TableEntry> tables) {
        this.tables = tables;
    }

    /**
     * Represents a single table entry in the generation request, combining the table name
     * with the flags that were set during the introspection step.
     *
     * @param table    The database table name.
     * @param selected {@code true} if the user selected this table for client generation.
     * @param existing {@code true} if a corresponding record type already exists in the model file.
     */
    public record TableEntry(String table, boolean selected, boolean existing) {
    }
}
