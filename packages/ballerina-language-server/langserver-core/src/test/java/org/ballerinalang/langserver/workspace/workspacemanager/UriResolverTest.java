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

import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import io.ballerina.projects.TomlDocument;
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
    private Document mockDocument;
    private TomlDocument mockTomlDocument;

    @BeforeMethod
    public void setUp() {
        resolver = new UriResolver();
        mockProject = Mockito.mock(Project.class);
        mockModule = Mockito.mock(Module.class);
        mockDocument = Mockito.mock(Document.class);
        mockTomlDocument = Mockito.mock(TomlDocument.class);
    }

    /**
     * Verifies that resolving from an empty cache returns empty.
     */
    @Test
    public void resolve_emptyResolver_returnsEmpty() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));

        Assert.assertEquals(resolver.resolve(uri), Optional.empty());
    }

    /**
     * Verifies register + resolve round-trip for a ProjectEntry.
     */
    @Test
    public void resolve_afterRegisterProject_returnsProjectEntry() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/project"));
        ResolvedEntry entry = new ResolvedEntry.ProjectEntry(mockProject);

        resolver.register(uri, entry);

        Assert.assertEquals(resolver.resolve(uri), Optional.of(entry));
    }

    /**
     * Verifies register + resolve round-trip for a ModuleEntry.
     */
    @Test
    public void resolve_afterRegisterModule_returnsModuleEntry() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/project/modules/auth"));
        ResolvedEntry entry = new ResolvedEntry.ModuleEntry(mockModule);

        resolver.register(uri, entry);

        Assert.assertEquals(resolver.resolve(uri), Optional.of(entry));
    }

    /**
     * Verifies register + resolve round-trip for a DocumentEntry.
     */
    @Test
    public void resolve_afterRegisterDocument_returnsDocumentEntry() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/project/main.bal"));
        ResolvedEntry entry = new ResolvedEntry.DocumentEntry(mockDocument);

        resolver.register(uri, entry);

        Assert.assertEquals(resolver.resolve(uri), Optional.of(entry));
    }

    /**
     * Verifies register + resolve round-trip for a ConfigEntry.
     */
    @Test
    public void resolve_afterRegisterConfig_returnsConfigEntry() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/project/Ballerina.toml"));
        ResolvedEntry entry = new ResolvedEntry.ConfigEntry(mockTomlDocument);

        resolver.register(uri, entry);

        Assert.assertEquals(resolver.resolve(uri), Optional.of(entry));
    }

    /**
     * Verifies that a different URI returns empty after registering another URI.
     */
    @Test
    public void resolve_differentUri_returnsEmpty() {
        DocumentUri registered = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        DocumentUri other = new DocumentUri.FileUri(URI.create("file:///workspace/util.bal"));

        resolver.register(registered, new ResolvedEntry.DocumentEntry(mockDocument));

        Assert.assertEquals(resolver.resolve(other), Optional.empty());
    }

    /**
     * Verifies that unregister followed by resolve returns empty.
     */
    @Test
    public void resolve_afterUnregister_returnsEmpty() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        resolver.register(uri, new ResolvedEntry.DocumentEntry(mockDocument));

        resolver.unregister(uri);

        Assert.assertEquals(resolver.resolve(uri), Optional.empty());
    }

    /**
     * Verifies that unregister of a non-existent URI is a no-op.
     */
    @Test
    public void unregister_nonExistentUri_isNoOp() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));

        resolver.unregister(uri);

        Assert.assertEquals(resolver.resolve(uri), Optional.empty());
    }

    /**
     * Verifies that re-registering the same URI overwrites the previous entry.
     */
    @Test
    public void register_sameUri_overwritesPreviousEntry() {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        ResolvedEntry first = new ResolvedEntry.DocumentEntry(mockDocument);
        ResolvedEntry second = new ResolvedEntry.ProjectEntry(mockProject);

        resolver.register(uri, first);
        resolver.register(uri, second);

        Assert.assertEquals(resolver.resolve(uri), Optional.of(second));
    }

    /**
     * Verifies that evictSubtree removes all entries under the given source root prefix.
     */
    @Test
    public void evictSubtree_removesAllEntriesUnderPrefix() {
        SourceRoot sourceRoot = new SourceRoot(Path.of("/workspace/project").toAbsolutePath().normalize());
        DocumentUri doc1 = new DocumentUri.FileUri(URI.create("file:///workspace/project/main.bal"));
        DocumentUri doc2 = new DocumentUri.FileUri(URI.create("file:///workspace/project/modules/auth/auth.bal"));

        resolver.register(doc1, new ResolvedEntry.DocumentEntry(mockDocument));
        resolver.register(doc2, new ResolvedEntry.DocumentEntry(mockDocument));
        resolver.evictSubtree(sourceRoot);

        Assert.assertEquals(resolver.resolve(doc1), Optional.empty());
        Assert.assertEquals(resolver.resolve(doc2), Optional.empty());
    }

    /**
     * Verifies that evictSubtree preserves entries outside the given prefix.
     */
    @Test
    public void evictSubtree_preservesEntriesOutsidePrefix() {
        SourceRoot sourceRoot = new SourceRoot(Path.of("/workspace/project-a").toAbsolutePath().normalize());
        DocumentUri inScope = new DocumentUri.FileUri(URI.create("file:///workspace/project-a/main.bal"));
        DocumentUri outScope = new DocumentUri.FileUri(URI.create("file:///workspace/project-b/main.bal"));
        ResolvedEntry entry = new ResolvedEntry.DocumentEntry(mockDocument);

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
        ResolvedEntry first = new ResolvedEntry.DocumentEntry(mockDocument);
        ResolvedEntry second = new ResolvedEntry.ProjectEntry(mockProject);

        resolver.register(uri, first);
        Optional<ResolvedEntry> capturedBeforeUpdate = resolver.resolve(uri);

        resolver.register(uri, second);

        Assert.assertEquals(capturedBeforeUpdate, Optional.of(first));
        Assert.assertEquals(resolver.resolve(uri), Optional.of(second));
    }

    /**
     * Verifies that multiple entries at different URIs resolve independently.
     */
    @Test
    public void register_multipleUris_eachResolvesIndependently() {
        DocumentUri uri1 = new DocumentUri.FileUri(URI.create("file:///workspace/project"));
        DocumentUri uri2 = new DocumentUri.FileUri(URI.create("file:///workspace/project/modules/auth"));
        DocumentUri uri3 = new DocumentUri.FileUri(URI.create("file:///workspace/project/main.bal"));
        DocumentUri uri4 = new DocumentUri.FileUri(URI.create("file:///workspace/project/Ballerina.toml"));
        ResolvedEntry e1 = new ResolvedEntry.ProjectEntry(mockProject);
        ResolvedEntry e2 = new ResolvedEntry.ModuleEntry(mockModule);
        ResolvedEntry e3 = new ResolvedEntry.DocumentEntry(mockDocument);
        ResolvedEntry e4 = new ResolvedEntry.ConfigEntry(mockTomlDocument);

        resolver.register(uri1, e1);
        resolver.register(uri2, e2);
        resolver.register(uri3, e3);
        resolver.register(uri4, e4);

        Assert.assertEquals(resolver.resolve(uri1), Optional.of(e1));
        Assert.assertEquals(resolver.resolve(uri2), Optional.of(e2));
        Assert.assertEquals(resolver.resolve(uri3), Optional.of(e3));
        Assert.assertEquals(resolver.resolve(uri4), Optional.of(e4));
    }

    /**
     * Verifies that concurrent reads during a write do not block or throw — lock-free proof.
     */
    @Test
    public void concurrentReads_duringWrite_doNotBlockOrThrow() throws InterruptedException {
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///workspace/main.bal"));
        ResolvedEntry entry = new ResolvedEntry.DocumentEntry(mockDocument);
        resolver.register(uri, entry);

        int readerCount = 50;
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(readerCount + 1);
        AtomicInteger successCount = new AtomicInteger(0);
        List<Throwable> errors = new ArrayList<>();

        ExecutorService executor = Executors.newFixedThreadPool(readerCount + 1);

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

        for (int i = 0; i < readerCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    for (int j = 0; j < 100; j++) {
                        resolver.resolve(uri);
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
}
