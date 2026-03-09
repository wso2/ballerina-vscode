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

package org.ballerinalang.langserver.workspace.acceptance;

import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.documentstore.TextRange;
import org.ballerinalang.langserver.workspace.documentstore.VirtualFileSystem;
import org.ballerinalang.langserver.workspace.workspacemanager.HeapEstimate;
import org.ballerinalang.langserver.workspace.workspacemanager.MemoryBudget;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Acceptance tests for Virtual File System and Memory management.
 * Verifies end-to-end behavior across document store and memory components.
 *
 * @since 1.7.0
 */
public class VfsMemoryAcceptanceTest {

    private VirtualFileSystem vfs;
    private Path tempDir;

    @BeforeMethod
    public void setUp() throws IOException {
        vfs = new VirtualFileSystem();
        tempDir = Files.createTempDirectory("vfs-acceptance-test");
    }

    @AfterMethod
    public void tearDown() throws IOException {
        deleteRecursively(tempDir);
    }

    // =========================================================================
    // VFS ACCEPTANCE TESTS
    // =========================================================================

    /**
     * Acceptance: VFS maintains buffer-over-disk precedence across multiple documents.
     * When multiple documents are open, each must return its buffer content, not disk.
     */
    @Test
    public void vfs_multipleDocuments_bufferPrecedenceMaintained() throws IOException {
        // Create 5 documents on disk
        List<Path> files = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            Path file = tempDir.resolve("doc" + i + ".bal");
            Files.writeString(file, "disk content " + i);
            files.add(file);
        }

