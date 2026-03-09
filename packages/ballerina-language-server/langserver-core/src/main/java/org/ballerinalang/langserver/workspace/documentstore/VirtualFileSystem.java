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

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Virtual File System - the sole authority for all file content.
 * Implements buffer-over-disk precedence: when a document is OPEN,
 * the in-memory buffer is authoritative; when CLOSED, disk is authoritative.
 *
 * @since 1.7.0
 */
public final class VirtualFileSystem {

    private final ConcurrentHashMap<DocumentUri, Document> documents = new ConcurrentHashMap<>();

    /**
     * Returns the content for a document.
     * When document is OPEN: returns buffer content.
     * When document is CLOSED: reads from disk.
     *
     * @param uri document identity
     * @return document content
     */
    public String content(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        Document doc = documents.get(uri);
        if (doc != null && doc.state() == DocumentState.OPEN) {
            return doc.content();
        }
        return readFromDisk(uri);
    }

    /**
     * Returns the current content version for a document.
     *
     * @param uri document identity
     * @return content version
     */
    public ContentVersion version(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        Document doc = documents.get(uri);
        if (doc != null) {
            return doc.version();
        }
        return new ContentVersion(0);
    }

    /**
     * Checks if a document has an open editor buffer overlay.
     *
     * @param uri document identity
     * @return true if document is OPEN (editor-authoritative)
     */
    public boolean isOverlaid(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        Document doc = documents.get(uri);
        return doc != null && doc.state() == DocumentState.OPEN;
    }

    /**
     * Opens a document, capturing current content and switching to editor authority.
     *
     * @param uri     document identity
     * @param content initial content to capture
     */
    public void openDocument(DocumentUri uri, String content) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(content, "content must not be null");
        Document doc = documents.computeIfAbsent(uri, u -> createDocument(u, content));
        doc.open(content);
    }

    /**
     * Opens a document with disk content.
     *
     * @param uri document identity
     */
    public void openDocument(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        String content = readFromDisk(uri);
        Document doc = documents.computeIfAbsent(uri, u -> createDocument(u, content));
        doc.open(content);
    }

    /**
     * Updates document content (incrementing version).
     *
     * @param uri     document identity
     * @param content new content
     * @throws IllegalStateException if document is not open
     */
    public void updateDocument(DocumentUri uri, String content) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(content, "content must not be null");
        Document doc = documents.get(uri);
        if (doc == null) {
            throw new IllegalStateException("Document not open: " + uri);
        }
        doc.updateContent(content);
    }

    /**
     * Applies an incremental text edit to a document.
     *
     * @param uri     document identity
     * @param range   range to replace
     * @param newText text to insert
     * @throws IllegalStateException if document is not open
     */
    public void applyIncrementalEdit(DocumentUri uri, TextRange range, String newText) {
        Objects.requireNonNull(uri, "uri must not be null");
        Objects.requireNonNull(newText, "newText must not be null");
        Document doc = documents.get(uri);
        if (doc == null) {
            throw new IllegalStateException("Document not open: " + uri);
        }
        doc.applyEdit(range, newText);
    }

    /**
     * Closes a document, flushing content to disk and reverting to disk authority.
     *
     * @param uri document identity
     */
    public void closeDocument(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        Document doc = documents.get(uri);
        if (doc == null) {
            return;
        }
        String content = doc.content();
        writeToDisk(uri, content);
        doc.close(content);
    }

    /**
     * Refreshes content from disk for a closed document.
     * Has no effect if document is open.
     *
     * @param uri document identity
     */
    public void refreshFromDisk(DocumentUri uri) {
        Objects.requireNonNull(uri, "uri must not be null");
        Document doc = documents.get(uri);
        if (doc != null && doc.state() == DocumentState.OPEN) {
            return;
        }
        String content = readFromDisk(uri);
        if (doc != null) {
            doc.close(content);
        }
    }

    /**
     * Creates a new document entry.
     *
     * @param uri     document identity
     * @param content initial content
     * @return new document
     */
    private Document createDocument(DocumentUri uri, String content) {
        FileId fileId = FileId.from(uri.toString());
        return new Document(uri, fileId, content);
    }

    /**
     * Reads content from disk.
     *
     * @param uri document identity
     * @return file content or empty string if file doesn't exist
     */
    private String readFromDisk(DocumentUri uri) {
        Path path = extractPath(uri);
        if (path == null || !Files.exists(path)) {
            return "";
        }
        try {
            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read: " + uri, e);
        }
    }

    /**
     * Writes content to disk.
     *
     * @param uri     document identity
     * @param content content to write
     */
    private void writeToDisk(DocumentUri uri, String content) {
        Path path = extractPath(uri);
        if (path == null) {
            return;
        }
        try {
            Files.createDirectories(path.getParent());
            Files.writeString(path, content, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to write: " + uri, e);
        }
    }

    /**
     * Extracts a Path from a DocumentUri.
     *
     * @param uri document identity
     * @return file path or null if not a file URI
     */
    private Path extractPath(DocumentUri uri) {
        if (uri instanceof DocumentUri.FileUri fileUri) {
            return Path.of(fileUri.uri());
        }
        return null;
    }
}
