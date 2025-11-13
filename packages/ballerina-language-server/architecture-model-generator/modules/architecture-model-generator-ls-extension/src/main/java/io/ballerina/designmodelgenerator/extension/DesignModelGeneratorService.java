/*
 *  Copyright (c) 2024, WSO2 LLC. (http://www.wso2.com)
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

import io.ballerina.artifactsgenerator.ArtifactsCache;
import io.ballerina.artifactsgenerator.ArtifactsGenerator;
import io.ballerina.designmodelgenerator.core.DesignModelGenerator;
import io.ballerina.designmodelgenerator.core.model.DesignModel;
import io.ballerina.designmodelgenerator.extension.request.ArtifactsRequest;
import io.ballerina.designmodelgenerator.extension.request.GetDesignModelRequest;
import io.ballerina.designmodelgenerator.extension.request.ProjectInfoRequest;
import io.ballerina.designmodelgenerator.extension.response.ArtifactResponse;
import io.ballerina.designmodelgenerator.extension.response.GetDesignModelResponse;
import io.ballerina.designmodelgenerator.extension.response.ProjectInfoResponse;
import io.ballerina.projects.BallerinaToml;
import io.ballerina.projects.Package;
import io.ballerina.projects.Project;
import io.ballerina.projects.ProjectKind;
import io.ballerina.projects.TomlDocument;
import io.ballerina.toml.semantic.ast.TomlStringValueNode;
import org.ballerinalang.annotation.JavaSPIService;
import org.ballerinalang.langserver.commons.BallerinaCompilerApi;
import org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.jsonrpc.services.JsonRequest;
import org.eclipse.lsp4j.jsonrpc.services.JsonSegment;
import org.eclipse.lsp4j.services.LanguageServer;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@JavaSPIService("org.ballerinalang.langserver.commons.service.spi.ExtendedLanguageServerService")
@JsonSegment("designModelService")
public class DesignModelGeneratorService implements ExtendedLanguageServerService {

    private WorkspaceManager workspaceManager;

    @Override
    public void init(LanguageServer langServer, WorkspaceManager workspaceManager) {
        this.workspaceManager = workspaceManager;
        ArtifactsCache.initialize();
    }

    @Override
    public Class<?> getRemoteInterface() {
        return null;
    }

    @JsonRequest
    public CompletableFuture<GetDesignModelResponse> getDesignModel(GetDesignModelRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            GetDesignModelResponse response = new GetDesignModelResponse();
            try {
                Path projectPath = Path.of(request.projectPath());
                Project project = workspaceManager.loadProject(projectPath);
                DesignModelGenerator designModelGenerator = new DesignModelGenerator(project.currentPackage());
                DesignModel designModel = designModelGenerator.generate();
                response.setDesignModel(designModel);
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<ArtifactResponse> artifacts(ArtifactsRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            ArtifactResponse response = new ArtifactResponse();
            try {
                Path projectPath = Path.of(request.projectPath());
                Project project = workspaceManager.loadProject(projectPath);
                response.setArtifacts(ArtifactsGenerator.artifacts(project));
                response.setUri(request.projectPath());
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    @JsonRequest
    public CompletableFuture<ProjectInfoResponse> projectInfo(ProjectInfoRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            ProjectInfoResponse response = new ProjectInfoResponse();
            try {
                Path projectPath = Path.of(request.projectRoot());
                Project project = workspaceManager.loadProject(projectPath);
                populateProjectInfo(response, project, true);
            } catch (Throwable e) {
                response.setError(e);
            }
            return response;
        });
    }

    /**
     * Populates a ProjectInfoResponse with project metadata. This method is called recursively for child projects.
     *
     * @param response        The response object to populate
     * @param project         The project to extract information from
     * @param includeChildren Whether to populate children (false for child projects to avoid recursion)
     */
    private void populateProjectInfo(ProjectInfoResponse response, Project project, boolean includeChildren) {
        // Set common project info
        response.setProjectKind(project.kind().name());
        response.setUri(project.sourceRoot().toUri().toString());

        // Handle workspace projects
        if (includeChildren && BallerinaCompilerApi.getInstance().isWorkspaceProject(project)) {
            // For workspace projects, use source root folder name as name
            String workspaceName = project.sourceRoot().getFileName().toString();
            response.setName(workspaceName);

            // Get the title from the workspace toml if present
            String title = BallerinaCompilerApi.getInstance().getWorkspaceToml(project)
                    .flatMap(tomlDocument -> extractTitleFromToml(tomlDocument, "workspace"))
                    .orElse(formatNameToTitle(workspaceName));
            response.setTitle(title);

            // Traverse child projects
            List<ProjectInfoResponse> children = extractChildProjects(project);
            response.setChildren(children);
        } else if (project.kind() == ProjectKind.SINGLE_FILE_PROJECT) {
            // For single file projects, use filename as name/title
            String fileName = project.sourceRoot().getFileName().toString();
            response.setName(fileName);
            response.setTitle(fileName);
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
        }
    }

    /**
     * Extracts the title from Ballerina.toml if present. First tries to read a custom "title" field in Ballerina.toml.
     * Falls back to the package name if no title is specified.
     *
     * @param tomlDocument The TomlDocument to extract title from
     * @param tableName    The table name to look for the title field (e.g., "package" or "workspace")
     * @return Optional containing title if found
     */
    private Optional<String> extractTitleFromToml(TomlDocument tomlDocument, String tableName) {
        try {
            // Try to read title from Ballerina.toml table
            var toml = tomlDocument.toml();
            if (toml.getTable(tableName).isPresent()) {
                var table = toml.getTable(tableName).get();
                if (table.get("title").isPresent()) {
                    var titleValue = table.get("title").get();
                    if (titleValue instanceof TomlStringValueNode stringNode) {
                        return Optional.of(stringNode.getValue());
                    }
                }
            }
        } catch (Exception e) {
            // Ignore and fallback
        }
        return Optional.empty();
    }

    /**
     * Extracts child project information for workspace projects.
     *
     * @param project The workspace project
     * @return List of child project information
     */
    private List<ProjectInfoResponse> extractChildProjects(Project project) {
        List<ProjectInfoResponse> children = new ArrayList<>();

        BallerinaCompilerApi compilerApi = BallerinaCompilerApi.getInstance();
        if (compilerApi.isWorkspaceProject(project)) {
            List<Project> workspaceProjects = compilerApi.getWorkspaceProjectsInOrder(project);
            for (Project childProject : workspaceProjects) {
                ProjectInfoResponse childResponse = new ProjectInfoResponse();
                // Populate child project info (without their children to keep safe from recursion)
                populateProjectInfo(childResponse, childProject, false);
                children.add(childResponse);
            }
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
    private String formatNameToTitle(String name) {
        if (name == null || name.isEmpty()) {
            return name;
        }

        // Step 1: Split by underscores (snake_case)
        String[] segments = name.split("_");

        // Step 2: Process each segment for camelCase
        List<String> words = new ArrayList<>();
        for (String segment : segments) {
            words.addAll(splitCamelCase(segment));
        }

        // Step 3: Capitalize and join
        return words.stream()
                .map(this::capitalize)
                .collect(Collectors.joining(" "));
    }

    /**
     * Splits a camelCase string into individual words.
     *
     * @param text The camelCase text to split
     * @return List of words
     */
    private List<String> splitCamelCase(String text) {
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
    private String capitalize(String word) {
        if (word == null || word.isEmpty()) {
            return word;
        }
        return word.substring(0, 1).toUpperCase(java.util.Locale.ROOT) + word.substring(1);
    }
}
