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

package io.ballerina.projectservice.core;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Utility class for handling multi-root migration results. Provides common functionality for splitting and organizing
 * migration results across multiple projects.
 *
 * @since 1.4.2
 */
public class MultiRootMigrationUtil {

    /**
     * Processes multiRoot migration results by splitting text edits per project.
     *
     * @param result The tool execution result containing all text edits
     * @return A list of ProjectMigrationResult objects, one per project
     */
    public static List<ProjectMigrationResult> processMultiRootResults(ToolExecutionResult result) {
        Map<String, ProjectMigrationResult> projectResults = new TreeMap<>();
        Map<String, String> allTextEdits = result.textEdits();

        // Split text edits by project
        for (Map.Entry<String, String> entry : allTextEdits.entrySet()) {
            String filePath = entry.getKey();
            String content = entry.getValue();

            // Check if the file belongs to a project (has a project prefix)
            String projectName = extractProjectName(filePath);

            if (projectName != null) {
                // File belongs to a project
                String relativeFilePath = filePath.substring(projectName.length() + 1); // Remove "projectName/"
                ProjectMigrationResult projectResult =
                        projectResults.computeIfAbsent(projectName, ProjectMigrationResult::new);

                // Handle migration report files separately
                if (relativeFilePath.equals("migration_report.html")) {
                    projectResult.setReport(content);
                } else {
                    projectResult.addTextEdit(relativeFilePath, content);
                }
            }
        }

        // Return sorted list of results
        return new ArrayList<>(projectResults.values());
    }

    /**
     * Extracts the project name from a file path in multiRoot format. For example: "project1/main.bal" -> "project1",
     * "Ballerina.toml" -> null
     *
     * @param filePath The file path to parse
     * @return The project name if the path has a project prefix, null otherwise
     */
    public static String extractProjectName(String filePath) {
        int slashIndex = filePath.indexOf('/');
        if (slashIndex <= 0) {
            // No slash or slash at the beginning - this is a root-level file
            return null;
        }

        String possibleProjectName = filePath.substring(0, slashIndex);
        // Exclude common report files that shouldn't be treated as project names
        if (possibleProjectName.contains(".") || possibleProjectName.contains("_report")) {
            return null;
        }

        return possibleProjectName;
    }

    /**
     * Extracts only the root-level text edits from the tool result. This removes all project-prefixed files that have
     * already been processed.
     *
     * @param result         The original tool execution result
     * @param projectResults The per-project results already processed
     * @return A new ToolExecutionResult containing only root-level files
     */
    public static ToolExecutionResult extractRootLevelEdits(ToolExecutionResult result,
                                                            List<ProjectMigrationResult> projectResults) {
        Map<String, String> rootTextEdits = new HashMap<>();

        // Keep only root-level files (those without project prefix)
        for (Map.Entry<String, String> entry : result.textEdits().entrySet()) {
            String filePath = entry.getKey();
            String projectName = extractProjectName(filePath);

            if (projectName == null) {
                // This is a root-level file
                rootTextEdits.put(filePath, entry.getValue());
            }
        }

        // Create a new result with only root-level edits
        return new ToolExecutionResult(result.error(), rootTextEdits, result.report(), result.jsonReport());
    }
}
