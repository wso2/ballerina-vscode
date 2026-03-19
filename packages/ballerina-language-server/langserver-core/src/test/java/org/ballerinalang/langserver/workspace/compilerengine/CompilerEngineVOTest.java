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

package org.ballerinalang.langserver.workspace.compilerengine;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.compilerengine.ResolutionResult.ResolutionDiagnostic;
import org.ballerinalang.langserver.workspace.compilerengine.ResolutionResult.Severity;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.mockito.Mockito.mock;

/**
 * Tests for Compiler Engine value objects and stores.
 *
 * @since 1.7.0
 */
public class CompilerEngineVOTest {

    private static final CancelChecker NO_OP_CANCEL_CHECKER = () -> {
    };

    // ---- FailureClass ----

    @Test
    public void failureClass_hasExactlyThreeValues() {
        Assert.assertEquals(FailureClass.values().length, 3);
    }

    @Test
    public void failureClass_valuesAreTransientPersistentFatal() {
        Assert.assertNotNull(FailureClass.valueOf("TRANSIENT"));
        Assert.assertNotNull(FailureClass.valueOf("PERSISTENT"));
        Assert.assertNotNull(FailureClass.valueOf("FATAL"));
        Assert.assertNotNull(FailureClass.TRANSIENT.description());
        Assert.assertNotNull(FailureClass.PERSISTENT.description());
        Assert.assertNotNull(FailureClass.FATAL.description());
    }

    // ---- ProjectSnapshot ----

    @Test
    public void snapshot_isImmutable() {
        PackageCompilation compilation = mock(PackageCompilation.class);
        SemanticModel semanticModel = mock(SemanticModel.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        ContentVersion version = new ContentVersion(1);

        ProjectSnapshot snapshot = new ProjectSnapshot(compilation, semanticModel, syntaxTree, version);

        Assert.assertSame(snapshot.compilation(), compilation);
        Assert.assertSame(snapshot.semanticModel(), semanticModel);
        Assert.assertSame(snapshot.syntaxTree(), syntaxTree);
        Assert.assertEquals(snapshot.contentVersion(), version);
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void snapshot_rejectsNullCompilation() {
        new ProjectSnapshot(null, mock(SemanticModel.class), mock(SyntaxTree.class), new ContentVersion(1));
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void snapshot_rejectsNullSemanticModel() {
        new ProjectSnapshot(mock(PackageCompilation.class), null, mock(SyntaxTree.class), new ContentVersion(1));
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void snapshot_rejectsNullSyntaxTree() {
        new ProjectSnapshot(mock(PackageCompilation.class), mock(SemanticModel.class), null, new ContentVersion(1));
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void snapshot_rejectsNullContentVersion() {
        new ProjectSnapshot(mock(PackageCompilation.class), mock(SemanticModel.class), mock(SyntaxTree.class), null);
    }

    @Test
    public void snapshot_equalityByValue() {
        PackageCompilation compilation = mock(PackageCompilation.class);
        SemanticModel semanticModel = mock(SemanticModel.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        ContentVersion version = new ContentVersion(1);

        ProjectSnapshot s1 = new ProjectSnapshot(compilation, semanticModel, syntaxTree, version);
        ProjectSnapshot s2 = new ProjectSnapshot(compilation, semanticModel, syntaxTree, version);

        Assert.assertEquals(s1, s2);
        Assert.assertEquals(s1.hashCode(), s2.hashCode());
    }

    // ---- DualSnapshotStore ----

    @Test
    public void dualSnapshotStore_startCompilationMakesInProgressAccessible() {
        DualSnapshotStore store = new DualSnapshotStore();
        SourceRoot root = new SourceRoot(Path.of("/tmp/project-dual").toAbsolutePath().normalize());

        InProgressSnapshot inProgressSnapshot = store.startCompilation(root);

        Assert.assertSame(store.getInProgress(root), inProgressSnapshot);
        Assert.assertNull(store.getStable(root));
        Assert.assertFalse(inProgressSnapshot.compilation(NO_OP_CANCEL_CHECKER).isDone());
    }

    @Test
    public void dualSnapshotStore_publishStableStoresSnapshotAndCompletesInProgressFuture() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        SourceRoot root = new SourceRoot(Path.of("/tmp/project-dual-publish").toAbsolutePath().normalize());
        InProgressSnapshot inProgressSnapshot = store.startCompilation(root);
        StableSnapshot stableSnapshot = createStableSnapshot(new ContentVersion(4));

        store.publishStable(root, stableSnapshot);

        Assert.assertSame(store.getStable(root), stableSnapshot);
        Assert.assertNull(store.getInProgress(root));
        Assert.assertSame(inProgressSnapshot.compilation(NO_OP_CANCEL_CHECKER).get(1, TimeUnit.SECONDS),
                stableSnapshot.compilation());
    }

    @Test(expectedExceptions = CancellationException.class)
    public void dualSnapshotStore_cancelInProgressCancelsCompilationFuture() {
        DualSnapshotStore store = new DualSnapshotStore();
        SourceRoot root = new SourceRoot(Path.of("/tmp/project-dual-cancel").toAbsolutePath().normalize());
        InProgressSnapshot inProgressSnapshot = store.startCompilation(root);

        store.cancelInProgress(root);

        Assert.assertNull(store.getInProgress(root));
        inProgressSnapshot.compilation(NO_OP_CANCEL_CHECKER).join();
    }

    @Test
    public void dualSnapshotStore_getStableReturnsSameReferenceAcrossConcurrentReaders() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        SourceRoot root = new SourceRoot(Path.of("/tmp/project-dual-concurrent").toAbsolutePath().normalize());
        StableSnapshot stableSnapshot = createStableSnapshot(new ContentVersion(9));
        store.publishStable(root, stableSnapshot);

        int threadCount = 8;
        CountDownLatch done = new CountDownLatch(threadCount);
        CyclicBarrier start = new CyclicBarrier(threadCount);
        List<StableSnapshot> observed = new ArrayList<>();
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    start.await(5, TimeUnit.SECONDS);
                    synchronized (observed) {
                        observed.add(store.getStable(root));
                    }
                } catch (Exception e) {
                    throw new AssertionError(e);
                } finally {
                    done.countDown();
                }
            });
        }

        Assert.assertTrue(done.await(5, TimeUnit.SECONDS), "Concurrent stable reads timed out");
        executor.shutdown();
        Assert.assertEquals(observed.size(), threadCount);
        observed.forEach(snapshot -> Assert.assertSame(snapshot, stableSnapshot));
    }

