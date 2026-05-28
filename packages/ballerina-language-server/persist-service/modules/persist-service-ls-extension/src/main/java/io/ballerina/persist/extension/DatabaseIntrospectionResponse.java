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
 * Represents the response for database introspection containing table metadata.
 * <p>
 * Each entry in {@code tables} carries the table name together with two flags:
 * <ul>
 *   <li>{@code selected} – {@code true} when the table already has a corresponding
 *       record type in the project's persist model file</li>
 *   <li>{@code existing} – {@code true} when the same condition holds (mirrors
 *       {@code selected} so the UI can distinguish pre-selected from new items)</li>
 * </ul>
 *
 * @since 1.5.0
 */
public class DatabaseIntrospectionResponse {
    private List<TableInfo> tables;
    private String errorMsg;

    public DatabaseIntrospectionResponse() {
    }

    public List<TableInfo> getTables() {
        return tables;
    }

    public void setTables(List<TableInfo> tables) {
        this.tables = tables;
    }

    public String getErrorMsg() {
        return errorMsg;
    }

    public void setError(String errorMsg) {
        this.errorMsg = errorMsg;
    }

    public void setError(Throwable e) {
        this.errorMsg = e.getLocalizedMessage();
    }

    /**
     * Represents a single database table entry in the introspection result.
     *
     * @since 1.5.0
     */
    public static class TableInfo {
        private final String table;
        private final boolean selected;
        private final boolean existing;

        public TableInfo(String table, boolean selected, boolean existing) {
            this.table = table;
            this.selected = selected;
            this.existing = existing;
        }

        public String getTable() {
            return table;
        }

        public boolean isSelected() {
            return selected;
        }

        public boolean isExisting() {
            return existing;
        }
    }
}
