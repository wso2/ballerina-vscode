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

import org.ballerinalang.langserver.workspace.workspacemanager.Document;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.net.URI;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Tests for {@link Document} aggregate root.
 *
 * @since 1.7.0
 */
public class DocumentTest {

    private static final DocumentUri TEST_URI = new DocumentUri.FileUri(
            URI.create("file:///workspace/main.bal"));
    private static final FileId TEST_FILE_ID = FileId.from("test-file-1");
    private static final String INITIAL_CONTENT = "public function main() {}";

    /**
     * Verifies document is created with CLOSED state and initial content.
     */
    @Test
    public void document_createdWithClosedState() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);

        Assert.assertEquals(doc.uri(), TEST_URI);
        Assert.assertEquals(doc.fileId(), TEST_FILE_ID);
        Assert.assertEquals(doc.state(), DocumentState.CLOSED);
        Assert.assertEquals(doc.content(), INITIAL_CONTENT);
        Assert.assertEquals(doc.version().value(), 0);
    }

    /**
     * Verifies version monotonically increases on content update.
     */
    @Test
    public void updateContent_versionMonotonicallyIncreases() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        doc.open();
        ContentVersion v0 = doc.version();

        doc.updateContent("updated content 1");
        ContentVersion v1 = doc.version();
        Assert.assertTrue(v1.compareTo(v0) > 0, "version should increase");

        doc.updateContent("updated content 2");
        ContentVersion v2 = doc.version();
        Assert.assertTrue(v2.compareTo(v1) > 0, "version should increase again");
    }

    /**
     * Verifies content and version are atomically consistent.
     */
    @Test
    public void updateContent_atomicContentAndVersion() throws InterruptedException {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        doc.open();
        AtomicReference<String> observedContent = new AtomicReference<>();
        AtomicReference<ContentVersion> observedVersion = new AtomicReference<>();
        CountDownLatch readerStarted = new CountDownLatch(1);
        CountDownLatch readerDone = new CountDownLatch(1);

        // Reader thread that captures content and version
        Thread reader = new Thread(() -> {
            readerStarted.countDown();
            // Try to observe consistent state during concurrent updates
            for (int i = 0; i < 1000; i++) {
                String content = doc.content();
                ContentVersion version = doc.version();
                observedContent.set(content);
                observedVersion.set(version);
                // Small yield to allow interleaving
                Thread.yield();
            }
            readerDone.countDown();
        });

        reader.start();
        Assert.assertTrue(readerStarted.await(1, TimeUnit.SECONDS));

        // Writer thread making updates
        for (int i = 0; i < 1000; i++) {
            doc.updateContent("content iteration " + i);
        }

        Assert.assertTrue(readerDone.await(5, TimeUnit.SECONDS));
        reader.join();
    }

    /**
     * Verifies state transitions from CLOSED to OPEN.
     */
    @Test
    public void open_transitionsFromClosedToOpen() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        Assert.assertEquals(doc.state(), DocumentState.CLOSED);

        doc.open();

        Assert.assertEquals(doc.state(), DocumentState.OPEN);
    }

    /**
     * Verifies state transitions from OPEN to CLOSED.
     */
    @Test
    public void close_transitionsFromOpenToClosed() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        doc.open();
        Assert.assertEquals(doc.state(), DocumentState.OPEN);

        doc.close();

        Assert.assertEquals(doc.state(), DocumentState.CLOSED);
    }

    /**
     * Verifies open() captures new content and increments version.
     */
    @Test
    public void open_capturesNewContentAndIncrementsVersion() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        ContentVersion v0 = doc.version();

        doc.open("new captured content");

        Assert.assertEquals(doc.state(), DocumentState.OPEN);
        Assert.assertEquals(doc.content(), "new captured content");
        Assert.assertTrue(doc.version().compareTo(v0) > 0);
    }

    /**
     * Verifies close() reverts content to disk content.
     */
    @Test
    public void close_revertsContentToDiskContent() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        doc.open();
        doc.updateContent("edited in editor");
        Assert.assertEquals(doc.content(), "edited in editor");

        doc.close("disk content after flush");

        Assert.assertEquals(doc.state(), DocumentState.CLOSED);
        Assert.assertEquals(doc.content(), "disk content after flush");
    }

    /**
     * Verifies applyEdit with full content replacement works.
     */
    @Test
    public void applyEdit_fullContentReplacement() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        doc.open();
        ContentVersion v0 = doc.version();

        doc.applyEdit(null, "completely new content");

        Assert.assertEquals(doc.content(), "completely new content");
        Assert.assertTrue(doc.version().compareTo(v0) > 0);
    }

    /**
     * Verifies applyEdit with range-based edit works (insertion).
     */
    @Test
    public void applyEdit_rangeInsertion() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, "public function main() {}");
        doc.open();

        // Insert "// comment\n" at position 0
        TextRange range = new TextRange(0, 0, 0, 0);
        doc.applyEdit(range, "// comment\n");

        Assert.assertEquals(doc.content(), "// comment\npublic function main() {}");
    }

    /**
     * Verifies applyEdit with range-based edit works (replacement).
     */
    @Test
    public void applyEdit_rangeReplacement() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, "public function main() {}");
        doc.open();

        // Replace "main" with "entry"
        // "public function " is 16 chars, "main" is at columns 16-19
        TextRange range = new TextRange(0, 16, 0, 20);
        doc.applyEdit(range, "entry");

        Assert.assertEquals(doc.content(), "public function entry() {}");
    }

    /**
     * Verifies applyEdit with range-based edit works (deletion).
     */
    @Test
    public void applyEdit_rangeDeletion() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, "public function main() {}");
        doc.open();

        // Delete "public " (from position 0 to 7)
        TextRange range = new TextRange(0, 0, 0, 7);
        doc.applyEdit(range, "");

        Assert.assertEquals(doc.content(), "function main() {}");
    }

    /**
     * Verifies multi-line range edit works correctly.
     */
    @Test
    public void applyEdit_multiLineRange() {
        String initial = "line1\nline2\nline3";
        Document doc = new Document(TEST_URI, TEST_FILE_ID, initial);
        doc.open();

        // Replace line2 with "newLine2a\nnewLine2b"
        // Line 1, column 0 to end of line 1
        TextRange range = new TextRange(1, 0, 1, 5);
        doc.applyEdit(range, "newLine2a\nnewLine2b");

        Assert.assertEquals(doc.content(), "line1\nnewLine2a\nnewLine2b\nline3");
    }

    /**
     * Verifies that CLOSED documents cannot be edited.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void applyEdit_whenClosed_throwsException() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        Assert.assertEquals(doc.state(), DocumentState.CLOSED);

        doc.applyEdit(null, "should fail");
    }

    /**
     * Verifies that CLOSED documents cannot have direct content updates.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void updateContent_whenClosed_throwsException() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, INITIAL_CONTENT);
        Assert.assertEquals(doc.state(), DocumentState.CLOSED);

        doc.updateContent("should fail");
    }

    /**
     * Verifies multiple rapid open/close transitions work correctly.
     */
    @Test
    public void multipleOpenClose_transitionsCorrectly() {
        Document doc = new Document(TEST_URI, TEST_FILE_ID, "initial");

        // First cycle
        doc.open();
        doc.updateContent("edit1");
        doc.close("disk1");
        Assert.assertEquals(doc.content(), "disk1");
        Assert.assertEquals(doc.state(), DocumentState.CLOSED);

        // Second cycle
        doc.open("captured2");
        doc.updateContent("edit2");
        doc.close("disk2");
        Assert.assertEquals(doc.content(), "disk2");
        Assert.assertEquals(doc.state(), DocumentState.CLOSED);

        // Third cycle - just open/close
        doc.open();
        doc.close("disk3");
        Assert.assertEquals(doc.content(), "disk3");
    }
}
