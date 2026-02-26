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

import java.util.List;

/**
 * Represents a request to generate Ballerina persist client from database introspection.
 *
 * @since 1.5.0
 */
public class PersistClientGeneratorRequest {
    private String projectPath;
    private String targetModule;
    private String modelFilePath;
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
