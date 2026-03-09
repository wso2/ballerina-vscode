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

import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Tests for {@link VirtualFileSystem}.
 *
 * @since 1.7.0
 */
public class VirtualFileSystemTest {

    private VirtualFileSystem vfs;
    private Path tempDir;

    @BeforeMethod
    public void setUp() throws IOException {
        vfs = new VirtualFileSystem();
        tempDir = Files.createTempDirectory("vfs-test");
    }

    /**
     * Verifies VFS is the sole authority for file content.
     */
    @Test
    public void vfs_isSoleContentAuthority() throws IOException {
        // Create a file on disk
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk content");

        // Read through VFS - should return disk content
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());
        String content = vfs.content(uri);

        Assert.assertEquals(content, "disk content");
    }

    /**
     * Verifies buffer-over-disk precedence when document is OPEN.
     */
    @Test
    public void content_whenOpen_returnsBufferContent() throws IOException {
        // Create a file on disk
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk content");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        // Open the document with different content
        vfs.openDocument(uri, "buffer content");

        // Should return buffer content, not disk content
        Assert.assertEquals(vfs.content(uri), "buffer content");
    }

    /**
     * Verifies disk content is returned when document is CLOSED.
     */
    @Test
    public void content_whenClosed_returnsDiskContent() throws IOException {
        // Create a file on disk
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk content");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        // Open and edit, then close (flush to disk)
        vfs.openDocument(uri, "initial");
        vfs.updateDocument(uri, "edited content");
        vfs.closeDocument(uri);

        // After closing, disk has the flushed content
        Assert.assertEquals(vfs.content(uri), "edited content");
    }

    /**
     * Verifies isOverlaid returns true for OPEN documents.
     */
    @Test
    public void isOverlaid_whenOpen_returnsTrue() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk content");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        Assert.assertFalse(vfs.isOverlaid(uri));

        vfs.openDocument(uri, "buffer content");

        Assert.assertTrue(vfs.isOverlaid(uri));
    }

    /**
     * Verifies isOverlaid returns false for CLOSED documents.
     */
    @Test
    public void isOverlaid_whenClosed_returnsFalse() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk content");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        vfs.openDocument(uri, "buffer content");
        Assert.assertTrue(vfs.isOverlaid(uri));

        vfs.closeDocument(uri);

        Assert.assertFalse(vfs.isOverlaid(uri));
    }

    /**
     * Verifies openDocument creates document with OPEN state.
     */
    @Test
    public void openDocument_createsOpenDocument() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk content");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        vfs.openDocument(uri, "captured content");

        Assert.assertTrue(vfs.isOverlaid(uri));
        Assert.assertEquals(vfs.content(uri), "captured content");
    }

    /**
     * Verifies closeDocument flushes to disk and transitions to CLOSED.
     */
    @Test
    public void closeDocument_flushesToDisk() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "original disk content");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        vfs.openDocument(uri, "original disk content");
        vfs.updateDocument(uri, "edited content");
        vfs.closeDocument(uri);

        // After close, disk should have the edited content
        Assert.assertEquals(Files.readString(testFile), "edited content");
        Assert.assertFalse(vfs.isOverlaid(uri));
    }

    /**
     * Verifies updateDocument modifies content and increments version.
     */
    @Test
    public void updateDocument_modifiesContent() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "initial");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        vfs.openDocument(uri, "initial");
        vfs.updateDocument(uri, "updated");

        Assert.assertEquals(vfs.content(uri), "updated");
    }

    /**
     * Verifies updateDocument throws when document is not open.
     */
    @Test(expectedExceptions = IllegalStateException.class)
    public void updateDocument_whenNotOpen_throwsException() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk content");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        // Don't open - just try to update
        vfs.updateDocument(uri, "should fail");
    }

    /**
     * Verifies applyIncrementalEdit modifies content with range.
     */
    @Test
    public void applyIncrementalEdit_modifiesContent() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "public function main() {}");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        vfs.openDocument(uri, "public function main() {}");

        // Replace "main" with "entry"
        // "public function " is 16 chars, "main" is at columns 16-19
        TextRange range = new TextRange(0, 16, 0, 20);
        vfs.applyIncrementalEdit(uri, range, "entry");

        Assert.assertEquals(vfs.content(uri), "public function entry() {}");
    }

    /**
     * Verifies multiple documents can be tracked independently.
     */
    @Test
    public void multipleDocuments_trackedIndependently() throws IOException {
        Path file1 = tempDir.resolve("file1.bal");
        Path file2 = tempDir.resolve("file2.bal");
        Files.writeString(file1, "content1");
        Files.writeString(file2, "content2");
        DocumentUri uri1 = new DocumentUri.FileUri(file1.toUri());
        DocumentUri uri2 = new DocumentUri.FileUri(file2.toUri());

        vfs.openDocument(uri1, "buffer1");
        vfs.openDocument(uri2, "buffer2");

        Assert.assertEquals(vfs.content(uri1), "buffer1");
        Assert.assertEquals(vfs.content(uri2), "buffer2");
        Assert.assertTrue(vfs.isOverlaid(uri1));
        Assert.assertTrue(vfs.isOverlaid(uri2));

        vfs.closeDocument(uri1);

        Assert.assertFalse(vfs.isOverlaid(uri1));
        Assert.assertTrue(vfs.isOverlaid(uri2));
    }

    /**
     * Verifies document version increases with each update.
     */
    @Test
    public void version_increasesWithEachUpdate() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "initial");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        vfs.openDocument(uri, "v0");
        ContentVersion v0 = vfs.version(uri);

        vfs.updateDocument(uri, "v1");
        ContentVersion v1 = vfs.version(uri);

        vfs.updateDocument(uri, "v2");
        ContentVersion v2 = vfs.version(uri);

        Assert.assertTrue(v1.compareTo(v0) > 0);
        Assert.assertTrue(v2.compareTo(v1) > 0);
    }

    /**
     * Verifies content returns empty string for non-existent file when closed.
     */
    @Test
    public void content_nonExistentFile_returnsEmpty() {
        Path nonExistent = tempDir.resolve("nonexistent.bal");
        DocumentUri uri = new DocumentUri.FileUri(nonExistent.toUri());

        String content = vfs.content(uri);

        Assert.assertEquals(content, "");
    }

    /**
     * Verifies disk update refreshes closed document content.
     */
    @Test
    public void refreshFromDisk_updatesClosedDocument() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "version1");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        // Read initial content
        Assert.assertEquals(vfs.content(uri), "version1");

        // Modify disk directly
        Files.writeString(testFile, "version2");

        // Refresh and verify
        vfs.refreshFromDisk(uri);
        Assert.assertEquals(vfs.content(uri), "version2");
    }

    /**
     * Verifies refreshFromDisk does not affect open documents.
     */
    @Test
    public void refreshFromDisk_doesNotAffectOpenDocument() throws IOException {
        Path testFile = tempDir.resolve("test.bal");
        Files.writeString(testFile, "disk version");
        DocumentUri uri = new DocumentUri.FileUri(testFile.toUri());

        vfs.openDocument(uri, "buffer version");

        // Modify disk directly
        Files.writeString(testFile, "disk modified");

        // Refresh should not affect open document
        vfs.refreshFromDisk(uri);
        Assert.assertEquals(vfs.content(uri), "buffer version");
    }
}
