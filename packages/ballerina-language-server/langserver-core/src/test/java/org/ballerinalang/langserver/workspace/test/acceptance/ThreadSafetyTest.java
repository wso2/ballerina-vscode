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
package org.ballerinalang.langserver.workspace.test.acceptance;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.PackageDescriptor;
import io.ballerina.projects.PackageName;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationKey;
import org.ballerinalang.langserver.workspace.compilerengine.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.compilerengine.InProgressSnapshot;
import org.ballerinalang.langserver.workspace.compilerengine.StableSnapshot;
import org.ballerinalang.langserver.workspace.workspacemanager.ContentVersion;
import org.ballerinalang.langserver.workspace.workspacemanager.DocumentUri;
import org.ballerinalang.langserver.workspace.workspacemanager.BufferedChange;
import org.ballerinalang.langserver.workspace.workspacemanager.ChangeBuffer;
import org.ballerinalang.langserver.workspace.workspacemanager.ChangeLayer;
import org.ballerinalang.langserver.workspace.workspacemanager.HeapEstimate;
import org.ballerinalang.langserver.workspace.workspacemanager.Project;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.ResolvedEntry;
import org.ballerinalang.langserver.workspace.workspacemanager.UriResolver;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.net.URI;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import static org.mockito.Mockito.mock;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantReadWriteLock;

/**
 * Acceptance tests for thread safety and concurrency constraints in the v2.0 concurrency model.
 * Covers UriResolver lock-free reads (ADR-048), ChangeBuffer concurrent append/drain (ADR-047),
 * and DualSnapshotStore atomic publish (ADR-042).
 *
 * @since 1.7.0
 */
public class ThreadSafetyTest {

    // -------------------------------------------------------------------------
    // UriResolver (ADR-048) — lock-free reads via AtomicReference<TrieNode>
    // -------------------------------------------------------------------------

