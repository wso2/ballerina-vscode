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
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.Package;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.PackageDescriptor;
import io.ballerina.projects.Project;
import org.ballerinalang.langserver.commons.workspace.RunContext;
import org.ballerinalang.langserver.commons.workspace.RunResult;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationService;
import org.ballerinalang.langserver.workspace.compilerengine.StableSnapshot;
import org.ballerinalang.langserver.workspace.workspacemanager.ContentVersion;
import org.ballerinalang.langserver.workspace.workspacemanager.DocumentUri;
import org.ballerinalang.langserver.workspace.executionmanager.ExecutionService;
import org.ballerinalang.langserver.workspace.executionmanager.ProcessId;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.TextDocumentItem;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

/**
 * Tests for WorkspaceManagerFacadeImpl pure delegation behavior.
 *
 * @since 1.7.0
 */
public class WorkspaceManagerFacadeImplTest {

    private ProjectService mockProjectService;
    private CompilationService mockCompilationService;
    private ExecutionService mockExecutionService;
    private ClientSession mockClientSession;
    private WorkspaceManagerFacadeImpl facade;
    private Path testPath;

    @BeforeMethod
    public void setUp() throws Exception {
        mockProjectService = Mockito.mock(ProjectService.class);
        mockCompilationService = Mockito.mock(CompilationService.class);
        mockExecutionService = Mockito.mock(ExecutionService.class);
        mockClientSession = Mockito.mock(ClientSession.class);

        facade = new WorkspaceManagerFacadeImpl(
                mockProjectService,
                mockCompilationService,
                mockExecutionService
        );

        Path workspaceDir = Files.createTempDirectory("workspace-facade-test").toAbsolutePath().normalize();
        testPath = Files.writeString(workspaceDir.resolve("main.bal"), "function main() {}\n");
    }

