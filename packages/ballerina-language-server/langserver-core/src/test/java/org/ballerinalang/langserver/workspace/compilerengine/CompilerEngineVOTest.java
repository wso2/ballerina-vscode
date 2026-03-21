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
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.PackageDescriptor;
import org.ballerinalang.langserver.workspace.compilerengine.ResolutionResult.ResolutionDiagnostic;
import org.ballerinalang.langserver.workspace.compilerengine.ResolutionResult.Severity;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;
import org.testng.Assert;
import org.testng.annotations.Test;

import javax.annotation.Nonnull;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
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
import static org.mockito.Mockito.when;

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

    // ---- StableSnapshot ----

    @Test
    public void stableSnapshot_isFinalAndRetainsMappedValues() {
        PackageCompilation compilation = mock(PackageCompilation.class);
        SemanticModel semanticModel = mock(SemanticModel.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        ContentVersion version = new ContentVersion(1);
        Path filePath = Path.of("/tmp/project/main.bal").toAbsolutePath().normalize();
        DocumentId documentId = mock(DocumentId.class);
        ModuleId moduleId = mock(ModuleId.class);
        when(documentId.moduleId()).thenReturn(moduleId);

        StableSnapshot snapshot = new StableSnapshot(Map.of(documentId, syntaxTree),
                Map.of(filePath, documentId), Map.of(moduleId, semanticModel), compilation, version);

        Assert.assertFalse(StableSnapshot.class.isInterface());
        Assert.assertTrue(Modifier.isFinal(StableSnapshot.class.getModifiers()));
        Assert.assertSame(snapshot.syntaxTree(documentId), syntaxTree);
        Assert.assertSame(snapshot.syntaxTree(filePath), syntaxTree);
        Assert.assertSame(snapshot.semanticModel(moduleId), semanticModel);
        Assert.assertSame(snapshot.semanticModel(filePath), semanticModel);
        Assert.assertSame(snapshot.compilation(), compilation);
        Assert.assertEquals(snapshot.contentVersion(), version);
    }

    @Test
    public void stableSnapshot_constructor_marksRequiredParametersNonnull() throws NoSuchMethodException {
        Constructor<StableSnapshot> constructor = StableSnapshot.class.getConstructor(Map.class, Map.class, Map.class,
                PackageCompilation.class, ContentVersion.class);

        Assert.assertTrue(constructor.getParameters()[0].isAnnotationPresent(Nonnull.class));
        Assert.assertTrue(constructor.getParameters()[1].isAnnotationPresent(Nonnull.class));
        Assert.assertTrue(constructor.getParameters()[2].isAnnotationPresent(Nonnull.class));
        Assert.assertTrue(constructor.getParameters()[3].isAnnotationPresent(Nonnull.class));
        Assert.assertTrue(constructor.getParameters()[4].isAnnotationPresent(Nonnull.class));
    }

    // ---- DualSnapshotStore ----

    @Test
    public void dualSnapshotStore_startCompilationMakesInProgressAccessible() {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor descriptor = mock(PackageDescriptor.class);

        InProgressSnapshot inProgressSnapshot = store.startCompilation(descriptor);

        Assert.assertSame(store.getInProgress(descriptor), inProgressSnapshot);
        Assert.assertNull(store.getStable(descriptor));
        Assert.assertFalse(inProgressSnapshot.compilation(NO_OP_CANCEL_CHECKER).isDone());
    }

    @Test
    public void dualSnapshotStore_publishStableStoresSnapshotAndCompletesInProgressFuture() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        InProgressSnapshot inProgressSnapshot = store.startCompilation(descriptor);
        StableSnapshot stableSnapshot = createStableSnapshot(new ContentVersion(4));

        store.publishStable(descriptor, stableSnapshot);

        Assert.assertSame(store.getStable(descriptor), stableSnapshot);
        Assert.assertNull(store.getInProgress(descriptor));
        Assert.assertSame(inProgressSnapshot.compilation(NO_OP_CANCEL_CHECKER).get(1, TimeUnit.SECONDS),
                stableSnapshot.compilation());
    }

    @Test(expectedExceptions = CancellationException.class)
    public void dualSnapshotStore_cancelInProgressCancelsCompilationFuture() {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        InProgressSnapshot inProgressSnapshot = store.startCompilation(descriptor);

        store.cancelInProgress(descriptor);

        Assert.assertNull(store.getInProgress(descriptor));
        inProgressSnapshot.compilation(NO_OP_CANCEL_CHECKER).join();
    }

    @Test
    public void dualSnapshotStore_getStableReturnsSameReferenceAcrossConcurrentReaders() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        StableSnapshot stableSnapshot = createStableSnapshot(new ContentVersion(9));
        store.publishStable(descriptor, stableSnapshot);

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
                        observed.add(store.getStable(descriptor));
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
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        InProgressSnapshot inProgressSnapshot = store.startCompilation(descriptor);
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

        store.publishStable(descriptor, stableSnapshot);

        Assert.assertSame(observedCompilation.get(2, TimeUnit.SECONDS), stableSnapshot.compilation());
        waiter.join(2000);
        Assert.assertFalse(waiter.isAlive(), "Waiter should finish after publish");
    }

    @Test
    public void dualSnapshotStore_tracksMultipleSourceRootsIndependently() throws Exception {
        DualSnapshotStore store = new DualSnapshotStore();
        PackageDescriptor firstDescriptor = mock(PackageDescriptor.class);
        PackageDescriptor secondDescriptor = mock(PackageDescriptor.class);
        InProgressSnapshot firstInProgress = store.startCompilation(firstDescriptor);
        InProgressSnapshot secondInProgress = store.startCompilation(secondDescriptor);
        StableSnapshot firstStable = createStableSnapshot(new ContentVersion(1));
        StableSnapshot secondStable = createStableSnapshot(new ContentVersion(2));

        store.publishStable(firstDescriptor, firstStable);
        store.publishStable(secondDescriptor, secondStable);

        Assert.assertSame(store.getStable(firstDescriptor), firstStable);
        Assert.assertSame(store.getStable(secondDescriptor), secondStable);
        Assert.assertSame(firstInProgress.compilation(NO_OP_CANCEL_CHECKER).get(1, TimeUnit.SECONDS),
                firstStable.compilation());
        Assert.assertSame(secondInProgress.compilation(NO_OP_CANCEL_CHECKER).get(1, TimeUnit.SECONDS),
                secondStable.compilation());
    }

    // ---- ResolutionResult ----

    @Test
    public void resolution_capturesDiagnosticsWithDescriptor() {
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        List<ResolutionDiagnostic> diagnostics = List.of(
                new ResolutionDiagnostic(Severity.WARNING, "Unused import", "/mod1")
        );

        ResolutionResult result = new ResolutionResult(descriptor, diagnostics, true);

        Assert.assertSame(result.descriptor(), descriptor);
        Assert.assertEquals(result.diagnostics().size(), 1);
        Assert.assertEquals(result.diagnostics().get(0).severity(), Severity.WARNING);
    }

    @Test
    public void resolution_defensiveCopyOfDiagnostics() {
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        List<ResolutionDiagnostic> original = new ArrayList<>();
        original.add(new ResolutionDiagnostic(Severity.INFO, "Info", "/mod1"));

        ResolutionResult result = new ResolutionResult(descriptor, original, true);
        original.add(new ResolutionDiagnostic(Severity.ERROR, "Error", "/mod2"));

        Assert.assertEquals(result.diagnostics().size(), 1, "Defensive copy should prevent mutation");
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void resolution_rejectsNullDescriptor() {
        new ResolutionResult(null, List.of(), true);
    }

    @Test
    public void resolution_successFlagReflectsDiagnostics() {
        PackageDescriptor descriptor = mock(PackageDescriptor.class);

        ResolutionResult successResult = new ResolutionResult(descriptor, List.of(), true);
        Assert.assertTrue(successResult.success());

        List<ResolutionDiagnostic> errors = List.of(
                new ResolutionDiagnostic(Severity.ERROR, "Unresolved module", "/mod1")
        );
        ResolutionResult failResult = new ResolutionResult(descriptor, errors, false);
        Assert.assertFalse(failResult.success());
    }

    // ---- Helper ----

    private StableSnapshot createStableSnapshot(ContentVersion contentVersion) {
        DocumentId documentId = mock(DocumentId.class);
        ModuleId moduleId = mock(ModuleId.class);
        when(documentId.moduleId()).thenReturn(moduleId);
        return new StableSnapshot(Map.of(documentId, mock(SyntaxTree.class)),
                Map.of(Path.of("/tmp/project/main.bal").toAbsolutePath().normalize(), documentId),
                Map.of(moduleId, mock(SemanticModel.class)), mock(PackageCompilation.class), contentVersion);
    }
}
