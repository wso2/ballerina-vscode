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

import org.ballerinalang.langserver.workspace.BallerinaWorkspaceManagerProxyImpl;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationService;
import org.ballerinalang.langserver.workspace.documentstore.DocumentService;
import org.ballerinalang.langserver.workspace.lspgateway.ClientSession;
import org.ballerinalang.langserver.workspace.lspgateway.WorkspaceManagerFacadeImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.TextDocumentItem;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
        // RED: this test should fail — verify facade method body size and complexity
        Path facadeFile = Paths.get("src/main/java/org/ballerinalang/langserver/workspace/lspgateway/WorkspaceManagerFacadeImpl.java");
        if (!Files.exists(facadeFile)) {
            facadeFile = Paths.get("langserver-core/src/main/java/org/ballerinalang/langserver/workspace/lspgateway/WorkspaceManagerFacadeImpl.java");
        }
        String content = Files.readString(facadeFile);

        // Simple regex to find method bodies. This is a heuristic but should work for this specific class.
        Pattern methodPattern = Pattern.compile("public [^({]+\\([^)]*\\) [^{]*\\{([^}]*)\\}");
        Matcher matcher = methodPattern.matcher(content);

        while (matcher.find()) {
            String body = matcher.group(1).trim();
            String[] lines = body.split("\n");
            int lineCount = 0;
            for (String line : lines) {
                if (!line.trim().isEmpty() && !line.trim().startsWith("//")) {
                    lineCount++;
                }
            }

            Assert.assertTrue(lineCount <= 5, "Facade method body exceeds 5 lines: \n" + body);
            Assert.assertFalse(body.contains("if (") || body.contains("switch (") || body.contains("?"),
                    "Facade method contains domain logic: \n" + body);
        }
    }

    @Test
    public void testFacadeDelegatesToCorrectServices() {
        ProjectService projectService = Mockito.mock(ProjectService.class);
        CompilationService compilationService = Mockito.mock(CompilationService.class);
        DocumentService documentService = Mockito.mock(DocumentService.class);
        ClientSession clientSession = Mockito.mock(ClientSession.class);

        WorkspaceManagerFacadeImpl facade = new WorkspaceManagerFacadeImpl(
                projectService, compilationService, documentService, Mockito.mock(org.ballerinalang.langserver.workspace.executionmanager.ExecutionService.class), clientSession);

        Path path = Paths.get("test.bal");

        // Test project delegation
        facade.project(path);
        Mockito.verify(projectService).loadOrCreate(path, null);
        Mockito.verifyNoInteractions(compilationService, documentService);

        // Test compilation delegation
        Mockito.reset(projectService, compilationService, documentService);
        facade.semanticModel(path);
        Mockito.verify(compilationService).semanticModel(path, null);
        Mockito.verifyNoInteractions(projectService, documentService);

        // Test document delegation
        Mockito.reset(projectService, compilationService, documentService);
        facade.document(path);
        Mockito.verify(documentService).document(path, null);
        Mockito.verifyNoInteractions(projectService, compilationService);
    }

    @Test
    public void testWorkspaceManagerProxyRoutesByUriScheme() throws Exception {
        org.ballerinalang.langserver.commons.workspace.WorkspaceManager fileManager = Mockito.mock(org.ballerinalang.langserver.commons.workspace.WorkspaceManager.class);
        org.ballerinalang.langserver.commons.workspace.WorkspaceManager exprManager = Mockito.mock(org.ballerinalang.langserver.commons.workspace.WorkspaceManager.class);
        org.ballerinalang.langserver.commons.workspace.WorkspaceManager aiManager = Mockito.mock(org.ballerinalang.langserver.commons.workspace.WorkspaceManager.class);
        org.ballerinalang.langserver.commons.workspace.WorkspaceManager untitledManager = Mockito.mock(org.ballerinalang.langserver.commons.workspace.WorkspaceManager.class);

        BallerinaWorkspaceManagerProxyImpl proxy = new BallerinaWorkspaceManagerProxyImpl(
                fileManager, exprManager, aiManager, untitledManager);

        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams(new TextDocumentItem("expr://test.bal", "ballerina", 1, ""));
        proxy.didOpen(params);

        Mockito.verify(exprManager).didOpen(Mockito.any(), Mockito.eq(params));
        Mockito.verifyNoInteractions(fileManager, aiManager, untitledManager);
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