    @Test
    public void testRelativePath_DelegatesToProjectService() {
        Path expectedRoot = testPath.getParent();
        Project mockProject = Mockito.mock(Project.class);
        Mockito.when(mockProject.sourceRoot()).thenReturn(expectedRoot);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.isNull()))
                .thenReturn(mockProject);

        Optional<String> result = facade.relativePath(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), "main.bal");
        Mockito.verify(mockProjectService).loadOrCreate(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testRelativePath_ReturnsEmpty_WhenProjectNotFound() {
        Mockito.when(mockProjectService.loadOrCreate(Mockito.any(), Mockito.any()))
                .thenThrow(new RuntimeException("not found"));

        Optional<String> result = facade.relativePath(testPath);

        Assert.assertFalse(result.isPresent());
    }

    @Test
    public void testRelativePathWithCancelChecker_DelegatesToProjectService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        Path expectedRoot = testPath.getParent();
        Project mockProject = Mockito.mock(Project.class);
        Mockito.when(mockProject.sourceRoot()).thenReturn(expectedRoot);
        Mockito.when(mockProjectService.loadOrCreate(testPath, cancelChecker))
                .thenReturn(mockProject);

        Optional<String> result = facade.relativePath(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), "main.bal");
        Mockito.verify(mockProjectService).loadOrCreate(testPath, cancelChecker);
    }

    @Test
    public void testProjectRoot_DelegatesToProjectService() {
        Path expectedRoot = Paths.get("/test/project").toAbsolutePath().normalize();
        Project mockProject = Mockito.mock(Project.class);
        Mockito.when(mockProject.sourceRoot()).thenReturn(expectedRoot);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockProject);

        Path result = facade.projectRoot(testPath);

        Assert.assertEquals(result, expectedRoot);
        Mockito.verify(mockProjectService).loadOrCreate(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testProjectRootWithCancelChecker_DelegatesToProjectService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        Path expectedRoot = Paths.get("/test/project").toAbsolutePath().normalize();
        Project mockProject = Mockito.mock(Project.class);
        Mockito.when(mockProject.sourceRoot()).thenReturn(expectedRoot);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.eq(cancelChecker)))
                .thenReturn(mockProject);

        Path result = facade.projectRoot(testPath, cancelChecker);

        Assert.assertEquals(result, expectedRoot);
        Mockito.verify(mockProjectService).loadOrCreate(testPath, cancelChecker);
    }

    @Test
    public void testProject_DelegatesToProjectService() {
        Project mockProject = Mockito.mock(Project.class);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockProject);

        Optional<Project> result = facade.project(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockProject);
        Mockito.verify(mockProjectService).loadOrCreate(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testLoadProject_DelegatesToProjectService() throws Exception {
        Project mockProject = Mockito.mock(Project.class);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockProject);

        Project result = facade.loadProject(testPath);

        Assert.assertEquals(result, mockProject);
        Mockito.verify(mockProjectService).loadOrCreate(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testModule_DelegatesToProjectService() {
        Module mockModule = Mockito.mock(Module.class);
        Mockito.when(mockProjectService.module(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockModule);

        Optional<Module> result = facade.module(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockModule);
        Mockito.verify(mockProjectService).module(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testModuleWithCancelChecker_DelegatesToProjectService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        Module mockModule = Mockito.mock(Module.class);
        Mockito.when(mockProjectService.module(testPath, cancelChecker))
                .thenReturn(mockModule);

        Optional<Module> result = facade.module(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockModule);
        Mockito.verify(mockProjectService).module(testPath, cancelChecker);
    }

    @Test
    public void testDocument_DelegatesToProjectService() {
        Project mockProject = Mockito.mock(Project.class);
        DocumentId mockDocId = Mockito.mock(DocumentId.class);
        ModuleId mockModuleId = Mockito.mock(ModuleId.class);
        Package mockPackage = Mockito.mock(Package.class);
        Module mockModule = Mockito.mock(Module.class);
        Document mockDocument = Mockito.mock(Document.class);

        Mockito.when(mockDocId.moduleId()).thenReturn(mockModuleId);
        Mockito.when(mockProject.documentId(testPath)).thenReturn(mockDocId);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.module(mockModuleId)).thenReturn(mockModule);
        Mockito.when(mockModule.document(mockDocId)).thenReturn(mockDocument);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.isNull()))
                .thenReturn(mockProject);

        Optional<Document> result = facade.document(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockDocument);
        Mockito.verify(mockProjectService).loadOrCreate(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testDocument_ReturnsEmpty_WhenProjectFails() {
        Mockito.when(mockProjectService.loadOrCreate(Mockito.any(), Mockito.any()))
                .thenThrow(new RuntimeException("not found"));

        Optional<Document> result = facade.document(testPath);

        Assert.assertFalse(result.isPresent());
    }

    @Test
    public void testDocumentWithCancelChecker_DelegatesToProjectService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        Project mockProject = Mockito.mock(Project.class);
        DocumentId mockDocId = Mockito.mock(DocumentId.class);
        ModuleId mockModuleId = Mockito.mock(ModuleId.class);
        Package mockPackage = Mockito.mock(Package.class);
        Module mockModule = Mockito.mock(Module.class);
        Document mockDocument = Mockito.mock(Document.class);

        Mockito.when(mockDocId.moduleId()).thenReturn(mockModuleId);
        Mockito.when(mockProject.documentId(testPath)).thenReturn(mockDocId);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.module(mockModuleId)).thenReturn(mockModule);
        Mockito.when(mockModule.document(mockDocId)).thenReturn(mockDocument);
        Mockito.when(mockProjectService.loadOrCreate(testPath, cancelChecker))
                .thenReturn(mockProject);

        Optional<Document> result = facade.document(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockDocument);
        Mockito.verify(mockProjectService).loadOrCreate(testPath, cancelChecker);
    }

    @Test
    public void testSyntaxTree_DelegatesToCompilationService() {
        SyntaxTree mockTree = Mockito.mock(SyntaxTree.class);
        StableSnapshot snapshot = createStableSnapshot(mockTree, Mockito.mock(SemanticModel.class),
                Mockito.mock(PackageCompilation.class));
        PackageDescriptor mockDescriptor = Mockito.mock(PackageDescriptor.class);
        Project mockProject = Mockito.mock(Project.class);
        Package mockPackage = Mockito.mock(Package.class);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.isNull())).thenReturn(mockProject);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.descriptor()).thenReturn(mockDescriptor);
        Mockito.when(mockCompilationService.stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.isNull()))
                .thenReturn(snapshot);

        Optional<SyntaxTree> result = facade.syntaxTree(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockTree);
        Mockito.verify(mockCompilationService).stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.isNull());
    }

    @Test
    public void testSyntaxTreeWithCancelChecker_DelegatesToCompilationService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        SyntaxTree mockTree = Mockito.mock(SyntaxTree.class);
        StableSnapshot snapshot = createStableSnapshot(mockTree, Mockito.mock(SemanticModel.class),
                Mockito.mock(PackageCompilation.class));
        PackageDescriptor mockDescriptor = Mockito.mock(PackageDescriptor.class);
        Project mockProject = Mockito.mock(Project.class);
        Package mockPackage = Mockito.mock(Package.class);
        Mockito.when(mockProjectService.loadOrCreate(testPath, cancelChecker)).thenReturn(mockProject);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.descriptor()).thenReturn(mockDescriptor);
        Mockito.when(mockCompilationService.stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.eq(cancelChecker)))
                .thenReturn(snapshot);

        Optional<SyntaxTree> result = facade.syntaxTree(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockTree);
        Mockito.verify(mockCompilationService).stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.eq(cancelChecker));
    }

    @Test
    public void testSemanticModel_DelegatesToCompilationService() {
        SemanticModel mockModel = Mockito.mock(SemanticModel.class);
        StableSnapshot snapshot = createStableSnapshot(Mockito.mock(SyntaxTree.class), mockModel,
                Mockito.mock(PackageCompilation.class));
        PackageDescriptor mockDescriptor = Mockito.mock(PackageDescriptor.class);
        Project mockProject = Mockito.mock(Project.class);
        Package mockPackage = Mockito.mock(Package.class);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.isNull())).thenReturn(mockProject);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.descriptor()).thenReturn(mockDescriptor);
        Mockito.when(mockCompilationService.stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.isNull()))
                .thenReturn(snapshot);

        Optional<SemanticModel> result = facade.semanticModel(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockModel);
        Mockito.verify(mockCompilationService).stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.isNull());
    }

    @Test
    public void testSemanticModelWithCancelChecker_DelegatesToCompilationService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        SemanticModel mockModel = Mockito.mock(SemanticModel.class);
        StableSnapshot snapshot = createStableSnapshot(Mockito.mock(SyntaxTree.class), mockModel,
                Mockito.mock(PackageCompilation.class));
        PackageDescriptor mockDescriptor = Mockito.mock(PackageDescriptor.class);
        Project mockProject = Mockito.mock(Project.class);
        Package mockPackage = Mockito.mock(Package.class);
        Mockito.when(mockProjectService.loadOrCreate(testPath, cancelChecker)).thenReturn(mockProject);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.descriptor()).thenReturn(mockDescriptor);
        Mockito.when(mockCompilationService.stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.eq(cancelChecker)))
                .thenReturn(snapshot);

        Optional<SemanticModel> result = facade.semanticModel(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockModel);
        Mockito.verify(mockCompilationService).stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.eq(cancelChecker));
    }

    @Test
    public void testWaitAndGetPackageCompilation_DelegatesToCompilationService() {
        PackageCompilation mockCompilation = Mockito.mock(PackageCompilation.class);
        StableSnapshot snapshot = createStableSnapshot(Mockito.mock(SyntaxTree.class), Mockito.mock(SemanticModel.class),
                mockCompilation);
        PackageDescriptor mockDescriptor = Mockito.mock(PackageDescriptor.class);
        Project mockProject = Mockito.mock(Project.class);
        Package mockPackage = Mockito.mock(Package.class);
        Mockito.when(mockProjectService.loadOrCreate(Mockito.eq(testPath), Mockito.isNull())).thenReturn(mockProject);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.descriptor()).thenReturn(mockDescriptor);
        Mockito.when(mockCompilationService.stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.isNull()))
                .thenReturn(snapshot);

        Optional<PackageCompilation> result = facade.waitAndGetPackageCompilation(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockCompilation);
        Mockito.verify(mockCompilationService).stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.isNull());
    }

    @Test
    public void testWaitAndGetPackageCompilationWithCancelChecker_DelegatesToCompilationService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        PackageCompilation mockCompilation = Mockito.mock(PackageCompilation.class);
        StableSnapshot snapshot = createStableSnapshot(Mockito.mock(SyntaxTree.class), Mockito.mock(SemanticModel.class),
                mockCompilation);
        PackageDescriptor mockDescriptor = Mockito.mock(PackageDescriptor.class);
        Project mockProject = Mockito.mock(Project.class);
        Package mockPackage = Mockito.mock(Package.class);
        Mockito.when(mockProjectService.loadOrCreate(testPath, cancelChecker)).thenReturn(mockProject);
        Mockito.when(mockProject.currentPackage()).thenReturn(mockPackage);
        Mockito.when(mockPackage.descriptor()).thenReturn(mockDescriptor);
        Mockito.when(mockCompilationService.stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.eq(cancelChecker)))
                .thenReturn(snapshot);

        Optional<PackageCompilation> result = facade.waitAndGetPackageCompilation(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockCompilation);
        Mockito.verify(mockCompilationService).stableSnapshot(Mockito.any(Project.class),
                Mockito.eq(mockDescriptor), Mockito.eq(cancelChecker));
    }

    @Test
    public void testDidOpen_FileUri_DelegatesToProjectService() throws Exception {
        String uriString = "file:///test/project/main.bal";
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem(uriString, "ballerina", 1, "import ballerina/io;"));

        facade.didOpen(testPath, params);

        Mockito.verify(mockProjectService).didOpen(
                Mockito.eq(new DocumentUri.FileUri(URI.create(uriString))),
                Mockito.eq("import ballerina/io;"));
    }

    @Test
    public void testDidChange_FileUri_DelegatesToProjectService() throws Exception {
        String uriString = "file:///test/project/main.bal";
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        params.setTextDocument(new org.eclipse.lsp4j.VersionedTextDocumentIdentifier(uriString, 2));
        TextDocumentContentChangeEvent change = new TextDocumentContentChangeEvent("new content");
        params.setContentChanges(List.of(change));

        facade.didChange(testPath, params);

        Mockito.verify(mockProjectService).didChange(
                Mockito.eq(new DocumentUri.FileUri(URI.create(uriString))),
                Mockito.eq(List.of(change)));
    }

    @Test
    public void testDidClose_FileUri_DelegatesToProjectService() {
        String uriString = "file:///test/project/main.bal";
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        params.setTextDocument(new org.eclipse.lsp4j.TextDocumentIdentifier(uriString));

        facade.didClose(testPath, params);

        Mockito.verify(mockProjectService).didClose(
                Mockito.eq(new DocumentUri.FileUri(URI.create(uriString))));
    }

    @Test
    public void testDidOpen_ExprUri_DelegatesToProjectService() throws Exception {
        String uriString = "expr:///test/expr.bal";
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem(uriString, "ballerina", 1, "1 + 2"));

        facade.didOpen(testPath, params);

        Mockito.verify(mockProjectService).didOpen(
                Mockito.eq(new DocumentUri.ExprUri(URI.create(uriString))),
                Mockito.eq("1 + 2"));
    }

    @Test
    public void testDidChangeWatched_SingleEvent_DelegatesToProjectService() throws Exception {
        FileEvent event = new FileEvent("file:///test/project/main.bal", FileChangeType.Changed);

        facade.didChangeWatched(testPath, event);

        Mockito.verify(mockProjectService).didChangeWatchedFiles(List.of(event));
    }

    @Test
    public void testDidChangeWatched_BatchEvent_DelegatesToProjectService() throws Exception {
        DidChangeWatchedFilesParams params = new DidChangeWatchedFilesParams();
        params.setChanges(Collections.emptyList());

        List<Path> result = facade.didChangeWatched(params);

        Assert.assertNotNull(result);
        Mockito.verify(mockProjectService).didChangeWatchedFiles(Collections.emptyList());
    }

    @Test
    public void testDidChangeWatched_DeletedFile_RemovesFromProject() throws Exception {
        String uriString = "file:///test/project/main.bal";
        FileEvent event = new FileEvent(uriString, FileChangeType.Deleted);
        DidChangeWatchedFilesParams params = new DidChangeWatchedFilesParams();
        params.setChanges(List.of(event));

        facade.didChangeWatched(params);

        Mockito.verify(mockProjectService).didChangeWatchedFiles(List.of(event));
        Mockito.verify(mockProjectService).removeDocumentFromProject(Mockito.any(Path.class));
    }

    @Test
    public void testUriScheme_ReturnsPrimaryScheme() {
        String result = facade.uriScheme();

        Assert.assertEquals(result, "file");
    }

    @Test
    public void testRun_DelegatesToExecutionService() throws IOException {
        RunContext context = new RunContext("java", testPath, Collections.emptyList(), Collections.emptyMap(), null);
        ProcessId mockProcessId = Mockito.mock(ProcessId.class);
        Mockito.when(mockExecutionService.run(context)).thenReturn(mockProcessId);

        RunResult result = facade.run(context);

        Assert.assertNotNull(result);
        Mockito.verify(mockExecutionService).run(context);
    }

    @Test
    public void testStop_DelegatesToExecutionService() {
        boolean result = facade.stop(testPath);

        Assert.assertTrue(result);
        Mockito.verify(mockExecutionService).stop(
                new DocumentUri.FileUri(testPath.toAbsolutePath().normalize().toUri()));
    }

    @Test
    public void testWorkspaceProjects_DelegatesToProjectService() {
        Project mockProject = Mockito.mock(Project.class);
        Mockito.when(mockProjectService.allProjects())
                .thenReturn(Collections.singletonList(mockProject));

        CompletableFuture<Map<Path, Project>> result = facade.workspaceProjects();

        Assert.assertNotNull(result);
        Mockito.verify(mockProjectService).allProjects();
    }

    private StableSnapshot createStableSnapshot(SyntaxTree syntaxTree, SemanticModel semanticModel,
                                                PackageCompilation compilation) {
        DocumentId documentId = Mockito.mock(DocumentId.class);
        ModuleId moduleId = Mockito.mock(ModuleId.class);
        Mockito.when(documentId.moduleId()).thenReturn(moduleId);
        return new StableSnapshot(Map.of(documentId, syntaxTree), Map.of(testPath, documentId),
                Map.of(moduleId, semanticModel), compilation, new ContentVersion(1));
    }
}
