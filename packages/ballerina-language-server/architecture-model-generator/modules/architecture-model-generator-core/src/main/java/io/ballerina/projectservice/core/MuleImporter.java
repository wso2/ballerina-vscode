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

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Consumer;

import static io.ballerina.projectservice.core.MigrateToolInvokingUtil.invokeToolMethod;

/**
 * Utility class for importing Mule projects to Ballerina.
 *
 * @since 1.2.0
 */
public class MuleImporter {

    private static final String MULE_TOOL_COMMAND = "migrate-mule";
    private static final String MULE_TOOL_CLASS_NAME = "mule.MuleMigrator";
    private static final String MULE_TOOL_METHOD_NAME = "migrateMule";

    private static final String PARAM_OGR_NAME = "orgName";
    private static final String PARAM_PROJECT_NAME = "projectName";
    private static final String PARAM_SOURCE_PATH = "sourcePath";
    private static final String PARAM_FORCE_VERSION = "forceVersion";
    private static final String PARAM_MULE_MULTI_ROOT = "multiRoot";
    private static final String PARAM_STATE_CALLBACK = "stateCallback";
    private static final String PARAM_LOG_CALLBACK = "logCallback";

    public static ToolExecutionResult importMule(String orgName, String packageName, String sourcePath,
                                                 Map<String, String> parameters, Consumer<String> stateCallback,
                                                 Consumer<String> logCallback) {
        Map<String, Object> args = new HashMap<>();
        args.put(PARAM_OGR_NAME, orgName);
        args.put(PARAM_PROJECT_NAME, packageName);
        args.put(PARAM_SOURCE_PATH, sourcePath);

        Integer forceVersion = extractForceVersion(parameters);
        if (forceVersion != null) {
            args.put(PARAM_FORCE_VERSION, forceVersion);
        }
        boolean isMultiRoot = Boolean.parseBoolean(parameters.getOrDefault("multiRoot", "false"));
        args.put(PARAM_MULE_MULTI_ROOT, isMultiRoot);
        args.put(PARAM_STATE_CALLBACK, stateCallback);
        args.put(PARAM_LOG_CALLBACK, logCallback);

        return invokeToolMethod(MULE_TOOL_COMMAND, MULE_TOOL_CLASS_NAME, MULE_TOOL_METHOD_NAME, args);
    }

    /**
     * Processes multiRoot migration results by splitting text edits per project. Public method for use by the
     * ProjectService to handle multiRoot notifications.
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
                ProjectMigrationResult projectResult = projectResults.computeIfAbsent(projectName,
                        ProjectMigrationResult::new);

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
    private static String extractProjectName(String filePath) {
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
     * already been processed. Public method for use by the ProjectService after processing multiRoot results.
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

    /**
     * Loads the sample multiRoot response from the classpath for testing purposes.
     * TODO: Remove this method once the migration tool is updated to support multiRoot.
     *
     * @return A ToolExecutionResult loaded from sample_multiroot_response.json
     */
    private static ToolExecutionResult loadSampleMultiRootResponse() {
        try {
            InputStream inputStream = MuleImporter.class.getClassLoader()
                    .getResourceAsStream("sample_multiroot_response.json");
            if (inputStream == null) {
                return null;
            }

            try (InputStreamReader reader = new InputStreamReader(inputStream, StandardCharsets.UTF_8)) {
                JsonObject jsonObject = new Gson().fromJson(reader, JsonObject.class);

                // Extract textEdits
                Map<String, String> textEdits = new HashMap<>();
                if (jsonObject.has("textEdits")) {
                    JsonObject textEditsJson = jsonObject.getAsJsonObject("textEdits");
                    for (String key : textEditsJson.keySet()) {
                        textEdits.put(key, textEditsJson.get(key).getAsString());
                    }
                }

                // Extract other fields
                String error = jsonObject.has("error") && !jsonObject.get("error").isJsonNull()
                        ? jsonObject.get("error").getAsString() : null;
                String report = jsonObject.has("report") && !jsonObject.get("report").isJsonNull()
                        ? jsonObject.get("report").getAsString() : null;
                Object jsonReport = jsonObject.has("jsonReport") && !jsonObject.get("jsonReport").isJsonNull()
                        ? jsonObject.get("jsonReport") : null;

                return new ToolExecutionResult(error, textEdits, report, jsonReport);
            }
        } catch (IOException e) {
            System.err.println("Failed to load sample multiRoot response: " + e.getMessage());
            return null;
        }
    }

    private static Integer extractForceVersion(Map<String, String> parameters) {
        String forceVersionStr = parameters.get("forceVersion");
        if (forceVersionStr != null) {
            try {
                int forceVersion = Integer.parseInt(forceVersionStr);
                if (forceVersion == 3 || forceVersion == 4) {
                    return forceVersion;
                }
            } catch (NumberFormatException e) {
                // Fall through to return null
            }
        }
        return null;
    }

}
