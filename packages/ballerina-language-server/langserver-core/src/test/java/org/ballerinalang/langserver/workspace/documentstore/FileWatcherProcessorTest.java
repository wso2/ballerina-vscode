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

import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tests for {@link FileWatcherProcessor} behavior.
 *
 * @since 1.7.0
 */
public class FileWatcherProcessorTest {

    private VirtualFileSystem virtualFileSystem;
    private Path tempDir;

    @BeforeMethod
    public void setUp() throws IOException {
        this.virtualFileSystem = new VirtualFileSystem();
        this.tempDir = Files.createTempDirectory("watcher-processor-test");
    }

    @AfterMethod
    public void tearDown() throws IOException {
        Files.walk(tempDir)
                .sorted((left, right) -> right.compareTo(left))
                .forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException ignored) {
                    }
                });
    }

    /**
     * Verifies rapid events are collapsed into a single debounced batch.
     */
    @Test
    public void submit_rapidEvents_processesSingleBatch() throws Exception {
        CountDownLatch latch = new CountDownLatch(3);
        AtomicInteger handled = new AtomicInteger();
        FileWatcherProcessor processor = new FileWatcherProcessor(
                virtualFileSystem,
                path -> path.getParent(),
                (projectRoot, filePath, changeType) -> {
                    handled.incrementAndGet();
                    latch.countDown();
                }
        );

        try {
            Path first = createFile("projectA/main.bal");
            Path second = createFile("projectA/util.bal");
            Path third = createFile("projectA/config/Ballerina.toml");

            processor.submit(new FileEvent(first.toUri().toString(), FileChangeType.Changed));
            processor.submit(new FileEvent(second.toUri().toString(), FileChangeType.Changed));
            processor.submit(new FileEvent(third.toUri().toString(), FileChangeType.Changed));

            Assert.assertTrue(latch.await(3, TimeUnit.SECONDS), "all events should be handled");
            Assert.assertEquals(handled.get(), 3);
            Assert.assertEquals(processor.processedBatchCount(), 1);
        } finally {
            processor.shutdown();
        }
    }

    /**
     * Verifies overlaid files are skipped because editor buffer is authoritative.
     */
    @Test
    public void submit_overlaidFile_skipsProcessing() throws Exception {
        AtomicInteger handled = new AtomicInteger();
        FileWatcherProcessor processor = new FileWatcherProcessor(
                virtualFileSystem,
                path -> path.getParent(),
                (projectRoot, filePath, changeType) -> handled.incrementAndGet()
        );

        try {
            Path file = createFile("projectB/main.bal");
            DocumentUri uri = new DocumentUri.FileUri(file.toUri());
            virtualFileSystem.openDocument(uri, "open editor content");

            processor.submit(new FileEvent(file.toUri().toString(), FileChangeType.Changed));
            waitForBatchCount(processor, 1, 3000);

            Assert.assertEquals(handled.get(), 0);
        } finally {
            processor.shutdown();
        }
    }

    /**
     * Verifies one failing event does not abort processing of remaining events.
     */
    @Test
    public void processBatch_eventFailure_continuesRemainingEvents() throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        Path first = createFile("projectC/first.bal");
        Path second = createFile("projectC/second.bal");

        FileWatcherProcessor processor = new FileWatcherProcessor(
                virtualFileSystem,
                path -> path.getParent(),
                (projectRoot, filePath, changeType) -> {
                    if (filePath.equals(first)) {
                        throw new IllegalStateException("boom");
                    }
                    if (filePath.equals(second)) {
                        latch.countDown();
                    }
                }
        );

        try {
            processor.submit(new FileEvent(first.toUri().toString(), FileChangeType.Changed));
            processor.submit(new FileEvent(second.toUri().toString(), FileChangeType.Changed));

            Assert.assertTrue(latch.await(3, TimeUnit.SECONDS), "second event should still process");
        } finally {
            processor.shutdown();
        }
    }

    /**
     * Verifies project roots are pre-computed for all events before handler execution.
     */
    @Test
    public void processBatch_precomputesRootsBeforeHandling() throws Exception {
        CountDownLatch latch = new CountDownLatch(2);
        List<String> ordering = new ArrayList<>();

        FileWatcherProcessor processor = new FileWatcherProcessor(
                virtualFileSystem,
                path -> {
                    ordering.add("resolve:" + path.getFileName());
                    return path.getParent();
                },
                (projectRoot, filePath, changeType) -> {
                    ordering.add("handle:" + filePath.getFileName());
                    latch.countDown();
                }
        );

        try {
            Path first = createFile("projectD/alpha.bal");
            Path second = createFile("projectD/beta.bal");

            processor.submit(new FileEvent(first.toUri().toString(), FileChangeType.Changed));
            processor.submit(new FileEvent(second.toUri().toString(), FileChangeType.Changed));

            Assert.assertTrue(latch.await(3, TimeUnit.SECONDS));

            Assert.assertEquals(ordering.get(0), "resolve:alpha.bal");
            Assert.assertEquals(ordering.get(1), "resolve:beta.bal");
            Assert.assertTrue(ordering.get(2).startsWith("handle:"));
            Assert.assertTrue(ordering.get(3).startsWith("handle:"));
        } finally {
            processor.shutdown();
        }
    }

    /**
     * Creates a test file under the temporary directory.
     *
     * @param relativePath relative file path
     * @return created absolute path
     */
    private Path createFile(String relativePath) throws IOException {
        Path file = tempDir.resolve(relativePath);
        Files.createDirectories(file.getParent());
        Files.writeString(file, "content");
        return file;
    }

    /**
     * Waits until the processor reaches the expected number of batches.
     *
     * @param processor processor under test
     * @param expected expected batch count
     * @param timeoutMs timeout in milliseconds
     */
    private void waitForBatchCount(FileWatcherProcessor processor, int expected, long timeoutMs)
            throws InterruptedException {
        long start = System.currentTimeMillis();
        while (System.currentTimeMillis() - start < timeoutMs) {
            if (processor.processedBatchCount() >= expected) {
                return;
            }
            Thread.sleep(10L);
        }
        Assert.fail("timed out waiting for batch count " + expected);
    }
}