        // Open all with different buffer content
        List<DocumentUri> uris = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            DocumentUri uri = new DocumentUri.FileUri(files.get(i).toUri());
            uris.add(uri);
            vfs.openDocument(uri, "buffer content " + (i + 1));
        }

        // Verify each returns buffer content, not disk
        for (int i = 0; i < 5; i++) {
            String content = vfs.content(uris.get(i));
            Assert.assertEquals(content, "buffer content " + (i + 1),
                    "Document " + (i + 1) + " should return buffer content");
        }

        // Modify disk content - should not affect open documents
        for (int i = 0; i < 5; i++) {
            Files.writeString(files.get(i), "modified disk " + (i + 1));
        }

        // Buffer content should still be authoritative
        for (int i = 0; i < 5; i++) {
            String content = vfs.content(uris.get(i));
            Assert.assertEquals(content, "buffer content " + (i + 1),
                    "Buffer should remain authoritative after disk modification");
        }
    }

    /**
     * Acceptance: VFS handles concurrent open/close operations without data corruption.
     */
    @Test
    public void vfs_concurrentOpenClose_noDataCorruption() throws IOException, InterruptedException {
        int documentCount = 10;
        int iterations = 50;
        ExecutorService executor = Executors.newFixedThreadPool(documentCount);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(documentCount);
        AtomicInteger errors = new AtomicInteger(0);

        // Create files
        List<Path> files = new ArrayList<>();
        for (int i = 0; i < documentCount; i++) {
            Path file = tempDir.resolve("concurrent" + i + ".bal");
            Files.writeString(file, "initial " + i);
            files.add(file);
        }

        for (int i = 0; i < documentCount; i++) {
            final int docId = i;
            executor.submit(() -> {
                try {
                    start.await();
                    DocumentUri uri = new DocumentUri.FileUri(files.get(docId).toUri());
                    for (int j = 0; j < iterations; j++) {
                        vfs.openDocument(uri, "content " + docId + "-" + j);
                        String content = vfs.content(uri);
                        if (!content.startsWith("content " + docId)) {
                            errors.incrementAndGet();
                        }
                        vfs.updateDocument(uri, "updated " + docId + "-" + j);
                        vfs.closeDocument(uri);
                    }
                } catch (Exception e) {
                    errors.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        Assert.assertTrue(done.await(30, TimeUnit.SECONDS));
        executor.shutdown();
        Assert.assertEquals(errors.get(), 0, "No data corruption should occur during concurrent operations");
    }

    /**
     * Acceptance: VFS handles large documents without memory issues.
     */
    @Test
    public void vfs_largeDocument_handlesCorrectly() throws IOException {
        // Create a 1MB document
        StringBuilder sb = new StringBuilder();
        String line = "// This is a comment line for testing large document handling\n";
        int targetSize = 1024 * 1024; // 1MB
        while (sb.length() < targetSize) {
            sb.append(line);
        }
        String largeContent = sb.toString();

        Path largeFile = tempDir.resolve("large.bal");
        Files.writeString(largeFile, "initial small content");
        DocumentUri uri = new DocumentUri.FileUri(largeFile.toUri());

        // Open with large content
        vfs.openDocument(uri, largeContent);
        Assert.assertEquals(vfs.content(uri), largeContent);

        // Update with different large content
        String updatedContent = largeContent.replace("comment", "updated");
        vfs.updateDocument(uri, updatedContent);
        Assert.assertEquals(vfs.content(uri), updatedContent);

        // Close and verify disk write
        vfs.closeDocument(uri);
        String diskContent = Files.readString(largeFile);
        Assert.assertEquals(diskContent, updatedContent);
    }

    /**
     * Acceptance: VFS incremental edits maintain content integrity.
     */
    @Test
    public void vfs_incrementalEdits_maintainIntegrity() throws IOException {
        Path file = tempDir.resolve("edit.bal");
        String initial = "function add(int a, int b) returns int {\n    return a + b;\n}";
        Files.writeString(file, initial);
        DocumentUri uri = new DocumentUri.FileUri(file.toUri());

        vfs.openDocument(uri, initial);

        // Series of incremental edits
        // Change function name from "add" to "sum"
        vfs.applyIncrementalEdit(uri, new TextRange(0, 9, 0, 12), "sum");
        Assert.assertEquals(vfs.content(uri),
                "function sum(int a, int b) returns int {\n    return a + b;\n}");

        // Change parameter names: "a" is at position 17, "b" is at position 24
        // "function sum(int a, int b)" -> positions: a=17, b=24
        vfs.applyIncrementalEdit(uri, new TextRange(0, 17, 0, 18), "x");
        vfs.applyIncrementalEdit(uri, new TextRange(0, 24, 0, 25), "y");
        Assert.assertEquals(vfs.content(uri),
                "function sum(int x, int y) returns int {\n    return a + b;\n}");

        // Change return expression
        vfs.applyIncrementalEdit(uri, new TextRange(1, 11, 1, 16), "x * y");
        Assert.assertEquals(vfs.content(uri),
                "function sum(int x, int y) returns int {\n    return x * y;\n}");
    }

    /**
     * Acceptance: VFS version tracking is accurate across operations.
     */
    @Test
    public void vfs_versionTracking_accurateAcrossOperations() throws IOException {
        Path file = tempDir.resolve("version.bal");
        Files.writeString(file, "v0");
        DocumentUri uri = new DocumentUri.FileUri(file.toUri());

        // Initial version for non-existent document
        ContentVersion v0 = vfs.version(uri);
        Assert.assertEquals(v0.value(), 0);

        // Open increments version
        vfs.openDocument(uri, "v1");
        ContentVersion v1 = vfs.version(uri);
        Assert.assertTrue(v1.compareTo(v0) > 0);

        // Each update increments
        List<ContentVersion> versions = new ArrayList<>();
        versions.add(v1);
        for (int i = 2; i <= 10; i++) {
            vfs.updateDocument(uri, "v" + i);
            ContentVersion v = vfs.version(uri);
            Assert.assertTrue(v.compareTo(versions.get(versions.size() - 1)) > 0,
                    "Version should monotonically increase");
            versions.add(v);
        }

        // Close increments version
        vfs.closeDocument(uri);
        ContentVersion vFinal = vfs.version(uri);
        Assert.assertTrue(vFinal.compareTo(versions.get(versions.size() - 1)) > 0);
    }

    /**
     * Acceptance: VFS handles rapid open/update/close cycles without state corruption.
     */
    @Test
    public void vfs_rapidCycles_noStateCorruption() throws IOException {
        Path file = tempDir.resolve("cycle.bal");
        DocumentUri uri = new DocumentUri.FileUri(file.toUri());

        for (int cycle = 0; cycle < 100; cycle++) {
            Files.writeString(file, "cycle " + cycle + " disk");
            vfs.openDocument(uri, "cycle " + cycle + " buffer");
            Assert.assertTrue(vfs.isOverlaid(uri), "Document should be overlaid in cycle " + cycle);
            Assert.assertEquals(vfs.content(uri), "cycle " + cycle + " buffer");
            vfs.updateDocument(uri, "cycle " + cycle + " updated");
            vfs.closeDocument(uri);
            Assert.assertFalse(vfs.isOverlaid(uri), "Document should not be overlaid after close in cycle " + cycle);
        }
    }

    /**
     * Acceptance: VFS concurrent reads don't block writes.
     */
    @Test
    public void vfs_concurrentReads_dontBlockWrites() throws IOException, InterruptedException {
        Path file = tempDir.resolve("rw.bal");
        Files.writeString(file, "initial");
        DocumentUri uri = new DocumentUri.FileUri(file.toUri());
        vfs.openDocument(uri, "initial");

        int readers = 10;
        int writers = 2;
        ExecutorService executor = Executors.newFixedThreadPool(readers + writers);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(readers + writers);
        AtomicInteger readCount = new AtomicInteger(0);
        AtomicInteger writeCount = new AtomicInteger(0);

        // Readers
        for (int i = 0; i < readers; i++) {
            executor.submit(() -> {
                try {
                    start.await();
                    for (int j = 0; j < 100; j++) {
                        vfs.content(uri);
                        readCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // Ignore
                } finally {
                    done.countDown();
                }
            });
        }

        // Writers
        for (int i = 0; i < writers; i++) {
            final int writerId = i;
            executor.submit(() -> {
                try {
                    start.await();
                    for (int j = 0; j < 50; j++) {
                        vfs.updateDocument(uri, "writer" + writerId + "-" + j);
                        writeCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    // Ignore
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        Assert.assertTrue(done.await(30, TimeUnit.SECONDS));
        executor.shutdown();

        // All operations should complete
        Assert.assertTrue(readCount.get() > 0, "Reads should have occurred");
        Assert.assertTrue(writeCount.get() > 0, "Writes should have occurred");
    }

    // =========================================================================
    // MEMORY ACCEPTANCE TESTS
    // =========================================================================

    /**
     * Acceptance: HeapEstimate addition is commutative and associative.
     */
    @Test
    public void heapEstimate_arithmeticProperties() {
        HeapEstimate a = HeapEstimate.ofMb(100);
        HeapEstimate b = HeapEstimate.ofMb(200);
        HeapEstimate c = HeapEstimate.ofMb(300);

        // Commutative: a + b = b + a
        Assert.assertEquals(a.add(b), b.add(a));

        // Associative: (a + b) + c = a + (b + c)
        Assert.assertEquals(a.add(b).add(c), a.add(b.add(c)));

        // Identity: a + 0 = a
        HeapEstimate zero = HeapEstimate.ofMb(0);
        Assert.assertEquals(a.add(zero), a);
    }

    /**
     * Acceptance: HeapEstimate comparison is transitive.
     */
    @Test
    public void heapEstimate_comparisonTransitive() {
        HeapEstimate small = HeapEstimate.ofMb(10);
        HeapEstimate medium = HeapEstimate.ofMb(50);
        HeapEstimate large = HeapEstimate.ofMb(100);

        // Transitive: if a < b and b < c, then a < c
        Assert.assertTrue(small.compareTo(medium) < 0);
        Assert.assertTrue(medium.compareTo(large) < 0);
        Assert.assertTrue(small.compareTo(large) < 0);
    }

    /**
     * Acceptance: MemoryBudget rejects invalid values.
     */
    @Test
    public void memoryBudget_validatesInput() {
        // Valid positive values
        Assert.assertNotNull(MemoryBudget.ofMb(1));
        Assert.assertNotNull(MemoryBudget.ofMb(1024));
        Assert.assertNotNull(MemoryBudget.ofMb(Long.MAX_VALUE / 2));

        // Zero and negative should throw
        Assert.assertThrows(IllegalArgumentException.class, () -> MemoryBudget.ofMb(0));
        Assert.assertThrows(IllegalArgumentException.class, () -> MemoryBudget.ofMb(-1));
        Assert.assertThrows(IllegalArgumentException.class, () -> MemoryBudget.ofMb(-1000));
    }

    /**
     * Acceptance: MemoryBudget equality is consistent.
     */
    @Test
    public void memoryBudget_equalityConsistent() {
        MemoryBudget b1 = MemoryBudget.ofMb(512);
        MemoryBudget b2 = MemoryBudget.ofMb(512);
        MemoryBudget b3 = MemoryBudget.ofMb(1024);

        // Reflexive
        Assert.assertEquals(b1, b1);

        // Symmetric
        Assert.assertEquals(b1, b2);
        Assert.assertEquals(b2, b1);

        // Transitive
        MemoryBudget b4 = MemoryBudget.ofMb(512);
        Assert.assertEquals(b1, b2);
        Assert.assertEquals(b2, b4);
        Assert.assertEquals(b1, b4);

        // Different values are not equal
        Assert.assertNotEquals(b1, b3);
    }

    /**
     * Acceptance: HeapEstimate handles large values without overflow.
     */
    @Test
    public void heapEstimate_largeValues_noOverflow() {
        HeapEstimate large = HeapEstimate.ofMb(Integer.MAX_VALUE / 2);
        HeapEstimate sum = large.add(large);

        // Should not overflow - the sum should be approximately Integer.MAX_VALUE
        Assert.assertTrue(sum.estimatedHeapMb() > large.estimatedHeapMb());
    }

    /**
     * Acceptance: HeapEstimate concurrent operations are thread-safe.
     */
    @Test
    public void heapEstimate_concurrentAccess_threadSafe() throws InterruptedException {
        HeapEstimate base = HeapEstimate.ofMb(100);
        int threads = 20;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(threads);
        List<HeapEstimate> results = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threads; i++) {
            final int increment = (i + 1) * 10;
            executor.submit(() -> {
                try {
                    start.await();
                    HeapEstimate result = base.add(HeapEstimate.ofMb(increment));
                    results.add(result);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        start.countDown();
        Assert.assertTrue(done.await(5, TimeUnit.SECONDS));
        executor.shutdown();

        // All results should be valid
        Assert.assertEquals(results.size(), threads);
        for (HeapEstimate result : results) {
            Assert.assertTrue(result.estimatedHeapMb() >= 100);
        }
    }

    /**
     * Acceptance: MemoryBudget value is correctly retained.
     */
    @Test
    public void memoryBudget_valueRetained() {
        long[] testValues = {1, 100, 1024, 2048, 4096, 8192, 16384, 32768, 65536};

        for (long mb : testValues) {
            MemoryBudget budget = MemoryBudget.ofMb(mb);
            Assert.assertEquals(budget.toMb(), mb, "MemoryBudget should retain value " + mb);
        }
    }

    /**
     * Acceptance: HeapEstimate and MemoryBudget work together for memory calculations.
     */
    @Test
    public void memoryComponents_integration() {
        // Simulate project memory calculation
        HeapEstimate project1 = HeapEstimate.ofMb(256);
        HeapEstimate project2 = HeapEstimate.ofMb(512);
        HeapEstimate project3 = HeapEstimate.ofMb(128);

        // Total heap usage
        HeapEstimate total = project1.add(project2).add(project3);
        Assert.assertEquals(total.estimatedHeapMb(), 896);

        // Check against budget
        MemoryBudget budget = MemoryBudget.ofMb(1024);
        Assert.assertTrue(total.estimatedHeapMb() <= budget.toMb(),
                "Total heap should fit within budget");

        // Over budget scenario
        HeapEstimate largeProject = HeapEstimate.ofMb(2000);
        Assert.assertTrue(largeProject.estimatedHeapMb() > budget.toMb(),
                "Large project should exceed budget");
    }

    /**
     * Acceptance: VFS memory behavior under load.
     */
    @Test
    public void vfs_memoryUnderLoad_noLeaks() throws IOException, InterruptedException {
        // Open and close many documents rapidly
        int documentCount = 100;
        for (int i = 0; i < documentCount; i++) {
            Path file = tempDir.resolve("load" + i + ".bal");
            Files.writeString(file, "content " + i);
            DocumentUri uri = new DocumentUri.FileUri(file.toUri());

            vfs.openDocument(uri, "buffer " + i);
            vfs.updateDocument(uri, "updated " + i);
            vfs.closeDocument(uri);
        }

        // All documents should be closed (not overlaid)
        for (int i = 0; i < documentCount; i++) {
            Path file = tempDir.resolve("load" + i + ".bal");
            DocumentUri uri = new DocumentUri.FileUri(file.toUri());
            Assert.assertFalse(vfs.isOverlaid(uri), "Document " + i + " should not be overlaid");
        }
    }

    /**
     * Acceptance: VFS handles non-existent files gracefully.
     */
    @Test
    public void vfs_nonExistentFiles_handledGracefully() throws IOException {
        Path nonExistent = tempDir.resolve("nonexistent.bal");
        DocumentUri uri = new DocumentUri.FileUri(nonExistent.toUri());

        // Reading non-existent file should return empty
        String content = vfs.content(uri);
        Assert.assertEquals(content, "");

        // Opening non-existent file should work
        vfs.openDocument(uri, "new content");
        Assert.assertEquals(vfs.content(uri), "new content");

        // Closing should write to disk (creating the file)
        vfs.closeDocument(uri);
        Assert.assertTrue(Files.exists(nonExistent), "File should be created on close");
        Assert.assertEquals(Files.readString(nonExistent), "new content");
    }

    /**
     * Acceptance: VFS handles special characters in content correctly.
     */
    @Test
    public void vfs_specialCharacters_handledCorrectly() throws IOException {
        Path file = tempDir.resolve("special.bal");
        DocumentUri uri = new DocumentUri.FileUri(file.toUri());

        // Content with special characters
        String specialContent = "string s = \"Hello\\nWorld\\t!\";\n" +
                "// Comment with unicode: \u00e9\u00e8\u00ea\n" +
                "int x = 0x1F; // hex\n" +
                "float f = 1.5e-10;";

        vfs.openDocument(uri, specialContent);
        Assert.assertEquals(vfs.content(uri), specialContent);

        vfs.closeDocument(uri);
        Assert.assertEquals(Files.readString(file), specialContent);
    }

    // =========================================================================
    // HELPER METHODS
    // =========================================================================

    private void deleteRecursively(Path path) throws IOException {
        if (Files.isDirectory(path)) {
            try (var stream = Files.walk(path)) {
                stream.sorted((a, b) -> b.compareTo(a)) // Delete in reverse order
                        .forEach(p -> {
                            try {
                                Files.delete(p);
                            } catch (IOException e) {
                                // Ignore
                            }
                        });
            }
        } else {
            Files.deleteIfExists(path);
        }
    }
}
