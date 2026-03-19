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

package org.ballerinalang.langserver.workspace.workspacemanager;

import org.ballerinalang.langserver.workspace.documentstore.DocumentState;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.documentstore.FileId;
import org.ballerinalang.langserver.workspace.documentstore.TextRange;

import java.util.Objects;
import java.util.concurrent.atomic.AtomicReference;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Aggregate root representing a single document in the Virtual File System.
 * Tracks content, version, and authority state with atomic updates.
 *
 * @since 1.7.0
 */
public final class Document {

    private final DocumentUri uri;
    private final FileId fileId;
    private final AtomicReference<ContentState> contentState;
    private final ReentrantLock updateLock = new ReentrantLock();

    /**
     * Immutable snapshot of document content and version.
     * Updates are atomic by replacing the entire ContentState reference.
     */
    private record ContentState(String content, ContentVersion version, DocumentState state) {}

    /**
     * Creates a new document in CLOSED state.
     *
     * @param uri     document identity
     * @param fileId  opaque file identifier
     * @param content initial content
     */
    public Document(DocumentUri uri, FileId fileId, String content) {
        this.uri = Objects.requireNonNull(uri, "uri must not be null");
        this.fileId = Objects.requireNonNull(fileId, "fileId must not be null");
        Objects.requireNonNull(content, "content must not be null");
        this.contentState = new AtomicReference<>(
                new ContentState(content, new ContentVersion(0), DocumentState.CLOSED));
    }

    /**
     * Returns the document URI.
     *
     * @return document identity
     */
    public DocumentUri uri() {
        return uri;
    }

    /**
     * Returns the opaque file identifier.
     *
     * @return file ID
     */
    public FileId fileId() {
        return fileId;
    }

    /**
     * Returns the current content.
     *
     * @return document content
     */
    public String content() {
        return contentState.get().content();
    }

    /**
     * Returns the current content version.
     *
     * @return version stamp
     */
    public ContentVersion version() {
        return contentState.get().version();
    }

    /**
     * Returns the current document state.
     *
     * @return OPEN or CLOSED
     */
    public DocumentState state() {
        return contentState.get().state();
    }

    /**
     * Updates content and atomically increments version.
     * Only allowed when document is OPEN.
     *
     * @param newContent new content to set
     * @throws IllegalStateException if document is CLOSED
     */
    public void updateContent(String newContent) {
        Objects.requireNonNull(newContent, "newContent must not be null");
        updateLock.lock();
        try {
            ContentState current = contentState.get();
            if (current.state() != DocumentState.OPEN) {
                throw new IllegalStateException("Cannot update content of closed document: " + uri);
            }
            ContentState next = new ContentState(newContent, current.version().next(), DocumentState.OPEN);
            contentState.set(next);
        } finally {
            updateLock.unlock();
        }
    }

    /**
     * Applies an incremental text edit to the content.
     * Only allowed when document is OPEN.
     *
     * @param range     range to replace (null means full replacement)
     * @param newText   text to insert
     * @throws IllegalStateException if document is CLOSED
     */
    public void applyEdit(TextRange range, String newText) {
        Objects.requireNonNull(newText, "newText must not be null");
        updateLock.lock();
        try {
            ContentState current = contentState.get();
            if (current.state() != DocumentState.OPEN) {
                throw new IllegalStateException("Cannot edit closed document: " + uri);
            }
            String updatedContent = applyTextEdit(current.content(), range, newText);
            ContentState next = new ContentState(updatedContent, current.version().next(), DocumentState.OPEN);
            contentState.set(next);
        } finally {
            updateLock.unlock();
        }
    }

    /**
     * Opens the document, switching to editor authority.
     * Captures current content from the provided source.
     *
     * @param capturedContent content to capture when opening
     */
    public void open(String capturedContent) {
        Objects.requireNonNull(capturedContent, "capturedContent must not be null");
        updateLock.lock();
        try {
            ContentState current = contentState.get();
            ContentState next = new ContentState(capturedContent, current.version().next(), DocumentState.OPEN);
            contentState.set(next);
        } finally {
            updateLock.unlock();
        }
    }

    /**
     * Opens the document with existing content, switching to editor authority.
     */
    public void open() {
        updateLock.lock();
        try {
            ContentState current = contentState.get();
            if (current.state() == DocumentState.OPEN) {
                return;
            }
            ContentState next = new ContentState(current.content(), current.version().next(), DocumentState.OPEN);
            contentState.set(next);
        } finally {
            updateLock.unlock();
        }
    }

    /**
     * Closes the document, flushing to disk content and reverting to disk authority.
     *
     * @param diskContent the content from disk after potential flush
     */
    public void close(String diskContent) {
        Objects.requireNonNull(diskContent, "diskContent must not be null");
        updateLock.lock();
        try {
            ContentState current = contentState.get();
            ContentState next = new ContentState(diskContent, current.version().next(), DocumentState.CLOSED);
            contentState.set(next);
        } finally {
            updateLock.unlock();
        }
    }

    /**
     * Closes the document without changing content.
     */
    public void close() {
        updateLock.lock();
        try {
            ContentState current = contentState.get();
            if (current.state() == DocumentState.CLOSED) {
                return;
            }
            ContentState next = new ContentState(current.content(), current.version().next(), DocumentState.CLOSED);
            contentState.set(next);
        } finally {
            updateLock.unlock();
        }
    }

    /**
     * Applies a text edit to the given content.
     *
     * @param content original content
     * @param range   range to replace (null means full replacement)
     * @param newText text to insert
     * @return updated content
     */
    private String applyTextEdit(String content, TextRange range, String newText) {
        if (range == null) {
            return newText;
        }

        String[] lines = content.split("\n", -1);
        int startOffset = calculateOffset(lines, range.startLine(), range.startColumn());
        int endOffset = calculateOffset(lines, range.endLine(), range.endColumn());

        return content.substring(0, startOffset) + newText + content.substring(endOffset);
    }

    /**
     * Calculates the character offset from line and column.
     *
     * @param lines    array of lines
     * @param line     line number (0-based)
     * @param column   column number (0-based)
     * @return character offset from start of content
     */
    private int calculateOffset(String[] lines, int line, int column) {
        int offset = 0;
        for (int i = 0; i < line && i < lines.length; i++) {
            offset += lines[i].length() + 1; // +1 for newline character
        }
        if (line < lines.length) {
            // Column should not exceed line length
            offset += Math.min(column, lines[line].length());
        }
        return offset;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) {
            return true;
        }
        if (!(obj instanceof Document other)) {
            return false;
        }
        return uri.equals(other.uri);
    }

    @Override
    public int hashCode() {
        return uri.hashCode();
    }

    @Override
    public String toString() {
        ContentState state = contentState.get();
        return "Document[uri=" + uri + ", state=" + state.state() + ", version=" + state.version() + "]";
    }
}
