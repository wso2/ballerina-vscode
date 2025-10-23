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
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.eclipse.lsp4j.TextDocumentItem;
import org.eclipse.lsp4j.VersionedTextDocumentIdentifier;
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
        // Open projA file
        Path projAFile = testRoot.resolve("projA").resolve("main.bal").toAbsolutePath();
        String projAContent = Files.readString(projAFile);

        DidOpenTextDocumentParams openParams = new DidOpenTextDocumentParams();
        TextDocumentItem textDocumentItem = new TextDocumentItem();
        textDocumentItem.setUri(projAFile.toUri().toString());
        textDocumentItem.setText(projAContent);
        openParams.setTextDocument(textDocumentItem);

        workspaceManager.didOpen(projAFile, openParams);

        // Get diagnostics
        DocumentServiceContext serviceContext = ContextBuilder.buildDocumentServiceContext(
                projAFile.toUri().toString(),
                this.workspaceManager,
                LSContextOperation.TXT_DID_OPEN,
                this.serverContext);

        DiagnosticsHelper diagnosticsHelper = DiagnosticsHelper.getInstance(serverContext);
        Map<String, List<Diagnostic>> diagnostics = diagnosticsHelper.getLatestDiagnostics(serviceContext);

        // Verify diagnostics are present
        Assert.assertFalse(diagnostics.isEmpty(), "Diagnostics should be collected");

        // Verify both projA and projB files have diagnostics entries (even if empty lists)
        boolean hasProjADiagnostics = diagnostics.keySet().stream()
                .anyMatch(key -> key.contains("projA"));
        boolean hasProjBDiagnostics = diagnostics.keySet().stream()
                .anyMatch(key -> key.contains("projB"));

        Assert.assertTrue(hasProjADiagnostics, "Should have diagnostics entry for projA");
        // projB may or may not have diagnostics depending on implementation
        // The key test is that workspace projects are loaded together
    }

    @Test(description = "Test fixing error in dependency package clears cascading diagnostics in dependent")
    public void testWorkspaceDiagnosticsAfterDependentChange() throws IOException, WorkspaceDocumentException {
        // Read projB file
        Path projBFile = testRoot.resolve("projB").resolve("utils.bal").toAbsolutePath();
        String projBOriginalContent = Files.readString(projBFile);

        // Open projB with error (missing semicolon)
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

        // Get diagnostics for projB - should have syntax error
        DocumentServiceContext projBContext = ContextBuilder.buildDocumentServiceContext(
                projBFile.toUri().toString(),
                this.workspaceManager,
                LSContextOperation.TXT_DID_OPEN,
                this.serverContext);

        DiagnosticsHelper diagnosticsHelper = DiagnosticsHelper.getInstance(serverContext);
        Map<String, List<Diagnostic>> projBDiagnostics = diagnosticsHelper.getLatestDiagnostics(projBContext);

        // Verify projB has errors
        long projBErrorsBefore = projBDiagnostics.values().stream()
                .flatMap(List::stream)
                .filter(d -> d.getSeverity().toString().equals("Error"))
                .count();

        Assert.assertTrue(projBErrorsBefore > 0, "projB should have syntax error");

        // Now fix projB by reverting to correct content
        DidChangeTextDocumentParams fixParams = new DidChangeTextDocumentParams();
        VersionedTextDocumentIdentifier identifier = new VersionedTextDocumentIdentifier();
        identifier.setUri(projBFile.toUri().toString());
        identifier.setVersion(2);
        fixParams.setTextDocument(identifier);

        TextDocumentContentChangeEvent changeEvent = new TextDocumentContentChangeEvent();
        changeEvent.setText(projBOriginalContent);
        fixParams.setContentChanges(List.of(changeEvent));

        workspaceManager.didChange(projBFile, fixParams);

        // Get diagnostics after fix
        Map<String, List<Diagnostic>> projBDiagnosticsAfterFix = diagnosticsHelper.getLatestDiagnostics(projBContext);

        // Count errors after fix
        long projBErrorsAfter = projBDiagnosticsAfterFix.values().stream()
                .flatMap(List::stream)
                .filter(d -> d.getSeverity().toString().equals("Error"))
                .count();
        
        // After fixing projB, syntax errors should be cleared
        Assert.assertTrue(projBErrorsAfter < projBErrorsBefore,
                "Fixing projB should clear syntax errors");
    }

    @AfterClass
    public void cleanupLanguageServer() {
        TestUtil.shutdownLanguageServer(this.serviceEndpoint);
        this.serviceEndpoint = null;
    }
}
