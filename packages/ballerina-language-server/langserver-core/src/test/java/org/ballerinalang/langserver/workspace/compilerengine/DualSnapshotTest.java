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
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.mockito.Mockito.mock;

/**
 * Tests for dual-snapshot types: SyntaxSnapshot, StableSnapshot, InProgressSnapshot.
 *
 * @since 1.7.0
 */
public class DualSnapshotTest {

    // ---- SyntaxSnapshot sealed interface ----

    @Test
    public void syntaxSnapshot_permitsStableSnapshot() {
        // Verify that StableSnapshot implements SyntaxSnapshot
        SyntaxSnapshot snapshot = createMockStableSnapshot();
        Assert.assertNotNull(snapshot);
        Assert.assertTrue(snapshot instanceof StableSnapshot);
    }

    @Test
    public void syntaxSnapshot_isSealed() {
        // Verify SyntaxSnapshot is sealed by checking permits clause via reflection
        Class<?>[] permits = SyntaxSnapshot.class.getPermittedSubclasses();
        Assert.assertEquals(permits.length, 1, "SyntaxSnapshot should permit exactly one subclass");
        Assert.assertEquals(permits[0], StableSnapshot.class, "SyntaxSnapshot should permit StableSnapshot");
    }

    // ---- StableSnapshot ----

    @Test
    public void stableSnapshot_syntaxTreeReturnsCorrectTree() {
        ModuleId moduleId = mock(ModuleId.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        Map<ModuleId, SyntaxTree> syntaxTrees = Map.of(moduleId, syntaxTree);

        StableSnapshot snapshot = new StableSnapshot(
                mock(PackageCompilation.class),
                mock(SemanticModel.class),
                syntaxTrees,
                new ContentVersion(1)
        );

        Assert.assertSame(snapshot.syntaxTree(moduleId), syntaxTree);
    }

    @Test
    public void stableSnapshot_syntaxTreeReturnsNullForUnknownModule() {
        ModuleId knownModule = mock(ModuleId.class);
        ModuleId unknownModule = mock(ModuleId.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        Map<ModuleId, SyntaxTree> syntaxTrees = Map.of(knownModule, syntaxTree);

        StableSnapshot snapshot = new StableSnapshot(
                mock(PackageCompilation.class),
                mock(SemanticModel.class),
                syntaxTrees,
                new ContentVersion(1)
        );

        Assert.assertNull(snapshot.syntaxTree(unknownModule));
    }

    @Test
    public void stableSnapshot_semanticModelReturnsCorrectModel() {
        SemanticModel semanticModel = mock(SemanticModel.class);

        StableSnapshot snapshot = new StableSnapshot(
                mock(PackageCompilation.class),
                semanticModel,
                Map.of(),
                new ContentVersion(1)
        );

        Assert.assertSame(snapshot.semanticModel(), semanticModel);
    }

    @Test
    public void stableSnapshot_isImmutableRecord() {
        // Records are immutable by design; verify fields are accessible but not modifiable
        ModuleId moduleId = mock(ModuleId.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        SemanticModel semanticModel = mock(SemanticModel.class);
        PackageCompilation compilation = mock(PackageCompilation.class);
        ContentVersion version = new ContentVersion(1);
        Map<ModuleId, SyntaxTree> syntaxTrees = Map.of(moduleId, syntaxTree);

        StableSnapshot snapshot = new StableSnapshot(
                compilation,
                semanticModel,
                syntaxTrees,
                version
        );

        // Verify record accessors
        Assert.assertSame(snapshot.semanticModel(), semanticModel);
        Assert.assertSame(snapshot.syntaxTree(moduleId), syntaxTree);
        Assert.assertEquals(snapshot.contentVersion(), version);
    }

    @Test
    public void stableSnapshot_rejectsNullSemanticModel() {
        Assert.assertThrows(NullPointerException.class, () ->
                new StableSnapshot(
                        mock(PackageCompilation.class),
                        null,
                        Map.of(),
                        new ContentVersion(1)
                )
        );
    }

    @Test
    public void stableSnapshot_rejectsNullSyntaxTrees() {
        Assert.assertThrows(NullPointerException.class, () ->
                new StableSnapshot(
                        mock(PackageCompilation.class),
                        mock(SemanticModel.class),
                        null,
                        new ContentVersion(1)
                )
        );
    }

    @Test
    public void stableSnapshot_rejectsNullContentVersion() {
        Assert.assertThrows(NullPointerException.class, () ->
                new StableSnapshot(
                        mock(PackageCompilation.class),
                        mock(SemanticModel.class),
                        Map.of(),
                        null
                )
        );
    }

    @Test
    public void stableSnapshot_equalityByValue() {
        PackageCompilation compilation = mock(PackageCompilation.class);
        SemanticModel semanticModel = mock(SemanticModel.class);
        ContentVersion version = new ContentVersion(1);
        Map<ModuleId, SyntaxTree> syntaxTrees = Map.of();

        StableSnapshot s1 = new StableSnapshot(
                compilation,
                semanticModel,
                syntaxTrees,
                version
        );
        StableSnapshot s2 = new StableSnapshot(
                compilation,
                semanticModel,
                syntaxTrees,
                version
        );

        Assert.assertEquals(s1, s2);
        Assert.assertEquals(s1.hashCode(), s2.hashCode());
    }

    @Test
    public void stableSnapshot_threadSafeAccess() throws InterruptedException {
        StableSnapshot snapshot = createMockStableSnapshot();
        int threadCount = 8;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    // Access snapshot from multiple threads
                    Assert.assertNotNull(snapshot.semanticModel());
                    Assert.assertNotNull(snapshot.contentVersion());
                } finally {
                    latch.countDown();
                }
            });
        }

