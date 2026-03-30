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

import io.ballerina.servicemodelgenerator.extension.model.MetaData;
import io.ballerina.servicemodelgenerator.extension.model.Value;

import java.util.Map;

/**
 * Represents a request to introspect a database and retrieve table metadata.
 * <p>
 * The {@code data} field carries the resolved credential model returned by the
 * {@code introspectCredentials} API, allowing the caller to pass connection
 * details (dbSystem, host, port, user, password, database) together with an
 * optional {@code modelFilePath} that, when present, enables intersection
 * detection against existing persist model records.
 *
 * @since 1.5.0
 */
public class DatabaseIntrospectionRequest {
    private String projectPath;
    private IntrospectDatabaseData data;

    public DatabaseIntrospectionRequest() {
    }

    public String getProjectPath() {
        return projectPath;
    }

    public void setProjectPath(String projectPath) {
        this.projectPath = projectPath;
    }

    public IntrospectDatabaseData getData() {
        return data;
    }

    public void setData(IntrospectDatabaseData data) {
        this.data = data;
    }

    /**
     * Holds the introspection request data.
     *
     * @param metadata      Metadata describing the connection (label, description)
     * @param properties    Map of credential property values keyed by property label
     *                      (e.g. "Database System", "Host", "Port", "User", "Password", "Database")
     * @param targetModule  The fully-qualified target module name (e.g., "myapp.testdb")
     * @param modelFilePath The relative path to the persist model file (e.g., "persist/testdb/model.bal")
     */
    public record IntrospectDatabaseData(MetaData metadata, Map<String, Value> properties,
                                         String targetModule, String modelFilePath) {
    }
}
