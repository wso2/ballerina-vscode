/*
 * Copyright (c) 2025, WSO2 Inc. (http://wso2.com) All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.ballerina.projectservice.core;

import java.util.HashMap;
import java.util.Map;

/**
 * Internal data structure to hold per-project migration results during multiRoot processing. This is used internally to
 * organize tool output by project before sending notifications.
 *
 * @since 1.4.2
 */
public class ProjectMigrationResult {

    private final String projectName;
    private final Map<String, String> textEdits;
    private String report;

    public ProjectMigrationResult(String projectName) {
        this.projectName = projectName;
        this.textEdits = new HashMap<>();
        this.report = null;
    }

    public String getProjectName() {
        return projectName;
    }

    public Map<String, String> getTextEdits() {
        return textEdits;
    }

    public void addTextEdit(String filePath, String content) {
        this.textEdits.put(filePath, content);
    }

    public String getReport() {
        return report;
    }

    public void setReport(String report) {
        this.report = report;
    }

}
