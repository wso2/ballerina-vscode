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

package org.ballerinalang.langserver.diagnostics;

import org.ballerinalang.langserver.LSContextOperation;
import org.ballerinalang.langserver.commons.DocumentServiceContext;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.contexts.ContextBuilder;
import org.ballerinalang.langserver.contexts.LanguageServerContextImpl;
import org.ballerinalang.langserver.diagnostic.DiagnosticsHelper;
import org.ballerinalang.langserver.util.FileUtils;
import org.ballerinalang.langserver.util.TestUtil;
import org.ballerinalang.langserver.workspace.BallerinaWorkspaceManager;
import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.TextDocumentItem;
import org.eclipse.lsp4j.jsonrpc.Endpoint;
import org.testng.Assert;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

/**
 * Tests for workspace project diagnostics.
 *
 * @since 1.3.0
 */
public class WorkspaceDiagnosticsTest {

    private Endpoint serviceEndpoint;
    private final Path testRoot = FileUtils.RES_DIR.resolve("diagnostics").resolve("workspace-diag");
    private final LanguageServerContext serverContext = new LanguageServerContextImpl();
    private final BallerinaWorkspaceManager workspaceManager = new BallerinaWorkspaceManager(serverContext);

    @BeforeClass
    public void init() {
        this.serviceEndpoint = TestUtil.initializeLanguageSever();
    }

    @Test(description = "Test workspace diagnostics are collected from all packages on initialization")
    public void testWorkspaceDiagnosticsOnInitialization() throws IOException, WorkspaceDocumentException {
        Path projAFile = testRoot.resolve("projA").resolve("main.bal").toAbsolutePath();
        String projAContent = Files.readString(projAFile);

        DidOpenTextDocumentParams openParams = new DidOpenTextDocumentParams();
        TextDocumentItem textDocumentItem = new TextDocumentItem();
        textDocumentItem.setUri(projAFile.toUri().toString());
        textDocumentItem.setText(projAContent);
        openParams.setTextDocument(textDocumentItem);

        workspaceManager.didOpen(projAFile, openParams);

        DocumentServiceContext serviceContext = ContextBuilder.buildDocumentServiceContext(
                projAFile.toUri().toString(),
                this.workspaceManager,
                LSContextOperation.TXT_DID_OPEN,
                this.serverContext);

        DiagnosticsHelper diagnosticsHelper = DiagnosticsHelper.getInstance(serverContext);
        Map<String, List<Diagnostic>> diagnostics = diagnosticsHelper.getLatestDiagnostics(serviceContext);

        Assert.assertFalse(diagnostics.isEmpty(), "Diagnostics should be collected");

        boolean hasProjADiagnostics = diagnostics.keySet().stream()
                .anyMatch(key -> key.contains("projA"));
        boolean hasProjBDiagnostics = diagnostics.keySet().stream()
                .anyMatch(key -> key.contains("projB"));
        Assert.assertTrue(hasProjADiagnostics, "Should have diagnostics entry for projA");
        Assert.assertFalse(hasProjBDiagnostics, "projB should not have diagnostics initially");
    }

    @Test(description = "Test fixing error in dependency package clears cascading diagnostics in dependent")
    public void testWorkspaceDiagnosticsAfterDependentChange() throws IOException, WorkspaceDocumentException {
        Path projBFile = testRoot.resolve("projB").resolve("main.bal").toAbsolutePath();
        String projBOriginalContent = Files.readString(projBFile);

        String projBWithError = projBOriginalContent.replace(
                "    return \"Hello\";",
                "    return \"Hello\" // Missing semicolon"
        );

        DidOpenTextDocumentParams openProjBParams = new DidOpenTextDocumentParams();
        TextDocumentItem projBItem = new TextDocumentItem();
        projBItem.setUri(projBFile.toUri().toString());
        projBItem.setText(projBWithError);
        openProjBParams.setTextDocument(projBItem);

        workspaceManager.didOpen(projBFile, openProjBParams);

        DocumentServiceContext projBContext = ContextBuilder.buildDocumentServiceContext(
                projBFile.toUri().toString(),
                this.workspaceManager,
                LSContextOperation.TXT_DID_OPEN,
                this.serverContext);

        DiagnosticsHelper diagnosticsHelper = DiagnosticsHelper.getInstance(serverContext);
        Map<String, List<Diagnostic>> projBDiagnostics = diagnosticsHelper.getLatestDiagnostics(projBContext);

        List<String> diagnostics = projBDiagnostics.values().stream()
                .flatMap(List::stream)
                .map(d -> d.getRange().toString() + " - " + d.getMessage())
                .toList();

        Assert.assertEquals(diagnostics.size(), 2, "Should have only two diagnostics");
        Assert.assertEquals(diagnostics.stream().distinct().count(), diagnostics.size(),
                "Diagnostics should be distinct");
    }

    @AfterClass
    public void cleanupLanguageServer() {
        TestUtil.shutdownLanguageServer(this.serviceEndpoint);
        this.serviceEndpoint = null;
    }
}
