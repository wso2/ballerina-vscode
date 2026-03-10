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

package org.ballerinalang.langserver.workspace.documentstore;

import io.ballerina.projects.Document;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.nio.file.Path;

/**
 * Document context service contract.
 *
 * @since 1.7.0
 */
public interface DocumentService {

    /**
     * Returns document for a path.
     *
     * @param path source path
     * @param cancelChecker cancel checker
     * @return document
     */
    Document document(Path path, CancelChecker cancelChecker);

    /**
     * Returns relative document path.
     *
     * @param path source path
     * @param cancelChecker cancel checker
     * @return relative path
     */
    String relativePath(Path path, CancelChecker cancelChecker);

    /**
     * Returns owned URI scheme.
     *
     * @return URI scheme
     */
    String uriScheme();

    /**
     * Handles document open notification.
     *
     * @param path source path
     * @param params open event
     */
    void didOpen(Path path, DidOpenTextDocumentParams params);

    /**
     * Handles document change notification.
     *
     * @param path source path
     * @param params change event
     */
    void didChange(Path path, DidChangeTextDocumentParams params);

    /**
     * Handles document close notification.
     *
     * @param path source path
     * @param params close event
     */
    void didClose(Path path, DidCloseTextDocumentParams params);

    /**
     * Handles a single file watcher event.
     *
     * @param path source path
     * @param event file event
     */
    void didChangeWatched(Path path, FileEvent event);

    /**
     * Handles a batch file watcher event.
     *
     * @param params watched file batch event
     */
    void didChangeWatched(DidChangeWatchedFilesParams params);

    /**
     * Returns the current VFS content for a file that is open in the editor,
     * or {@code null} if the file is not overlaid (not currently open).
     *
     * @param path file path
     * @return in-memory editor content, or {@code null} if not open
     */
    String openFileContent(Path path);

    /**
     * Closes the VFS overlay for a file that has been deleted by the file system,
     * so subsequent {@code openFileContent} calls return {@code null} for this file.
     *
     * @param path file path to close in the VFS
     */
    void closeDeletedDocument(Path path);
}
