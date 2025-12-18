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

/**
 * Represents a request to generate Ballerina persist client from database introspection.
 *
 * @since 1.5.0
 */
public class PersistClientGeneratorRequest {
    private String projectPath;
    private String name;
    private String dbSystem;
    private String host;
    private Integer port;
    private String user;
    private String password;
    private String database;
    private String[] selectedTables;
    private String module;

    public PersistClientGeneratorRequest() {
    }

    /**
     * Constructor for PersistClientGeneratorRequest.
     *
     * @param projectPath    The project path
     * @param name           Name of the database connector
     * @param dbSystem       Database system type (mysql, postgresql, mssql)
     * @param host           Database host address
     * @param port           Database port number
     * @param user           Database user name
     * @param password       Database user password
     * @param database       Name of the database to connect
     * @param selectedTables Selected tables to generate entities for
     * @param module         The target module name for generated client
     */
    public PersistClientGeneratorRequest(String projectPath, String name, String dbSystem, String host,
                                         Integer port, String user, String password, String database,
                                         String[] selectedTables, String module) {
        this.projectPath = projectPath;
        this.name = name;
        this.dbSystem = dbSystem;
        this.host = host;
        this.port = port;
        this.user = user;
        this.password = password;
        this.database = database;
        this.selectedTables = selectedTables;
        this.module = module;
    }

    public String getProjectPath() {
        return projectPath;
    }

    public void setProjectPath(String projectPath) {
        this.projectPath = projectPath;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDbSystem() {
        return dbSystem;
    }

    public void setDbSystem(String dbSystem) {
        this.dbSystem = dbSystem;
    }

    public String getHost() {
        return host;
    }

    public void setHost(String host) {
        this.host = host;
    }

    public Integer getPort() {
        return port;
    }

    public void setPort(Integer port) {
        this.port = port;
    }

    public String getUser() {
        return user;
    }

    public void setUser(String user) {
        this.user = user;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getDatabase() {
        return database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }

    public String[] getSelectedTables() {
        return selectedTables;
    }

    public void setSelectedTables(String[] selectedTables) {
        this.selectedTables = selectedTables;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }
}