    @Test
    public void dualSnapshotStore_publishStableUnblocksCompilationWaiter() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        SourceRoot root = new SourceRoot(Path.of("/tmp/project-dual-waiter").toAbsolutePath().normalize());
        InProgressSnapshot inProgressSnapshot = store.startCompilation(root);
        StableSnapshot stableSnapshot = createStableSnapshot(new ContentVersion(7));
        CountDownLatch waiterStarted = new CountDownLatch(1);
        CompletableFuture<PackageCompilation> observedCompilation = new CompletableFuture<>();

        Thread waiter = new Thread(() -> {
            waiterStarted.countDown();
            try {
                observedCompilation.complete(inProgressSnapshot.compilation(NO_OP_CANCEL_CHECKER).get(2,
                        TimeUnit.SECONDS));
            } catch (Exception e) {
                observedCompilation.completeExceptionally(e);
            }
        });
        waiter.start();
        Assert.assertTrue(waiterStarted.await(1, TimeUnit.SECONDS), "Waiter did not start");

        store.publishStable(root, stableSnapshot);

        Assert.assertSame(observedCompilation.get(2, TimeUnit.SECONDS), stableSnapshot.compilation());
        waiter.join(2000);
        Assert.assertFalse(waiter.isAlive(), "Waiter should finish after publish");
    }

    @Test
    public void dualSnapshotStore_tracksMultipleSourceRootsIndependently() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        SourceRoot firstRoot = new SourceRoot(Path.of("/tmp/project-dual-r1").toAbsolutePath().normalize());
        SourceRoot secondRoot = new SourceRoot(Path.of("/tmp/project-dual-r2").toAbsolutePath().normalize());
        InProgressSnapshot firstInProgress = store.startCompilation(firstRoot);
        InProgressSnapshot secondInProgress = store.startCompilation(secondRoot);
        StableSnapshot firstStable = createStableSnapshot(new ContentVersion(1));
        StableSnapshot secondStable = createStableSnapshot(new ContentVersion(2));

        store.publishStable(firstRoot, firstStable);
        store.publishStable(secondRoot, secondStable);

        Assert.assertSame(store.getStable(firstRoot), firstStable);
        Assert.assertSame(store.getStable(secondRoot), secondStable);
        Assert.assertSame(firstInProgress.compilation(NO_OP_CANCEL_CHECKER).get(1, TimeUnit.SECONDS),
                firstStable.compilation());
        Assert.assertSame(secondInProgress.compilation(NO_OP_CANCEL_CHECKER).get(1, TimeUnit.SECONDS),
                secondStable.compilation());
    }

    // ---- ResolutionResult ----

    @Test
    public void resolution_capturesDiagnosticsWithSourceRoot() {
        SourceRoot root = new SourceRoot(Path.of("/tmp/project").toAbsolutePath().normalize());
        List<ResolutionDiagnostic> diagnostics = List.of(
                new ResolutionDiagnostic(Severity.WARNING, "Unused import", "/mod1")
        );

        ResolutionResult result = new ResolutionResult(root, diagnostics, true);

        Assert.assertSame(result.sourceRoot(), root);
        Assert.assertEquals(result.diagnostics().size(), 1);
        Assert.assertEquals(result.diagnostics().get(0).severity(), Severity.WARNING);
    }

    @Test
    public void resolution_defensiveCopyOfDiagnostics() {
        SourceRoot root = new SourceRoot(Path.of("/tmp/project").toAbsolutePath().normalize());
        List<ResolutionDiagnostic> original = new ArrayList<>();
        original.add(new ResolutionDiagnostic(Severity.INFO, "Info", "/mod1"));

        ResolutionResult result = new ResolutionResult(root, original, true);
        original.add(new ResolutionDiagnostic(Severity.ERROR, "Error", "/mod2"));

        Assert.assertEquals(result.diagnostics().size(), 1, "Defensive copy should prevent mutation");
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void resolution_rejectsNullSourceRoot() {
        new ResolutionResult(null, List.of(), true);
    }

    @Test
    public void resolution_successFlagReflectsDiagnostics() {
        SourceRoot root = new SourceRoot(Path.of("/tmp/project").toAbsolutePath().normalize());

        ResolutionResult successResult = new ResolutionResult(root, List.of(), true);
        Assert.assertTrue(successResult.success());

        List<ResolutionDiagnostic> errors = List.of(
                new ResolutionDiagnostic(Severity.ERROR, "Unresolved module", "/mod1")
        );
        ResolutionResult failResult = new ResolutionResult(root, errors, false);
        Assert.assertFalse(failResult.success());
    }

    // ---- DirtyDocumentQueue ----

    @Test
    public void queue_markDirtyAndDrain() {
        DirtyDocumentQueue queue = new DirtyDocumentQueue(10);
        Path path = Path.of("/tmp/file.bal");
        ContentVersion version = new ContentVersion(1);

        Assert.assertTrue(queue.markDirty(path, version));
        Assert.assertEquals(queue.size(), 1);

        Map<Path, ContentVersion> drained = queue.drain();
        Assert.assertEquals(drained.size(), 1);
        Assert.assertEquals(drained.get(path), version);
        Assert.assertTrue(queue.isEmpty());
    }

    @Test
    public void queue_coalescesMultipleUpdatesToSameDocument() {
        DirtyDocumentQueue queue = new DirtyDocumentQueue(10);
        Path path = Path.of("/tmp/file.bal");

        queue.markDirty(path, new ContentVersion(1));
        queue.markDirty(path, new ContentVersion(2));

        Assert.assertEquals(queue.size(), 1);
        Map<Path, ContentVersion> drained = queue.drain();
        Assert.assertEquals(drained.get(path), new ContentVersion(2));
    }

    @Test
    public void queue_rejectsStaleVersion() {
        DirtyDocumentQueue queue = new DirtyDocumentQueue(10);
        Path path = Path.of("/tmp/file.bal");

        queue.markDirty(path, new ContentVersion(5));
        queue.markDirty(path, new ContentVersion(3));

        Map<Path, ContentVersion> drained = queue.drain();
        Assert.assertEquals(drained.get(path), new ContentVersion(5), "Stale version should be rejected");
    }

    @Test
    public void queue_drainReturnsEmptyWhenNothingDirty() {
        DirtyDocumentQueue queue = new DirtyDocumentQueue(10);

        Map<Path, ContentVersion> drained = queue.drain();
        Assert.assertTrue(drained.isEmpty());
    }

    @Test
    public void queue_boundedCapacity() {
        DirtyDocumentQueue queue = new DirtyDocumentQueue(2);

        Assert.assertTrue(queue.markDirty(Path.of("/tmp/a.bal"), new ContentVersion(1)));
        Assert.assertTrue(queue.markDirty(Path.of("/tmp/b.bal"), new ContentVersion(1)));
        Assert.assertFalse(queue.markDirty(Path.of("/tmp/c.bal"), new ContentVersion(1)));
    }

    @Test
    public void queue_concurrentMarkDirtyIsSafe() throws InterruptedException {
        DirtyDocumentQueue queue = new DirtyDocumentQueue(100);
        int threadCount = 8;
        int docsPerThread = 10;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int t = 0; t < threadCount; t++) {
            int threadId = t;
            executor.submit(() -> {
                try {
                    for (int d = 0; d < docsPerThread; d++) {
                        queue.markDirty(
                                Path.of("/tmp/t" + threadId + "_d" + d + ".bal"),
                                new ContentVersion(1)
                        );
                    }
                } finally {
                    latch.countDown();
                }
            });
        }

        Assert.assertTrue(latch.await(5, TimeUnit.SECONDS), "Concurrent markDirty timed out");
        executor.shutdown();

        Map<Path, ContentVersion> drained = queue.drain();
        Assert.assertEquals(drained.size(), threadCount * docsPerThread);
        Assert.assertTrue(queue.isEmpty());
    }

    // ---- Helper ----

    private ProjectSnapshot createMockSnapshot() {
        return new ProjectSnapshot(
                mock(PackageCompilation.class),
                mock(SemanticModel.class),
                mock(SyntaxTree.class),
                new ContentVersion(1)
        );
    }

    private StableSnapshot createStableSnapshot(ContentVersion contentVersion) {
        return new TestStableSnapshot(contentVersion, mock(PackageCompilation.class));
    }

    private record TestStableSnapshot(ContentVersion contentVersion,
                                      PackageCompilation compilation) implements StableSnapshot {

        @Override
        public SyntaxTree syntaxTree(io.ballerina.projects.DocumentId docId) {
            return mock(SyntaxTree.class);
        }

        @Override
        public SemanticModel semanticModel(io.ballerina.projects.ModuleId moduleId) {
            return mock(SemanticModel.class);
        }
    }
}
