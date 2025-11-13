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
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

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
            String fileName = project.sourceRoot().getFileName().toString();
            response.setName(fileName);

            // Get the title from the workspace toml if present
            String title = BallerinaCompilerApi.getInstance().getWorkspaceToml(project)
                    .flatMap(tomlDocument -> extractTitleFromToml(tomlDocument, "workspace"))
                    .orElse(fileName);
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
                    .orElse(packageName);
            response.setTitle(title);
        }
    }

    /**
     * Extracts the title from Ballerina.toml if present. First tries to read a custom "title" field in Ballerina.toml.
     * Falls back to the package name if no title is specified.
     *
     * @param tomlDocument The TomlDocument to extract title from
     * @return Optional containing title
     */
    private Optional<String> extractTitleFromToml(TomlDocument tomlDocument, String tableName) {
        try {
            // Try to read title from Ballerina.toml [package] table
            var toml = tomlDocument.toml();
            if (toml.getTable(tableName).isPresent()) {
                var packageTable = toml.getTable(tableName).get();
                if (packageTable.get("title").isPresent()) {
                    var titleValue = packageTable.get("title").get();
                    if (titleValue instanceof TomlStringValueNode stringNode) {
                        return Optional.of(stringNode.getValue());
                    }
                }
            }
        } catch (Exception e) {
            // If anything goes wrong reading the TOML, fall back to package name
        }

        // Fallback to package name
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
}
