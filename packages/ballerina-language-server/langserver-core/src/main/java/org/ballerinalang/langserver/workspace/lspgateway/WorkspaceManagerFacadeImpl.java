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
import io.ballerina.projects.Module;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.Project;
import io.ballerina.projects.ProjectException;
import org.ballerinalang.langserver.commons.eventsync.exceptions.EventSyncException;
import org.ballerinalang.langserver.commons.workspace.RunContext;
import org.ballerinalang.langserver.commons.workspace.RunResult;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationService;
import org.ballerinalang.langserver.workspace.documentstore.DocumentService;
import org.ballerinalang.langserver.workspace.executionmanager.ExecutionService;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.io.IOException;
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
 *
 * @since 1.7.0
 */
public final class WorkspaceManagerFacadeImpl implements WorkspaceManager {

    private final ProjectService projectService;
    private final CompilationService compilationService;
    private final DocumentService documentService;
    private final ExecutionService executionService;
    private final ClientSession clientSession;

    /**
     * Creates a new facade with all required service dependencies.
     *
     * @param projectService project service
     * @param compilationService compilation service
     * @param documentService document service
     * @param executionService execution service
     * @param clientSession client session
     */
    public WorkspaceManagerFacadeImpl(
            ProjectService projectService,
            CompilationService compilationService,
            DocumentService documentService,
            ExecutionService executionService,
            ClientSession clientSession) {
        this.projectService = projectService;
        this.compilationService = compilationService;
        this.documentService = documentService;
        this.executionService = executionService;
        this.clientSession = clientSession;
    }

    @Override
    public Optional<String> relativePath(Path path) {
        return Optional.ofNullable(documentService.relativePath(path, null));
    }

    @Override
    public Optional<String> relativePath(Path path, CancelChecker cancelChecker) {
        return Optional.ofNullable(documentService.relativePath(path, cancelChecker));
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
        Project project = projectService.loadOrCreate(filePath, null);
        return Optional.ofNullable(project);
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
        Document document = documentService.document(filePath, null);
        return Optional.ofNullable(document);
    }

    @Override
    public Optional<Document> document(Path filePath, CancelChecker cancelChecker) {
        Document document = documentService.document(filePath, cancelChecker);
        return Optional.ofNullable(document);
    }

    @Override
    public Optional<SyntaxTree> syntaxTree(Path filePath) {
        SyntaxTree tree = compilationService.syntaxTree(filePath, null);
        return Optional.ofNullable(tree);
    }

    @Override
    public Optional<SyntaxTree> syntaxTree(Path filePath, CancelChecker cancelChecker) {
        SyntaxTree tree = compilationService.syntaxTree(filePath, cancelChecker);
        return Optional.ofNullable(tree);
    }

    @Override
    public Optional<SemanticModel> semanticModel(Path filePath) {
        SemanticModel model = compilationService.semanticModel(filePath, null);
        return Optional.ofNullable(model);
    }

    @Override
    public Optional<SemanticModel> semanticModel(Path filePath, CancelChecker cancelChecker) {
        SemanticModel model = compilationService.semanticModel(filePath, cancelChecker);
        return Optional.ofNullable(model);
    }

    @Override
    public Optional<PackageCompilation> waitAndGetPackageCompilation(Path filePath) {
        PackageCompilation compilation = compilationService.compilation(filePath, null);
        return Optional.ofNullable(compilation);
    }

    @Override
    public Optional<PackageCompilation> waitAndGetPackageCompilation(Path filePath, CancelChecker cancelChecker) {
        PackageCompilation compilation = compilationService.compilation(filePath, cancelChecker);
        return Optional.ofNullable(compilation);
    }

    @Override
    public void didOpen(Path filePath, DidOpenTextDocumentParams params) throws WorkspaceDocumentException {
        documentService.didOpen(filePath, params);
    }

    @Override
    public void didChange(Path filePath, DidChangeTextDocumentParams params) throws WorkspaceDocumentException {
        documentService.didChange(filePath, params);
    }

    @Override
    public void didClose(Path filePath, DidCloseTextDocumentParams params) {
        documentService.didClose(filePath, params);
    }

    @Override
    public void didChangeWatched(Path filePath, FileEvent fileEvent) throws WorkspaceDocumentException {
        documentService.didChangeWatched(filePath, fileEvent);
    }

    @Override
    public List<Path> didChangeWatched(DidChangeWatchedFilesParams params) throws WorkspaceDocumentException {
        documentService.didChangeWatched(params);
        return List.of();
    }

    @Override
    public String uriScheme() {
        return documentService.uriScheme();
    }

    @Override
    public RunResult run(RunContext runContext) throws IOException {
        executionService.run(runContext);
        return new RunResult(null, List.of());
    }

    @Override
    public boolean stop(Path filePath) {
        executionService.stop(new org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot(filePath));
        return true;
    }

    @Override
    public CompletableFuture<Map<Path, Project>> workspaceProjects() {
        Collection<Project> projects = projectService.allProjects();
        Map<Path, Project> projectMap = projects.stream()
                .collect(Collectors.toMap(Project::sourceRoot, p -> p));
        return CompletableFuture.completedFuture(projectMap);
    }
}
