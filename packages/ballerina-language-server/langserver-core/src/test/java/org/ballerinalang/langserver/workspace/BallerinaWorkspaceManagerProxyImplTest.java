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

package org.ballerinalang.langserver.workspace;

import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.TextDocumentIdentifier;
import org.eclipse.lsp4j.TextDocumentItem;
import org.eclipse.lsp4j.VersionedTextDocumentIdentifier;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests for {@link BallerinaWorkspaceManagerProxyImpl}.
 *
 * @since 1.7.0
 */
public class BallerinaWorkspaceManagerProxyImplTest {

    private WorkspaceManager fileWorkspaceManager;
    private WorkspaceManager exprWorkspaceManager;
    private WorkspaceManager aiWorkspaceManager;
    private WorkspaceManager untitledWorkspaceManager;
    private BallerinaWorkspaceManagerProxyImpl proxy;

    @BeforeMethod
    public void setup() {
        fileWorkspaceManager = mock(WorkspaceManager.class);
        exprWorkspaceManager = mock(WorkspaceManager.class);
        aiWorkspaceManager = mock(WorkspaceManager.class);
        untitledWorkspaceManager = mock(WorkspaceManager.class);

        proxy = new BallerinaWorkspaceManagerProxyImpl(
                fileWorkspaceManager,
                exprWorkspaceManager,
                aiWorkspaceManager,
                untitledWorkspaceManager
        );
    }

    // ============================================
    // get() - Zero arg returns default (file://)
    // ============================================

    @Test
    public void testGetZeroArgReturnsFileWorkspaceManager() {
        WorkspaceManager result = proxy.get();
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager for zero-arg get()";
    }

    // ============================================
    // get(String fileUri) - Scheme routing
    // ============================================

    @Test
    public void testGetWithFileUriRoutesToFileWorkspaceManager() {
        String fileUri = "file:///home/user/project/main.bal";
        WorkspaceManager result = proxy.get(fileUri);
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager for file:// URI";
    }

    @Test
    public void testGetWithExprUriRoutesToExprWorkspaceManager() {
        String exprUri = "expr:///tmp/eval_123.bal";
        WorkspaceManager result = proxy.get(exprUri);
        assert result == exprWorkspaceManager : "Expected exprWorkspaceManager for expr:// URI";
    }

    @Test
    public void testGetWithAiUriRoutesToAiWorkspaceManager() {
        String aiUri = "ai:///tmp/ai_gen_456.bal";
        WorkspaceManager result = proxy.get(aiUri);
        assert result == aiWorkspaceManager : "Expected aiWorkspaceManager for ai:// URI";
    }

    @Test
    public void testGetWithUntitledUriRoutesToUntitledWorkspaceManager() {
        String untitledUri = "untitled:Untitled-1";
        WorkspaceManager result = proxy.get(untitledUri);
        assert result == untitledWorkspaceManager : "Expected untitledWorkspaceManager for untitled: URI";
    }

    @Test
    public void testGetWithNullUriReturnsFileWorkspaceManager() {
        WorkspaceManager result = proxy.get(null);
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager for null URI";
    }

    @Test
    public void testGetWithEmptyUriReturnsFileWorkspaceManager() {
        WorkspaceManager result = proxy.get("");
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager for empty URI";
    }

    @Test
    public void testGetWithUnknownSchemeReturnsFileWorkspaceManager() {
        String unknownUri = "unknown:///some/path.bal";
        WorkspaceManager result = proxy.get(unknownUri);
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager for unknown scheme URI";
    }

    @Test
    public void testGetWithFileSchemeWithoutSlashes() {
        String fileUri = "file:/home/user/project/main.bal";
        WorkspaceManager result = proxy.get(fileUri);
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager for file:/ URI";
    }

    // ============================================
    // didOpen - Routes based on document URI
    // ============================================

    @Test
    public void testDidOpenRoutesFileUriToFileWorkspaceManager() throws WorkspaceDocumentException {
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem("file:///home/user/main.bal", "ballerina", 1, ""));

        proxy.didOpen(params);