        Assert.assertTrue(latch.await(5, TimeUnit.SECONDS), "Concurrent access timed out");
        executor.shutdown();
    }

    // ---- InProgressSnapshot ----

    @Test
    public void inProgressSnapshot_awaitReturnsStableSnapshotOnSuccess() throws Exception {
        StableSnapshot expected = createMockStableSnapshot();
        CompletableFuture<StableSnapshot> future = CompletableFuture.completedFuture(expected);

        InProgressSnapshot snapshot = new InProgressSnapshot(future);

        StableSnapshot result = snapshot.await(Duration.ofSeconds(1));
        Assert.assertSame(result, expected);
    }

    @Test(expectedExceptions = TimeoutException.class)
    public void inProgressSnapshot_awaitThrowsTimeoutExceptionOnTimeout() throws Exception {
        CompletableFuture<StableSnapshot> future = new CompletableFuture<>();
        InProgressSnapshot snapshot = new InProgressSnapshot(future);

        // This should timeout since future is never completed
        snapshot.await(Duration.ofMillis(50));
    }

    @Test
    public void inProgressSnapshot_cancelCancelsUnderlyingFuture() {
        CompletableFuture<StableSnapshot> future = new CompletableFuture<>();
        InProgressSnapshot snapshot = new InProgressSnapshot(future);

        Assert.assertFalse(future.isCancelled());

        snapshot.cancel();

        Assert.assertTrue(future.isCancelled());
    }

    @Test
    public void inProgressSnapshot_awaitAfterCancelThrowsException() {
        CompletableFuture<StableSnapshot> future = new CompletableFuture<>();
        InProgressSnapshot snapshot = new InProgressSnapshot(future);

        snapshot.cancel();

        // Attempting to await a cancelled future should throw
        Assert.assertThrows(Exception.class, () -> snapshot.await(Duration.ofSeconds(1)));
    }

    @Test
    public void inProgressSnapshot_rejectsNullFuture() {
        Assert.assertThrows(NullPointerException.class, () -> new InProgressSnapshot(null));
    }

    @Test
    public void inProgressSnapshot_awaitPropagatesException() {
        CompletableFuture<StableSnapshot> future = new CompletableFuture<>();
        future.completeExceptionally(new RuntimeException("Compilation failed"));
        InProgressSnapshot snapshot = new InProgressSnapshot(future);

        Assert.assertThrows(java.util.concurrent.ExecutionException.class, 
                () -> snapshot.await(Duration.ofSeconds(1)));
    }

    @Test
    public void inProgressSnapshot_concurrentAwaitAndCancel() throws Exception {
        CompletableFuture<StableSnapshot> future = new CompletableFuture<>();
        InProgressSnapshot snapshot = new InProgressSnapshot(future);
        int threadCount = 4;
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final int threadId = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    if (threadId == 0) {
                        snapshot.cancel();
                    } else {
                        try {
                            snapshot.await(Duration.ofMillis(100));
                        } catch (TimeoutException | RuntimeException | java.util.concurrent.ExecutionException e) {
                            // Expected: either timeout or cancellation
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown(); // Start all threads
        Assert.assertTrue(doneLatch.await(2, TimeUnit.SECONDS), "Concurrent operations timed out");
        executor.shutdown();
    }

    // ---- Helpers ----

    private StableSnapshot createMockStableSnapshot() {
        return new StableSnapshot(
                mock(PackageCompilation.class),
                mock(SemanticModel.class),
                Map.of(),
                new ContentVersion(1)
        );
    }
}
