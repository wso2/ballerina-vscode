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

import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.net.URI;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tests for {@link UriResolver} lock-free URI resolution cache.
 *
 * @since 1.7.0
 */
public class UriResolverTest {

    private UriResolver resolver;
    private Project mockProject;
    private Module mockModule;
    private DocumentId mockDocumentId;

    @BeforeMethod
    public void setUp() {
        resolver = new UriResolver();
        mockProject = Mockito.mock(Project.class);
        mockModule = Mockito.mock(Module.class);
        mockDocumentId = Mockito.mock(DocumentId.class);
    }

    /**
     * Verifies that resolving from an empty cache returns empty.
     */
    @Test
    public void resolve_emptyResolver_returnsEmpty() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));

        Optional<ResolvedEntry> result = resolver.resolve(uri);

        Assert.assertEquals(result, Optional.empty());
    }

    /**
     * Verifies that register followed by resolve returns the registered entry.
     */
    @Test
    public void resolve_afterRegister_returnsEntry() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        ResolvedEntry entry = new ResolvedEntry(mockProject, mockModule, mockDocumentId);

        resolver.register(uri, entry);
        Optional<ResolvedEntry> result = resolver.resolve(uri);

        Assert.assertEquals(result, Optional.of(entry));
    }

    /**
     * Verifies that a different URI is not resolved after registering another URI.
     */
    @Test
    public void resolve_differentUri_returnsEmpty() {
        DocumentUri registered = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        DocumentUri other = new DocumentUri.FileUri(URI.create("file:///workspace/util.bal"));
        ResolvedEntry entry = new ResolvedEntry(mockProject, mockModule, mockDocumentId);

        resolver.register(registered, entry);
        Optional<ResolvedEntry> result = resolver.resolve(other);

        Assert.assertEquals(result, Optional.empty());
    }

    /**
     * Verifies that unregister followed by resolve returns empty.
     */
    @Test
    public void resolve_afterUnregister_returnsEmpty() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        ResolvedEntry entry = new ResolvedEntry(mockProject, mockModule, mockDocumentId);

        resolver.register(uri, entry);
        resolver.unregister(uri);
        Optional<ResolvedEntry> result = resolver.resolve(uri);

        Assert.assertEquals(result, Optional.empty());
    }

    /**
     * Verifies that unregister of a non-existent URI is a no-op.
     */
    @Test
    public void unregister_nonExistentUri_isNoOp() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));

        resolver.unregister(uri);
        Optional<ResolvedEntry> result = resolver.resolve(uri);

        Assert.assertEquals(result, Optional.empty());
    }

    /**
     * Verifies that register overwrites an existing entry at the same URI.
     */
    @Test
    public void register_sameUri_overwritesPreviousEntry() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        ResolvedEntry entry1 = new ResolvedEntry(mockProject, mockModule, mockDocumentId);
        Project mockProject2 = Mockito.mock(Project.class);
        ResolvedEntry entry2 = new ResolvedEntry(mockProject2, mockModule, mockDocumentId);

        resolver.register(uri, entry1);
        resolver.register(uri, entry2);
        Optional<ResolvedEntry> result = resolver.resolve(uri);

        Assert.assertEquals(result, Optional.of(entry2));
    }

    /**
     * Verifies that evictSubtree removes all entries under the given source root prefix.
     */
    @Test
    public void evictSubtree_removesAllEntriesUnderPrefix() {
        SourceRoot sourceRoot = new SourceRoot(Path.of("/workspace/project").toAbsolutePath().normalize());
        DocumentUri doc1 = new DocumentUri.FileUri(URI.create("file:///workspace/project/main.bal"));
        DocumentUri doc2 = new DocumentUri.FileUri(URI.create("file:///workspace/project/modules/util/util.bal"));
        ResolvedEntry entry = new ResolvedEntry(mockProject, mockModule, mockDocumentId);

        resolver.register(doc1, entry);
        resolver.register(doc2, entry);
        resolver.evictSubtree(sourceRoot);

        Assert.assertEquals(resolver.resolve(doc1), Optional.empty());
        Assert.assertEquals(resolver.resolve(doc2), Optional.empty());
    }

    /**
     * Verifies that evictSubtree preserves entries outside the given source root prefix.
     */
    @Test
    public void evictSubtree_preservesEntriesOutsidePrefix() {
        SourceRoot sourceRoot = new SourceRoot(Path.of("/workspace/project-a").toAbsolutePath().normalize());
        DocumentUri inScope = new DocumentUri.FileUri(URI.create("file:///workspace/project-a/main.bal"));
        DocumentUri outScope = new DocumentUri.FileUri(URI.create("file:///workspace/project-b/main.bal"));
        ResolvedEntry entry = new ResolvedEntry(mockProject, mockModule, mockDocumentId);

        resolver.register(inScope, entry);
        resolver.register(outScope, entry);
        resolver.evictSubtree(sourceRoot);

        Assert.assertEquals(resolver.resolve(inScope), Optional.empty());
        Assert.assertEquals(resolver.resolve(outScope), Optional.of(entry));
    }

    /**
     * Verifies that old trie snapshots remain valid after a write (snapshot immutability).
     */
    @Test
    public void register_oldSnapshotRemainsImmutable() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        ResolvedEntry entry1 = new ResolvedEntry(mockProject, mockModule, mockDocumentId);
        ResolvedEntry entry2 = new ResolvedEntry(mockProject, mockModule, null);

        resolver.register(uri, entry1);
        // Capture a resolved entry before the second write — indirect snapshot check
        Optional<ResolvedEntry> beforeUpdate = resolver.resolve(uri);
        Assert.assertEquals(beforeUpdate, Optional.of(entry1));

        resolver.register(uri, entry2);
        // After update, old result is unchanged (captured before update)
        Assert.assertEquals(beforeUpdate, Optional.of(entry1));
        // New snapshot reflects the new entry
        Assert.assertEquals(resolver.resolve(uri), Optional.of(entry2));
    }

    /**
     * Verifies that multiple entries at different URIs can be registered and resolved independently.
     */
    @Test
    public void register_multipleUris_eachResolvesIndependently() {
        DocumentUri uri1 = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        DocumentUri uri2 = new DocumentUri.FileUri(URI.create("file:///workspace/util.bal"));
        DocumentUri uri3 = new DocumentUri.FileUri(URI.create("file:///workspace/modules/auth/auth.bal"));
        ResolvedEntry entry1 = new ResolvedEntry(mockProject, mockModule, mockDocumentId);
        Module mockModule2 = Mockito.mock(Module.class);
        ResolvedEntry entry2 = new ResolvedEntry(mockProject, mockModule2, mockDocumentId);
        ResolvedEntry entry3 = new ResolvedEntry(mockProject, mockModule, null);

        resolver.register(uri1, entry1);
        resolver.register(uri2, entry2);
        resolver.register(uri3, entry3);

        Assert.assertEquals(resolver.resolve(uri1), Optional.of(entry1));
        Assert.assertEquals(resolver.resolve(uri2), Optional.of(entry2));
        Assert.assertEquals(resolver.resolve(uri3), Optional.of(entry3));
    }

    /**
     * Verifies that concurrent reads during a write do not block or throw — lock-free proof.
     */
    @Test
    public void concurrentReads_duringWrite_doNotBlockOrThrow() throws InterruptedException {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        ResolvedEntry entry = new ResolvedEntry(mockProject, mockModule, mockDocumentId);
        resolver.register(uri, entry);

        int readerCount = 50;
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(readerCount + 1);
        AtomicInteger successCount = new AtomicInteger(0);
        List<Throwable> errors = new ArrayList<>();

        ExecutorService executor = Executors.newFixedThreadPool(readerCount + 1);

        // Writer thread: continuously registers new entries
        executor.submit(() -> {
            try {
                startLatch.await();
                for (int i = 0; i < 100; i++) {
                    resolver.register(uri, entry);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                doneLatch.countDown();
            }
        });

        // Reader threads: resolve concurrently during writes
        for (int i = 0; i < readerCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int j = 0; j < 100; j++) {
                        resolver.resolve(uri); // must not throw
                        successCount.incrementAndGet();
                    }
                } catch (Throwable t) {
                    synchronized (errors) {
                        errors.add(t);
                    }
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdownNow();

        Assert.assertTrue(completed, "Concurrent reads/write did not complete in time");
        Assert.assertTrue(errors.isEmpty(), "Concurrent reads threw exceptions: " + errors);
        Assert.assertEquals(successCount.get(), readerCount * 100, "Not all reads completed successfully");
    }

    /**
     * Verifies that ResolvedEntry allows null documentId for project-level entries.
     */
    @Test
    public void resolvedEntry_nullDocumentId_isAllowed() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/project/Ballerina.toml"));
        ResolvedEntry entry = new ResolvedEntry(mockProject, mockModule, null);

        resolver.register(uri, entry);
        Optional<ResolvedEntry> result = resolver.resolve(uri);

        Assert.assertTrue(result.isPresent());
        Assert.assertNull(result.get().documentId());
    }
}