        verify(fileWorkspaceManager, times(1)).didOpen(any(), any());
        verify(exprWorkspaceManager, never()).didOpen(any(), any());
        verify(aiWorkspaceManager, never()).didOpen(any(), any());
        verify(untitledWorkspaceManager, never()).didOpen(any(), any());
    }

    @Test
    public void testDidOpenRoutesExprUriToExprWorkspaceManager() throws WorkspaceDocumentException {
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem("expr:///tmp/eval.bal", "ballerina", 1, ""));

        proxy.didOpen(params);

        verify(exprWorkspaceManager, times(1)).didOpen(any(), any());
        verify(fileWorkspaceManager, never()).didOpen(any(), any());
        verify(aiWorkspaceManager, never()).didOpen(any(), any());
        verify(untitledWorkspaceManager, never()).didOpen(any(), any());
    }

    @Test
    public void testDidOpenRoutesAiUriToAiWorkspaceManager() throws WorkspaceDocumentException {
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem("ai:///tmp/ai.bal", "ballerina", 1, ""));

        proxy.didOpen(params);

        verify(aiWorkspaceManager, times(1)).didOpen(any(), any());
        verify(fileWorkspaceManager, never()).didOpen(any(), any());
        verify(exprWorkspaceManager, never()).didOpen(any(), any());
        verify(untitledWorkspaceManager, never()).didOpen(any(), any());
    }

    @Test
    public void testDidOpenRoutesUntitledUriToUntitledWorkspaceManager() throws WorkspaceDocumentException {
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem("untitled:Untitled-1", "ballerina", 1, ""));

        proxy.didOpen(params);

        verify(untitledWorkspaceManager, times(1)).didOpen(any(), any());
        verify(fileWorkspaceManager, never()).didOpen(any(), any());
        verify(exprWorkspaceManager, never()).didOpen(any(), any());
        verify(aiWorkspaceManager, never()).didOpen(any(), any());
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void testDidOpenWithNullParamsThrowsException() throws WorkspaceDocumentException {
        proxy.didOpen(null);
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void testDidOpenWithNullTextDocumentThrowsException() throws WorkspaceDocumentException {
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        proxy.didOpen(params);
    }

    // ============================================
    // didChange - Routes based on document URI
    // ============================================

    @Test
    public void testDidChangeRoutesFileUriToFileWorkspaceManager() throws WorkspaceDocumentException {
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        params.setTextDocument(new VersionedTextDocumentIdentifier("file:///home/user/main.bal", 2));

        proxy.didChange(params);

        verify(fileWorkspaceManager, times(1)).didChange(any(), any());
        verify(exprWorkspaceManager, never()).didChange(any(), any());
        verify(aiWorkspaceManager, never()).didChange(any(), any());
        verify(untitledWorkspaceManager, never()).didChange(any(), any());
    }

    @Test
    public void testDidChangeRoutesExprUriToExprWorkspaceManager() throws WorkspaceDocumentException {
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        params.setTextDocument(new VersionedTextDocumentIdentifier("expr:///tmp/eval.bal", 2));

        proxy.didChange(params);

        verify(exprWorkspaceManager, times(1)).didChange(any(), any());
        verify(fileWorkspaceManager, never()).didChange(any(), any());
        verify(aiWorkspaceManager, never()).didChange(any(), any());
        verify(untitledWorkspaceManager, never()).didChange(any(), any());
    }

    @Test
    public void testDidChangeRoutesAiUriToAiWorkspaceManager() throws WorkspaceDocumentException {
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        params.setTextDocument(new VersionedTextDocumentIdentifier("ai:///tmp/ai.bal", 2));

        proxy.didChange(params);

        verify(aiWorkspaceManager, times(1)).didChange(any(), any());
        verify(fileWorkspaceManager, never()).didChange(any(), any());
        verify(exprWorkspaceManager, never()).didChange(any(), any());
        verify(untitledWorkspaceManager, never()).didChange(any(), any());
    }

    @Test
    public void testDidChangeRoutesUntitledUriToUntitledWorkspaceManager() throws WorkspaceDocumentException {
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        params.setTextDocument(new VersionedTextDocumentIdentifier("untitled:Untitled-1", 2));

        proxy.didChange(params);

        verify(untitledWorkspaceManager, times(1)).didChange(any(), any());
        verify(fileWorkspaceManager, never()).didChange(any(), any());
        verify(exprWorkspaceManager, never()).didChange(any(), any());
        verify(aiWorkspaceManager, never()).didChange(any(), any());
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void testDidChangeWithNullParamsThrowsException() throws WorkspaceDocumentException {
        proxy.didChange(null);
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void testDidChangeWithNullTextDocumentThrowsException() throws WorkspaceDocumentException {
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        proxy.didChange(params);
    }

    // ============================================
    // didClose - Routes based on document URI
    // ============================================

    @Test
    public void testDidCloseRoutesFileUriToFileWorkspaceManager() {
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        params.setTextDocument(new TextDocumentIdentifier("file:///home/user/main.bal"));

        proxy.didClose(params);

        verify(fileWorkspaceManager, times(1)).didClose(any(), any());
        verify(exprWorkspaceManager, never()).didClose(any(), any());
        verify(aiWorkspaceManager, never()).didClose(any(), any());
        verify(untitledWorkspaceManager, never()).didClose(any(), any());
    }

    @Test
    public void testDidCloseRoutesExprUriToExprWorkspaceManager() {
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        params.setTextDocument(new TextDocumentIdentifier("expr:///tmp/eval.bal"));

        proxy.didClose(params);

        verify(exprWorkspaceManager, times(1)).didClose(any(), any());
        verify(fileWorkspaceManager, never()).didClose(any(), any());
        verify(aiWorkspaceManager, never()).didClose(any(), any());
        verify(untitledWorkspaceManager, never()).didClose(any(), any());
    }

    @Test
    public void testDidCloseRoutesAiUriToAiWorkspaceManager() {
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        params.setTextDocument(new TextDocumentIdentifier("ai:///tmp/ai.bal"));

        proxy.didClose(params);

        verify(aiWorkspaceManager, times(1)).didClose(any(), any());
        verify(fileWorkspaceManager, never()).didClose(any(), any());
        verify(exprWorkspaceManager, never()).didClose(any(), any());
        verify(untitledWorkspaceManager, never()).didClose(any(), any());
    }

    @Test
    public void testDidCloseRoutesUntitledUriToUntitledWorkspaceManager() {
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        params.setTextDocument(new TextDocumentIdentifier("untitled:Untitled-1"));

        proxy.didClose(params);

        verify(untitledWorkspaceManager, times(1)).didClose(any(), any());
        verify(fileWorkspaceManager, never()).didClose(any(), any());
        verify(exprWorkspaceManager, never()).didClose(any(), any());
        verify(aiWorkspaceManager, never()).didClose(any(), any());
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void testDidCloseWithNullParamsThrowsException() {
        proxy.didClose(null);
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void testDidCloseWithNullTextDocumentThrowsException() {
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        proxy.didClose(params);
    }

    // ============================================
    // Scheme extraction edge cases
    // ============================================

    @Test
    public void testGetWithUpperCaseSchemeReturnsFileWorkspaceManager() {
        // Schemes are case-insensitive per RFC 3986, but we treat unknown schemes as file://
        String upperCaseFileUri = "FILE:///home/user/main.bal";
        WorkspaceManager result = proxy.get(upperCaseFileUri);
        // Uppercase FILE:// is not recognized as file:// so falls back to default
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager as default for uppercase scheme";
    }

    @Test
    public void testGetWithWindowsFilePath() {
        String windowsFileUri = "file:///C:/Users/project/main.bal";
        WorkspaceManager result = proxy.get(windowsFileUri);
        assert result == fileWorkspaceManager : "Expected fileWorkspaceManager for Windows file URI";
    }

    @Test
    public void testGetWithExprSchemeWithQueryParams() {
        String exprUriWithQuery = "expr:///tmp/eval.bal?line=10&col=5";
        WorkspaceManager result = proxy.get(exprUriWithQuery);
        assert result == exprWorkspaceManager : "Expected exprWorkspaceManager for expr:// URI with query";
    }

    @Test
    public void testGetWithAiSchemeWithFragment() {
        String aiUriWithFragment = "ai:///tmp/ai.bal#section1";
        WorkspaceManager result = proxy.get(aiUriWithFragment);
        assert result == aiWorkspaceManager : "Expected aiWorkspaceManager for ai:// URI with fragment";
    }
}
