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

import io.ballerina.projects.BuildOptions;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.workspace.WorkspaceDocumentException;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;

import java.net.URI;
import java.nio.file.Path;

import javax.annotation.Nonnull;

/**
 * Scheme-based routing proxy for workspace managers.
 * Routes requests to the appropriate WorkspaceManager based on DocumentUri scheme.
 * Preserves DocumentUri at proxy boundary, strips scheme before facade dispatch.
 *
 * @deprecated As of 1.7.0, use the unified workspace manager facade instead.
 * @since 1.7.0
 */
@Deprecated(since = "1.7.0", forRemoval = true)
public final class BallerinaWorkspaceManagerProxyImpl implements BallerinaWorkspaceManagerProxy {

    private final WorkspaceManager fileWorkspaceManager;
    private final WorkspaceManager exprWorkspaceManager;
    private final WorkspaceManager aiWorkspaceManager;
    private final WorkspaceManager untitledWorkspaceManager;

    /**
     * Creates a new proxy with workspace managers for each URI scheme.
     * This constructor is used for testing and advanced use cases.
     *
     * @param fileWorkspaceManager     manager for file:// URIs
     * @param exprWorkspaceManager     manager for expr:// URIs
     * @param aiWorkspaceManager       manager for ai:// URIs
     * @param untitledWorkspaceManager manager for untitled: URIs
     */
    public BallerinaWorkspaceManagerProxyImpl(
            @Nonnull WorkspaceManager fileWorkspaceManager,
            @Nonnull WorkspaceManager exprWorkspaceManager,
            @Nonnull WorkspaceManager aiWorkspaceManager,
            @Nonnull WorkspaceManager untitledWorkspaceManager) {
        this.fileWorkspaceManager = fileWorkspaceManager;
        this.exprWorkspaceManager = exprWorkspaceManager;
        this.aiWorkspaceManager = aiWorkspaceManager;
        this.untitledWorkspaceManager = untitledWorkspaceManager;
    }

    /**
     * Creates a new proxy using the provided LanguageServerContext.
     * This constructor creates the appropriate workspace managers internally.
     *
     * @param serverContext the language server context
     */
    public BallerinaWorkspaceManagerProxyImpl(LanguageServerContext serverContext) {
        this.fileWorkspaceManager = WorkspaceManagerFacadeFactory.create(serverContext);
        this.exprWorkspaceManager = WorkspaceManagerFacadeFactory.create(serverContext);
        this.aiWorkspaceManager = WorkspaceManagerFacadeFactory.create(serverContext);
        this.untitledWorkspaceManager = WorkspaceManagerFacadeFactory.create(serverContext);
    }

    @Override
    public WorkspaceManager get() {
        return fileWorkspaceManager;
    }

    @Override
    public WorkspaceManager get(String fileUri) {
        if (fileUri == null || fileUri.isEmpty()) {
            return fileWorkspaceManager;
        }

        String scheme = extractScheme(fileUri);
        return switch (scheme) {
            case "expr" -> exprWorkspaceManager;
            case "ai" -> aiWorkspaceManager;
            case "untitled" -> untitledWorkspaceManager;
            default -> fileWorkspaceManager;
        };
    }

    @Override
    public void didOpen(@Nonnull DidOpenTextDocumentParams params) throws WorkspaceDocumentException {
        String uri = params.getTextDocument().getUri();
        WorkspaceManager manager = get(uri);

        Path path = extractPath(uri);
        manager.didOpen(path, params);
    }

    @Override
    public void didChange(@Nonnull DidChangeTextDocumentParams params) throws WorkspaceDocumentException {
        String uri = params.getTextDocument().getUri();
        WorkspaceManager manager = get(uri);

        Path path = extractPath(uri);
        manager.didChange(path, params);
    }

    @Override
    public void didClose(@Nonnull DidCloseTextDocumentParams params) {
        String uri = params.getTextDocument().getUri();
        WorkspaceManager manager = get(uri);

        Path path = extractPath(uri);
        manager.didClose(path, params);
    }

    /**
     * Sets the build options for all workspace managers.
     * This is a temporary compatibility method.
     *
     * @param buildOptions the build options to set
     */
    public void setBuildOptions(BuildOptions buildOptions) {
        // WorkspaceManagerFacadeImpl manages build options internally.
    }

    /**
     * Extracts the scheme from a URI string.
     * Returns empty string if no scheme found.
     */
    private String extractScheme(String uri) {
        int colonIndex = uri.indexOf(':');
        if (colonIndex == -1) {
            return "";
        }
        // Check that colon is part of scheme (preceded by valid scheme chars)
        for (int i = 0; i < colonIndex; i++) {
            char c = uri.charAt(i);
            if (!isValidSchemeChar(c)) {
                return "";
            }
        }
        return uri.substring(0, colonIndex);
    }

    /**
     * Checks if a character is valid in a URI scheme.
     * Per RFC 3986: scheme = ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
     */
    private boolean isValidSchemeChar(char c) {
        return (c >= 'a' && c <= 'z') ||
               (c >= 'A' && c <= 'Z') ||
               (c >= '0' && c <= '9') ||
               c == '+' || c == '-' || c == '.';
    }

    /**
     * Extracts the path from a URI string, stripping the scheme.
     * For file:// URIs, returns the file system path.
     * For other schemes, returns a path based on the URI's path component.
     */
    private Path extractPath(String uri) {
        try {
            URI parsedUri = URI.create(uri);
            String scheme = parsedUri.getScheme();

            if ("file".equals(scheme)) {
                // For file URIs, use the standard Path conversion
                return java.nio.file.Paths.get(parsedUri);
            } else {
                // For non-file URIs (expr://, ai://, untitled:),
                // extract the path component
                String path = parsedUri.getPath();
                if (path == null || path.isEmpty()) {
                    // For URIs like untitled:Untitled-1, use the scheme-specific part
                    path = parsedUri.getSchemeSpecificPart();
                }
                if (path == null || path.isEmpty()) {
                    path = uri.substring(uri.indexOf(':') + 1);
                }
                return java.nio.file.Paths.get(path);
            }
        } catch (Exception e) {
            // Fallback: strip scheme prefix and treat remainder as path
            int colonIndex = uri.indexOf(':');
            if (colonIndex != -1) {
                String afterScheme = uri.substring(colonIndex + 1);
                // Strip :// or : prefix
                if (afterScheme.startsWith("//")) {
                    afterScheme = afterScheme.substring(2);
                }
                return java.nio.file.Paths.get(afterScheme);
            }
            return java.nio.file.Paths.get(uri);
        }
    }
}
