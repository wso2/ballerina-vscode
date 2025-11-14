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

package io.ballerina.designmodelgenerator.extension;

import io.ballerina.designmodelgenerator.extension.response.ProjectInfoResponse;
import io.ballerina.projects.BallerinaToml;
import io.ballerina.projects.Package;
import io.ballerina.projects.Project;
import io.ballerina.projects.ProjectKind;
import io.ballerina.projects.TomlDocument;
import io.ballerina.toml.semantic.ast.TomlStringValueNode;
import org.ballerinalang.langserver.commons.BallerinaCompilerApi;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Builds project information by extracting and mapping metadata from a given {@link Project} into a
 * {@link ProjectInfoResponse}.
 *
 * @since 1.4.2
 */
public final class ProjectInfoBuilder {

    private final ProjectInfoResponse response;
    private final Project project;
    private final boolean includeChildren;

    /**
     * Creates a new ProjectVisitor with the specified parameters.
     *
     * @param response        The response object to populate
     * @param project         The project to extract information from
     * @param includeChildren Whether to populate children (false for child projects to avoid recursion)
     */
    public ProjectInfoBuilder(ProjectInfoResponse response, Project project, boolean includeChildren) {
        this.response = response;
        this.project = project;
        this.includeChildren = includeChildren;
    }

    /**
     * Populates the response with project metadata.
     */
    public void populate() {
        // Set common project info
        response.setProjectKind(project.kind().name());
        response.setProjectPath(project.sourceRoot().toString());

        // Handle workspace projects
        Path filePath = project.sourceRoot().getFileName();
        if (includeChildren && BallerinaCompilerApi.getInstance().isWorkspaceProject(project)) {
            // For workspace projects, use source root folder name as name
            String workspaceName = filePath != null ? filePath.toString() : "Workspace";
            response.setName(workspaceName);

            // Get the title from the workspace toml if present
            String title = BallerinaCompilerApi.getInstance().getWorkspaceToml(project)
                    .flatMap(tomlDocument -> extractTitleFromToml(tomlDocument, "workspace"))
                    .orElse(formatNameToTitle(workspaceName));
            response.setTitle(title);

            // Traverse child projects
            List<ProjectInfoResponse> children = extractChildProjects();
            response.setChildren(children);
        } else if (project.kind() == ProjectKind.SINGLE_FILE_PROJECT) {
            // For single file projects, use filename as name/title
            String projectName = filePath != null ? filePath.toString() : "Single File";
            response.setName(projectName);
            response.setTitle(projectName);
        } else {
            // Get the project name from the current package
            Package currentPackage = project.currentPackage();
            String packageName = currentPackage.packageName().value();
            response.setName(packageName);

            // Get the title from Ballerina.toml if present
            String title = currentPackage.ballerinaToml()
                    .map(BallerinaToml::tomlDocument)
                    .flatMap(tomlDocument -> extractTitleFromToml(tomlDocument, "package"))
                    .orElse(formatNameToTitle(packageName));
            response.setTitle(title);

            // Set org and version for build projects
            response.setOrg(currentPackage.packageOrg().value());
            response.setVersion(currentPackage.packageVersion().value().toString());
        }
    }

    /**
     * Extracts the title from Ballerina.toml if present. First tries to read a custom "title" field in Ballerina.toml.
     *
     * @param tomlDocument The TomlDocument to extract title from
     * @param tableName    The table name to look for the title field (e.g., "package" or "workspace")
     * @return Optional containing title if found
     */
    private Optional<String> extractTitleFromToml(TomlDocument tomlDocument, String tableName) {
        return tomlDocument.toml()
                .getTable(tableName)
                .flatMap(table -> table.get("title"))
                .filter(titleValue -> titleValue instanceof TomlStringValueNode)
                .map(titleValue -> ((TomlStringValueNode) titleValue).getValue());
    }

    /**
     * Extracts child project information for workspace projects.
     *
     * @return List of child project information
     */
    private List<ProjectInfoResponse> extractChildProjects() {
        List<ProjectInfoResponse> children = new ArrayList<>();
        List<Project> workspaceProjects = BallerinaCompilerApi.getInstance().getWorkspaceProjectsInOrder(project);
        for (Project childProject : workspaceProjects) {
            ProjectInfoResponse childResponse = new ProjectInfoResponse();
            // Populate child project info (without their children to avoid recursion)
            ProjectInfoBuilder childVisitor = new ProjectInfoBuilder(childResponse, childProject, false);
            childVisitor.populate();
            children.add(childResponse);
        }
        return children;
    }

    /**
     * Formats a package/project name to title case for display purposes. Converts snake_case and camelCase to Title
     * Case.
     *
     * @param name The name to format
     * @return The formatted title case string
     */
    private static String formatNameToTitle(String name) {
        if (name == null || name.isEmpty()) {
            return name;
        }

        // Step 1: Split the `snake_case` word by underscores
        String[] segments = name.split("_");

        // Step 2: Process each segment for camelCase
        List<String> words = new ArrayList<>();
        for (String segment : segments) {
            words.addAll(splitCamelCase(segment));
        }

        // Step 3: Capitalize and join
        return words.stream()
                .map(ProjectInfoBuilder::capitalize)
                .collect(Collectors.joining(" "));
    }

    /**
     * Splits a `camelCase` string into individual words.
     *
     * @param text The `camelCase` text to split
     * @return List of words
     */
    private static List<String> splitCamelCase(String text) {
        if (text == null || text.isEmpty()) {
            return new ArrayList<>();
        }
        // Use regex to split on camelCase boundaries (lowercase to uppercase transitions)
        return Arrays.asList(text.split("(?<=[a-z])(?=[A-Z])"));
    }

    /**
     * Capitalizes the first letter of a word and lowercases the rest.
     *
     * @param word The word to capitalize
     * @return The capitalized word
     */
    private static String capitalize(String word) {
        if (word == null || word.isEmpty()) {
            return word;
        }
        return word.substring(0, 1).toUpperCase(Locale.ROOT) + word.substring(1);
    }
}