    /**
     * 100 reader threads resolve concurrently while 1 writer registers a new entry.
     * All readers must complete without blocking — lock-free guarantee of ADR-048.
     */
    @Test
    public void testUriResolverLockFreeReads() throws Exception {
        UriResolver resolver = new UriResolver();
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///tmp/proj/main.bal"));
        ResolvedEntry entry = new ResolvedEntry.DocumentEntry(mock(io.ballerina.projects.Document.class));
        resolver.register(uri, entry);

        int readerCount = 100;
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(readerCount);
        AtomicInteger successCount = new AtomicInteger(0);

        ExecutorService readers = Executors.newFixedThreadPool(readerCount);
        for (int i = 0; i < readerCount; i++) {
            readers.submit(() -> {
                try {
                    startGate.await();
                    Optional<ResolvedEntry> result = resolver.resolve(uri);
                    if (result.isPresent()) {
                        successCount.incrementAndGet();
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        DocumentUri uri2 = new DocumentUri.FileUri(URI.create("file:///tmp/proj/util.bal"));
        ResolvedEntry entry2 = new ResolvedEntry.DocumentEntry(mock(io.ballerina.projects.Document.class));
        startGate.countDown();
        resolver.register(uri2, entry2);
        done.await();
        readers.shutdown();

        Assert.assertEquals(successCount.get(), readerCount,
                "All 100 readers must resolve the registered entry without blocking");
    }

    @Test
    public void testProjectLockIsReadWrite() throws Exception {
        checkFieldType("org.ballerinalang.langserver.workspace.workspacemanager.ProjectLock", "lock",
                ReentrantReadWriteLock.class);
    }

    @Test
    public void testNoRawCollectionsInMultiThreadedFields() throws Exception {
        String[] classesToCheck = {
                "org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry",
                "org.ballerinalang.langserver.workspace.execution.ProcessRegistry"
        };

        for (String className : classesToCheck) {
            Class<?> clazz = Class.forName(className);
            for (Field field : clazz.getDeclaredFields()) {
                if (!Modifier.isStatic(field.getModifiers())) {
                    String typeName = field.getType().getName();
                    Assert.assertFalse(typeName.equals("java.util.HashMap")
                                    || typeName.equals("java.util.HashSet")
                                    || typeName.equals("java.util.LinkedHashMap"),
                            "Field " + field.getName() + " in " + className
                                    + " uses non-thread-safe collection: " + typeName);
                }
            }
        }
    }

    @Test
    public void testConcurrentReadsDoNotBlockEachOther() {
        Project project = new Project(
                new DocumentUri.FileUri(Path.of("/tmp/test").toAbsolutePath().normalize().toUri()),
                ProjectKind.BUILD, HeapEstimate.ofMb(10));
        Lock readLock = project.projectLock().readLock();

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            futures.add(CompletableFuture.runAsync(() -> {
                boolean acquired = readLock.tryLock();
                Assert.assertTrue(acquired, "Read lock should be acquired concurrently");
                if (acquired) {
                    readLock.unlock();
                }
            }, executor));
        }

        CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
        executor.shutdown();

        Assert.assertEquals(futures.size(), threadCount,
                "All concurrent readers must complete without blocking each other");
    }

    /**
     * A reader that resolves before a write sees consistent stale data —
     * the old entry remains valid and present in the snapshot it observed.
     */
    @Test
    public void testUriResolverSnapshotConsistency() {
        UriResolver resolver = new UriResolver();
        DocumentUri uriA = new DocumentUri.FileUri(URI.create("file:///tmp/proj/a.bal"));
        DocumentUri uriB = new DocumentUri.FileUri(URI.create("file:///tmp/proj/b.bal"));
        DocumentUri uriC = new DocumentUri.FileUri(URI.create("file:///tmp/proj/c.bal"));
        ResolvedEntry entryA = new ResolvedEntry.DocumentEntry(mock(io.ballerina.projects.Document.class));
        ResolvedEntry entryB = new ResolvedEntry.DocumentEntry(mock(io.ballerina.projects.Document.class));

        resolver.register(uriA, entryA);

        // Resolve before registering B — must see A, not be affected by the subsequent write
        Optional<ResolvedEntry> beforeWrite = resolver.resolve(uriA);
        resolver.register(uriB, entryB);

        Assert.assertTrue(beforeWrite.isPresent(), "Entry A must be visible before write");
        Assert.assertSame(beforeWrite.get(), entryA, "Stale read must return original entry A");
        Assert.assertTrue(resolver.resolve(uriB).isPresent(), "Entry B must be visible after registration");
        Assert.assertFalse(resolver.resolve(uriC).isPresent(), "Unregistered URI must resolve to empty");
    }

    // -------------------------------------------------------------------------
    // ChangeBuffer (ADR-047) — ConcurrentHashMap-based concurrent append/drain
    // -------------------------------------------------------------------------

    /**
     * 10 threads each append 100 changes to the same URI simultaneously.
     * Draining afterwards must yield exactly 1000 changes — no data loss.
     */
    @Test
    public void testChangeBufferConcurrentAppend() throws Exception {
        ChangeBuffer buffer = new ChangeBuffer();
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///tmp/proj/main.bal"));
        ContentVersion version = new ContentVersion(1);

        int threadCount = 10;
        int changesPerThread = 100;
        CyclicBarrier startBarrier = new CyclicBarrier(threadCount);
        CountDownLatch done = new CountDownLatch(threadCount);

        ExecutorService writers = Executors.newFixedThreadPool(threadCount);
        for (int t = 0; t < threadCount; t++) {
            writers.submit(() -> {
                try {
                    startBarrier.await();
                    for (int i = 0; i < changesPerThread; i++) {
                        TextDocumentContentChangeEvent event = new TextDocumentContentChangeEvent();
                        event.setText("change-" + i);
                        buffer.append(uri, new BufferedChange(event, ChangeLayer.EDITOR, version));
                    }
                } catch (Exception e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        done.await();
        writers.shutdown();

        List<BufferedChange> drained = buffer.drain(uri, ChangeLayer.EDITOR);
        Assert.assertEquals(drained.size(), threadCount * changesPerThread,
                "All " + (threadCount * changesPerThread) + " changes must be present — no data loss from concurrent append");
    }

    /**
     * Drain and append run concurrently on the same URI.
     * Total drained + remaining in buffer must equal total appended — no data loss or duplication.
     */
    @Test
    public void testChangeBufferConcurrentDrainAndAppend() throws Exception {
        ChangeBuffer buffer = new ChangeBuffer();
        DocumentUri uri = new DocumentUri.FileUri(URI.create("file:///tmp/proj/main.bal"));
        ContentVersion version = new ContentVersion(1);

        int appendThreads = 5;
        int changesPerThread = 50;
        AtomicInteger totalAppended = new AtomicInteger(0);
        AtomicInteger totalDrained = new AtomicInteger(0);
        CyclicBarrier startBarrier = new CyclicBarrier(appendThreads + 1);
        CountDownLatch done = new CountDownLatch(appendThreads + 1);

        ExecutorService executor = Executors.newFixedThreadPool(appendThreads + 1);

        for (int t = 0; t < appendThreads; t++) {
            executor.submit(() -> {
                try {
                    startBarrier.await();
                    for (int i = 0; i < changesPerThread; i++) {
                        TextDocumentContentChangeEvent event = new TextDocumentContentChangeEvent();
                        event.setText("c");
                        buffer.append(uri, new BufferedChange(event, ChangeLayer.EDITOR, version));
                        totalAppended.incrementAndGet();
                    }
                } catch (Exception e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        executor.submit(() -> {
            try {
                startBarrier.await();
                for (int round = 0; round < 10; round++) {
                    List<BufferedChange> drained = buffer.drain(uri, ChangeLayer.EDITOR);
                    totalDrained.addAndGet(drained.size());
                    Thread.yield();
                }
            } catch (Exception e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });

        done.await();
        executor.shutdown();

        List<BufferedChange> remaining = buffer.drain(uri, ChangeLayer.EDITOR);
        int finalTotal = totalDrained.get() + remaining.size();

        Assert.assertEquals(finalTotal, totalAppended.get(),
                "drained + remaining must equal total appended — no data loss or duplication");
    }

    // -------------------------------------------------------------------------
    // DualSnapshotStore (ADR-042) — atomic snapshot publication
    // -------------------------------------------------------------------------

    /**
     * getStable() returns null before any publishStable() call.
     */
    @Test
    public void testDualSnapshotStoreNullBeforeFirstPublish() {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor sourceRoot = descriptor("thread-safety-proj-1");

        Assert.assertNull(store.getStable(testKey(sourceRoot)),
                "getStable() must return null before any publishStable() call");
    }

    /**
     * 50 concurrent readers call getStable() while a writer calls publishStable().
     * Every reader must see either the old or the new snapshot — never a partial state.
     */
    @Test
    public void testDualSnapshotStoreAtomicPublish() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor sourceRoot = descriptor("thread-safety-proj-2");

        StableSnapshot oldSnapshot = stubSnapshot(new ContentVersion(1));
        StableSnapshot newSnapshot = stubSnapshot(new ContentVersion(2));

        store.publishStable(testKey(sourceRoot), oldSnapshot);

        int readerCount = 50;
        CountDownLatch startGate = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(readerCount + 1);
        Set<StableSnapshot> seen = ConcurrentHashMap.newKeySet();

        ExecutorService executor = Executors.newFixedThreadPool(readerCount + 1);

        for (int i = 0; i < readerCount; i++) {
            executor.submit(() -> {
                try {
                    startGate.await();
                    StableSnapshot result = store.getStable(testKey(sourceRoot));
                    if (result != null) {
                        seen.add(result);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        executor.submit(() -> {
            try {
                startGate.await();
                store.publishStable(testKey(sourceRoot), newSnapshot);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                done.countDown();
            }
        });

        startGate.countDown();
        done.await();
        executor.shutdown();

        for (StableSnapshot snap : seen) {
            Assert.assertTrue(snap == oldSnapshot || snap == newSnapshot,
                    "Reader observed a snapshot that is neither old nor new — atomic publish violated");
        }
        Assert.assertSame(store.getStable(testKey(sourceRoot)), newSnapshot,
                "After publishStable(), getStable() must return the new snapshot");
    }

    /**
     * 10 threads call startCompilation() concurrently on the same project root URI.
     * All calls must return a non-null InProgressSnapshot, and the store's
     * getInProgress() result must be one of the returned snapshots.
     */
    @Test
    public void testDualSnapshotStoreStartCompilationIsAtomic() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor sourceRoot = descriptor("thread-safety-proj-3");

        int threadCount = 10;
        CyclicBarrier startBarrier = new CyclicBarrier(threadCount);
        CountDownLatch done = new CountDownLatch(threadCount);
        List<InProgressSnapshot> created = new ArrayList<>();
        Object listLock = new Object();

        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startBarrier.await();
                    InProgressSnapshot snapshot = store.startCompilation(testKey(sourceRoot));
                    synchronized (listLock) {
                        created.add(snapshot);
                    }
                } catch (Exception e) {
                    Thread.currentThread().interrupt();
                } finally {
                    done.countDown();
                }
            });
        }

        done.await();
        executor.shutdown();

        Assert.assertEquals(created.size(), threadCount,
                "All startCompilation() calls must return a non-null snapshot");
        for (InProgressSnapshot snap : created) {
            Assert.assertNotNull(snap, "startCompilation() must never return null");
        }

        InProgressSnapshot current = store.getInProgress(testKey(sourceRoot));
        Assert.assertNotNull(current, "After concurrent startCompilation(), one InProgressSnapshot must remain active");
        Assert.assertTrue(created.contains(current),
                "Active InProgressSnapshot must be one of the snapshots returned by startCompilation()");
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static StableSnapshot stubSnapshot(ContentVersion version) {
        return new StableSnapshot(java.util.Map.<DocumentId, SyntaxTree>of(), java.util.Map.of(),
                java.util.Map.<ModuleId, SemanticModel>of(), mock(PackageCompilation.class), version);
    }

    /**
     * Wraps a {@link PackageDescriptor} in a {@link CompilationKey} using the descriptor's
     * package name as the source root path. Used to satisfy {@link DualSnapshotStore}'s
     * {@code CompilationKey}-based API in test assertions.
     *
     * @param descriptor the package descriptor to wrap
     * @return a {@link CompilationKey} keyed by the descriptor's package name
     */
    private static CompilationKey testKey(PackageDescriptor descriptor) {
        return new CompilationKey("/" + descriptor.name().value(), descriptor);
    }

    private static PackageDescriptor descriptor(String packageNameValue) {
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        PackageName packageName = mock(PackageName.class);
        org.mockito.Mockito.when(descriptor.name()).thenReturn(packageName);
        org.mockito.Mockito.when(packageName.value()).thenReturn(packageNameValue);
        return descriptor;
    }

    private static void checkFieldType(String className, String fieldName, Class<?> expectedType)
            throws Exception {
        Class<?> clazz = Class.forName(className);
        Field field = clazz.getDeclaredField(fieldName);
        Assert.assertEquals(field.getType(), expectedType,
                "Expected field '" + fieldName + "' in " + className + " to use "
                        + expectedType.getName());
    }
}
