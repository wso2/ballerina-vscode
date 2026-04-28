/*
 *  Copyright (c) 2026, WSO2 LLC. (http://www.wso2.com)
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

package org.ballerinalang.langserver.workspace.lspgateway;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.PackageDescriptor;
import io.ballerina.projects.Project;
import io.ballerina.projects.ProjectException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.RunContext;
import org.ballerinalang.langserver.commons.workspace.RunResult;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationService;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.StableSnapshot;
import org.ballerinalang.langserver.workspace.execution.WorkspaceRunService;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.DocumentUri;
import org.ballerinalang.langserver.workspace.executionmanager.ExecutionService;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Pure facade implementation that delegates all WorkspaceManager methods to bounded context services.
 * No domain logic, no conditionals, max 5 lines per method.
 * All URI schemes are handled directly without proxy routing (ADR-040).
 *
 * @since 1.7.0
 */
public final class WorkspaceManagerFacadeImpl implements WorkspaceManager {

    private final ProjectService projectService;
    private final CompilationService compilationService;
    private final ExecutionService executionService;
    private final WorkspaceRunService workspaceRunService;

    /**
     * Creates a new facade with all required service dependencies.
     *
     * @param projectService project service
     * @param compilationService compilation service
     * @param executionService execution service
     */
    public WorkspaceManagerFacadeImpl(
            ProjectService projectService,
            CompilationService compilationService,
            ExecutionService executionService) {
        this.projectService = projectService;
        this.compilationService = compilationService;
        this.executionService = executionService;
        this.workspaceRunService = new WorkspaceRunService(projectService);
    }

