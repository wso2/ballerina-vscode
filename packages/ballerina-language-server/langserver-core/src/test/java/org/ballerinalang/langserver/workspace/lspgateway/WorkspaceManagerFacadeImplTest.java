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
import org.ballerinalang.langserver.commons.workspace.RunContext;
import org.ballerinalang.langserver.commons.workspace.RunResult;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationService;
import org.ballerinalang.langserver.workspace.documentstore.DocumentService;
import org.ballerinalang.langserver.workspace.executionmanager.ExecutionService;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.TextDocumentItem;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
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
    private DocumentService mockDocumentService;
    private ExecutionService mockExecutionService;
    private ClientSession mockClientSession;
    private WorkspaceManagerFacadeImpl facade;
    private Path testPath;

    @BeforeMethod
    public void setUp() {
        mockProjectService = Mockito.mock(ProjectService.class);
        mockCompilationService = Mockito.mock(CompilationService.class);
        mockDocumentService = Mockito.mock(DocumentService.class);
        mockExecutionService = Mockito.mock(ExecutionService.class);
        mockClientSession = Mockito.mock(ClientSession.class);
        
        facade = new WorkspaceManagerFacadeImpl(
                mockProjectService,
                mockCompilationService,
                mockDocumentService,
                mockExecutionService,
                mockClientSession
        );
        
        testPath = Paths.get("/test/project/main.bal").toAbsolutePath().normalize();
    }

    @Test
    public void testRelativePath_DelegatesToDocumentService() {
        String expectedPath = "main.bal";
        Mockito.when(mockDocumentService.relativePath(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(expectedPath);

        Optional<String> result = facade.relativePath(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), expectedPath);
        Mockito.verify(mockDocumentService).relativePath(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testRelativePathWithCancelChecker_DelegatesToDocumentService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        String expectedPath = "main.bal";
        Mockito.when(mockDocumentService.relativePath(Mockito.eq(testPath), Mockito.eq(cancelChecker)))
                .thenReturn(expectedPath);

        Optional<String> result = facade.relativePath(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), expectedPath);
        Mockito.verify(mockDocumentService).relativePath(testPath, cancelChecker);
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
    public void testDocument_DelegatesToDocumentService() {
        Document mockDocument = Mockito.mock(Document.class);
        Mockito.when(mockDocumentService.document(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockDocument);

        Optional<Document> result = facade.document(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockDocument);
        Mockito.verify(mockDocumentService).document(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testDocumentWithCancelChecker_DelegatesToDocumentService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        Document mockDocument = Mockito.mock(Document.class);
        Mockito.when(mockDocumentService.document(testPath, cancelChecker))
                .thenReturn(mockDocument);

        Optional<Document> result = facade.document(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockDocument);
        Mockito.verify(mockDocumentService).document(testPath, cancelChecker);
    }

    @Test
    public void testSyntaxTree_DelegatesToCompilationService() {
        SyntaxTree mockTree = Mockito.mock(SyntaxTree.class);
        Mockito.when(mockCompilationService.syntaxTree(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockTree);

        Optional<SyntaxTree> result = facade.syntaxTree(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockTree);
        Mockito.verify(mockCompilationService).syntaxTree(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testSyntaxTreeWithCancelChecker_DelegatesToCompilationService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        SyntaxTree mockTree = Mockito.mock(SyntaxTree.class);
        Mockito.when(mockCompilationService.syntaxTree(testPath, cancelChecker))
                .thenReturn(mockTree);

        Optional<SyntaxTree> result = facade.syntaxTree(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockTree);
        Mockito.verify(mockCompilationService).syntaxTree(testPath, cancelChecker);
    }

    @Test
    public void testSemanticModel_DelegatesToCompilationService() {
        SemanticModel mockModel = Mockito.mock(SemanticModel.class);
        Mockito.when(mockCompilationService.semanticModel(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockModel);

        Optional<SemanticModel> result = facade.semanticModel(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockModel);
        Mockito.verify(mockCompilationService).semanticModel(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testSemanticModelWithCancelChecker_DelegatesToCompilationService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        SemanticModel mockModel = Mockito.mock(SemanticModel.class);
        Mockito.when(mockCompilationService.semanticModel(testPath, cancelChecker))
                .thenReturn(mockModel);

        Optional<SemanticModel> result = facade.semanticModel(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockModel);
        Mockito.verify(mockCompilationService).semanticModel(testPath, cancelChecker);
    }

    @Test
    public void testWaitAndGetPackageCompilation_DelegatesToCompilationService() {
        PackageCompilation mockCompilation = Mockito.mock(PackageCompilation.class);
        Mockito.when(mockCompilationService.compilation(Mockito.eq(testPath), Mockito.any()))
                .thenReturn(mockCompilation);

        Optional<PackageCompilation> result = facade.waitAndGetPackageCompilation(testPath);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockCompilation);
        Mockito.verify(mockCompilationService).compilation(Mockito.eq(testPath), Mockito.isNull());
    }

    @Test
    public void testWaitAndGetPackageCompilationWithCancelChecker_DelegatesToCompilationService() {
        CancelChecker cancelChecker = Mockito.mock(CancelChecker.class);
        PackageCompilation mockCompilation = Mockito.mock(PackageCompilation.class);
        Mockito.when(mockCompilationService.compilation(testPath, cancelChecker))
                .thenReturn(mockCompilation);

        Optional<PackageCompilation> result = facade.waitAndGetPackageCompilation(testPath, cancelChecker);

        Assert.assertTrue(result.isPresent());
        Assert.assertEquals(result.get(), mockCompilation);
        Mockito.verify(mockCompilationService).compilation(testPath, cancelChecker);
    }

    @Test
    public void testDidOpen_DelegatesToDocumentService() {
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem("file:///test.bal", "ballerina", 1, ""));

        facade.didOpen(testPath, params);

        Mockito.verify(mockDocumentService).didOpen(testPath, params);
    }

    @Test
    public void testDidChange_DelegatesToDocumentService() {
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        params.setTextDocument(new org.eclipse.lsp4j.VersionedTextDocumentIdentifier("file:///test.bal", 2));

        facade.didChange(testPath, params);

        Mockito.verify(mockDocumentService).didChange(testPath, params);
    }

    @Test
    public void testDidClose_DelegatesToDocumentService() {
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        params.setTextDocument(new org.eclipse.lsp4j.TextDocumentIdentifier("file:///test.bal"));

        facade.didClose(testPath, params);

        Mockito.verify(mockDocumentService).didClose(testPath, params);
    }

    @Test
    public void testDidChangeWatched_SingleEvent_DelegatesToDocumentService() {
        FileEvent event = new FileEvent();

        facade.didChangeWatched(testPath, event);

        Mockito.verify(mockDocumentService).didChangeWatched(testPath, event);
    }

    @Test
    public void testDidChangeWatched_BatchEvent_DelegatesToDocumentService() {
        DidChangeWatchedFilesParams params = new DidChangeWatchedFilesParams();
        params.setChanges(Collections.emptyList());

        List<Path> result = facade.didChangeWatched(params);

        Assert.assertNotNull(result);
        Mockito.verify(mockDocumentService).didChangeWatched(params);
    }

    @Test
    public void testUriScheme_DelegatesToDocumentService() {
        String expectedScheme = "file";
        Mockito.when(mockDocumentService.uriScheme()).thenReturn(expectedScheme);

        String result = facade.uriScheme();

        Assert.assertEquals(result, expectedScheme);
        Mockito.verify(mockDocumentService).uriScheme();
    }

    @Test
    public void testRun_DelegatesToExecutionService() throws IOException {
        RunContext context = new RunContext("java", testPath, Collections.emptyList(), Collections.emptyMap(), null);
        Process mockProcess = Mockito.mock(Process.class);
        Mockito.when(mockExecutionService.run(context)).thenReturn(mockProcess);

        RunResult result = facade.run(context);

        Assert.assertNotNull(result);
        Mockito.verify(mockExecutionService).run(context);
    }

    @Test
    public void testStop_DelegatesToExecutionService() {
        boolean result = facade.stop(testPath);

        Assert.assertTrue(result);
        Mockito.verify(mockExecutionService).stop(Mockito.any());
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
}
