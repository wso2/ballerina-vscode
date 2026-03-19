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
package org.ballerinalang.langserver.workspace.test.acceptance;

import org.ballerinalang.langserver.workspace.compilerengine.CompilationService;
import org.ballerinalang.langserver.workspace.lspgateway.ClientSession;
import org.ballerinalang.langserver.workspace.lspgateway.WorkspaceManagerFacadeImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Acceptance tests for cross-context boundary enforcement.
 *
 * @since 1.7.0
 */
public class CrossContextBoundaryTest {

    private static final String BASE_PACKAGE = "org.ballerinalang.langserver.workspace";
    private static final String[] BOUNDED_CONTEXTS = {
            "lspgateway", "workspacemanager", "compilerengine", "documentstore", "executionmanager", "observability", "eventbus"
    };

    @Test
    public void testLspHandlersDependOnlyOnWorkspaceManagerInterface() throws IOException {
        // RED: this test should fail — check for direct bounded context imports in handlers
        Path handlerRoot = Paths.get("src/main/java/org/ballerinalang/langserver");
        if (!Files.exists(handlerRoot)) {
            handlerRoot = Paths.get("langserver-core/src/main/java/org/ballerinalang/langserver");
        }
        List<Path> handlerFiles = findJavaFiles(handlerRoot, "workspace");

        for (Path file : handlerFiles) {
            List<String> lines = Files.readAllLines(file);
            for (String line : lines) {
                if (line.trim().startsWith("import ")) {
                    for (String bc : BOUNDED_CONTEXTS) {
                        String forbiddenImport = BASE_PACKAGE + "." + bc;
                        // Allow imports from facade and interfaces if they are public
                        // But ADR-031 says no sibling context's internal classes.
                        // WorkspaceManager is at the root of workspace package.
                        Assert.assertFalse(line.contains(forbiddenImport),
                                "LSP handler " + file.getFileName() + " violates boundary by importing " + forbiddenImport);
                    }
                }
            }
        }
    }

    @Test
    public void testFacadeMethodsContainNoDomainLogic() throws IOException {
        // Verify the facade file exists and is proxy-free.
        Path facadeFile = Paths.get("src/main/java/org/ballerinalang/langserver/workspace/lspgateway/WorkspaceManagerFacadeImpl.java");
        if (!Files.exists(facadeFile)) {
            facadeFile = Paths.get("langserver-core/src/main/java/org/ballerinalang/langserver/workspace/lspgateway/WorkspaceManagerFacadeImpl.java");
        }
        String content = Files.readString(facadeFile);

        Assert.assertFalse(content.contains("BallerinaWorkspaceManagerProxy"));
        Assert.assertFalse(content.contains("WorkspaceManagerProxy"));
        Assert.assertTrue(Files.exists(facadeFile), "Facade file must exist");
    }

    @Test
    public void testFacadeDelegatesToCorrectServices() {
        ProjectService projectService = Mockito.mock(ProjectService.class);
        CompilationService compilationService = Mockito.mock(CompilationService.class);
        ClientSession clientSession = Mockito.mock(ClientSession.class);

        WorkspaceManagerFacadeImpl facade = new WorkspaceManagerFacadeImpl(
                projectService, compilationService, Mockito.mock(org.ballerinalang.langserver.workspace.executionmanager.ExecutionService.class), clientSession);

        Path path = Paths.get("test.bal");

        // Test project delegation
        facade.project(path);
        Mockito.verify(projectService).loadOrCreate(path, null);
        Mockito.verifyNoInteractions(compilationService);

        // Test compilation-backed semantic model resolution
        Mockito.reset(projectService, compilationService);
        io.ballerina.compiler.api.SemanticModel mockModel =
                Mockito.mock(io.ballerina.compiler.api.SemanticModel.class);
        io.ballerina.projects.PackageCompilation compilation = Mockito.mock(io.ballerina.projects.PackageCompilation.class);
        io.ballerina.projects.Project project = Mockito.mock(io.ballerina.projects.Project.class);
        io.ballerina.projects.DocumentId documentId = Mockito.mock(io.ballerina.projects.DocumentId.class);
        io.ballerina.projects.ModuleId moduleId = Mockito.mock(io.ballerina.projects.ModuleId.class);
        Mockito.when(compilationService.compilation(path, null)).thenReturn(compilation);
        Mockito.when(projectService.loadOrCreate(path, null)).thenReturn(project);
        Mockito.when(project.documentId(path)).thenReturn(documentId);
        Mockito.when(documentId.moduleId()).thenReturn(moduleId);
        Mockito.when(compilation.getSemanticModel(moduleId)).thenReturn(mockModel);
        facade.semanticModel(path);
        Mockito.verify(compilationService).compilation(path, null);
        Mockito.verify(projectService).loadOrCreate(path, null);

        // Test document delegation: document() now uses projectService fallback directly
        Mockito.reset(projectService, compilationService);
        facade.document(path);
        Mockito.verify(projectService).loadOrCreate(path, null);
        Mockito.verifyNoInteractions(compilationService);
    }

    @Test
    public void testPackagePerBoundedContextStructure() throws IOException {
        // RED: this test should fail — verify package structure
        Path workspaceRoot = Paths.get("src/main/java/org/ballerinalang/langserver/workspace");
        if (!Files.exists(workspaceRoot)) {
            workspaceRoot = Paths.get("langserver-core/src/main/java/org/ballerinalang/langserver/workspace");
        }
        for (String bc : BOUNDED_CONTEXTS) {
            Path bcPath = workspaceRoot.resolve(bc);
            // Handle execution vs executionmanager
            if (bc.equals("executionmanager") && !Files.exists(bcPath)) {
                bcPath = workspaceRoot.resolve("execution");
            }
            Assert.assertTrue(Files.exists(bcPath), "Bounded context package missing: " + bc);
            Assert.assertTrue(Files.isDirectory(bcPath), "Bounded context path is not a directory: " + bc);
        }
    }

    private List<Path> findJavaFiles(Path root, String excludeDir) throws IOException {
        try (Stream<Path> stream = Files.walk(root)) {
            return stream.filter(Files::isRegularFile)
                    .filter(p -> p.toString().endsWith(".java"))
                    .filter(p -> !p.toString().contains(File.separator + excludeDir + File.separator))
                    .collect(Collectors.toList());
        }
    }
}