    @Override
    public Optional<String> relativePath(Path path) {
        try {
            Path root = projectService.loadOrCreate(path, null).sourceRoot();
            return Optional.of(root.relativize(path).toString());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<String> relativePath(Path path, CancelChecker cancelChecker) {
        try {
            Path root = projectService.loadOrCreate(path, cancelChecker).sourceRoot();
            return Optional.of(root.relativize(path).toString());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Path projectRoot(Path path) {
        Project project = projectService.loadOrCreate(path, null);
        return project.sourceRoot();
    }

    @Override
    public Path projectRoot(Path path, CancelChecker cancelChecker) {
        Project project = projectService.loadOrCreate(path, cancelChecker);
        return project.sourceRoot();
    }

    @Override
    public Optional<Project> project(Path filePath) {
        return projectService.project(filePath);
    }

    @Override
    public Project loadProject(Path filePath) throws ProjectException, WorkspaceDocumentException, EventSyncException {
        return projectService.loadOrCreate(filePath, null);
    }

    @Override
    public Optional<Module> module(Path filePath) {
        Module module = projectService.module(filePath, null);
        return Optional.ofNullable(module);
    }

    @Override
    public Optional<Module> module(Path filePath, CancelChecker cancelChecker) {
        Module module = projectService.module(filePath, cancelChecker);
        return Optional.ofNullable(module);
    }

    @Override
    public Optional<Document> document(Path filePath) {
        try {
            Project project = projectService.loadOrCreate(filePath, null);
            DocumentId docId = project.documentId(filePath);
            return Optional.of(project.currentPackage().module(docId.moduleId()).document(docId));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<Document> document(Path filePath, CancelChecker cancelChecker) {
        try {
            Project project = projectService.loadOrCreate(filePath, cancelChecker);
            DocumentId docId = project.documentId(filePath);
            return Optional.of(project.currentPackage().module(docId.moduleId()).document(docId));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<SyntaxTree> syntaxTree(Path filePath) {
        try {
            Project project = projectService.loadOrCreate(filePath, null);
            DocumentId docId = project.documentId(filePath);
            return Optional.of(project.currentPackage().module(docId.moduleId()).document(docId).syntaxTree());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<SyntaxTree> syntaxTree(Path filePath, CancelChecker cancelChecker) {
        try {
            Project project = projectService.loadOrCreate(filePath, cancelChecker);
            DocumentId docId = project.documentId(filePath);
            return Optional.of(project.currentPackage().module(docId.moduleId()).document(docId).syntaxTree());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<SemanticModel> semanticModel(Path filePath) {
        try {
            Project project = projectService.loadOrCreate(filePath, null);
            DocumentId docId = project.documentId(filePath);
            PackageCompilation compilation = project.currentPackage().getCompilation();
            return Optional.of(compilation.getSemanticModel(docId.moduleId()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<SemanticModel> semanticModel(Path filePath, CancelChecker cancelChecker) {
        try {
            Project project = projectService.loadOrCreate(filePath, cancelChecker);
            DocumentId docId = project.documentId(filePath);
            PackageCompilation compilation = project.currentPackage().getCompilation();
            return Optional.of(compilation.getSemanticModel(docId.moduleId()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<PackageCompilation> waitAndGetPackageCompilation(Path filePath) {
        try {
            Project project = projectService.loadOrCreate(filePath, null);
            PackageDescriptor descriptor = project.currentPackage().descriptor();
            StableSnapshot snapshot = compilationService.stableSnapshot(project, descriptor, null);
            PackageCompilation compilation = snapshot == null ? null : snapshot.compilation();
            return Optional.ofNullable(compilation);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<PackageCompilation> waitAndGetPackageCompilation(Path filePath, CancelChecker cancelChecker) {
        try {
            Project project = projectService.loadOrCreate(filePath, cancelChecker);
            PackageDescriptor descriptor = project.currentPackage().descriptor();
            StableSnapshot snapshot = compilationService.stableSnapshot(project, descriptor, cancelChecker);
            PackageCompilation compilation = snapshot == null ? null : snapshot.compilation();
            return Optional.ofNullable(compilation);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Override
    public void didOpen(Path filePath, DidOpenTextDocumentParams params) throws WorkspaceDocumentException {
        try {
            String uriString = params.getTextDocument().getUri();
            String content = params.getTextDocument().getText();
            projectService.didOpen(toDocumentUri(uriString), content);
        } catch (RuntimeException e) {
            projectService.evictProject(filePath);
            throw new WorkspaceDocumentException(e);
        }
    }

    @Override
    public void didChange(Path filePath, DidChangeTextDocumentParams params) throws WorkspaceDocumentException {
        projectService.loadOrCreate(filePath, null);
        String uriString = params.getTextDocument().getUri();
        projectService.didChange(toDocumentUri(uriString), params.getContentChanges());
    }

    @Override
    public void didClose(Path filePath, DidCloseTextDocumentParams params) {
        projectService.loadOrCreate(filePath, null);
        String uriString = params.getTextDocument().getUri();
        projectService.didClose(toDocumentUri(uriString));
    }

    @Override
    public void didChangeWatched(Path filePath, FileEvent fileEvent) throws WorkspaceDocumentException {
        projectService.didChangeWatchedFiles(List.of(fileEvent));
    }

    @Override
    public List<Path> didChangeWatched(DidChangeWatchedFilesParams params) throws WorkspaceDocumentException {
        List<FileEvent> events = params != null && params.getChanges() != null
                ? params.getChanges() : List.of();
        projectService.didChangeWatchedFiles(events);
        return List.of();
    }

    @Override
    public String uriScheme() {
        return "file";
    }

    @Override
    public RunResult run(RunContext runContext) throws IOException {
        return workspaceRunService.run(runContext);
    }

    @Override
    public boolean stop(Path filePath) {
        Path sourceRoot = workspaceRunService.sourceRoot(filePath);
        boolean stopped = workspaceRunService.stop(filePath);
        try {
            executionService.stop(new DocumentUri.FileUri(sourceRoot.toUri()));
            return stopped;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public CompletableFuture<Map<Path, Project>> workspaceProjects() {
        Collection<Project> projects = projectService.allProjects();
        Map<Path, Project> projectMap = projects.stream()
                .collect(Collectors.toMap(Project::sourceRoot, p -> p));
        return CompletableFuture.completedFuture(projectMap);
    }

    /**
     * Converts a URI string to a typed {@link DocumentUri} based on its scheme.
     *
     * @param uriString the URI string from LSP params
     * @return the corresponding DocumentUri subtype
     */
    private DocumentUri toDocumentUri(String uriString) {
        URI uri = URI.create(uriString);
        return switch (uri.getScheme()) {
            case "file" -> new DocumentUri.FileUri(uri);
            case "expr" -> new DocumentUri.ExprUri(uri);
            case "ai" -> new DocumentUri.AiUri(uri);
            default -> throw new IllegalArgumentException("Unknown URI scheme: " + uri.getScheme());
        };
    }

}
