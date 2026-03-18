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

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.mockito.Mockito.mock;

/**
 * Tests for dual-snapshot types: SyntaxSnapshot, StableSnapshot, InProgressSnapshot.
 *
 * @since 1.7.0
 */
public class DualSnapshotTest {

    // ---- SyntaxSnapshot sealed interface ----

    @Test
    public void syntaxSnapshot_permitsStableAndInProgress() {
        // Verify both types implement SyntaxSnapshot
        SyntaxSnapshot stable = createMockStableSnapshot();
        SyntaxSnapshot inProgress = createMockInProgressSnapshot();
        
        Assert.assertNotNull(stable);
        Assert.assertNotNull(inProgress);
        Assert.assertTrue(stable instanceof StableSnapshot);
        Assert.assertTrue(inProgress instanceof InProgressSnapshot);
    }

    @Test
    public void syntaxSnapshot_isSealed() {
        // Verify SyntaxSnapshot is sealed by checking permits clause via reflection
        Class<?>[] permits = SyntaxSnapshot.class.getPermittedSubclasses();
        Assert.assertEquals(permits.length, 2, "SyntaxSnapshot should permit two subclasses");
        // Verify both StableSnapshot and InProgressSnapshot are permitted
        boolean hasStable = false;
        boolean hasInProgress = false;
        for (Class<?> cls : permits) {
            if (cls == StableSnapshot.class) hasStable = true;
            if (cls == InProgressSnapshot.class) hasInProgress = true;
        }
        Assert.assertTrue(hasStable, "SyntaxSnapshot should permit StableSnapshot");
        Assert.assertTrue(hasInProgress, "SyntaxSnapshot should permit InProgressSnapshot");
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
    public void stableSnapshot_compilationReturnsCorrectResult() {
        PackageCompilation compilation = mock(PackageCompilation.class);

        StableSnapshot snapshot = new StableSnapshot(
                compilation,
                mock(SemanticModel.class),
                Map.of(),
                new ContentVersion(1)
        );

        Assert.assertSame(snapshot.compilation(), compilation);
    }

    @Test
    public void stableSnapshot_isImmutableRecord() {
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
        Assert.assertSame(snapshot.compilation(), compilation);
        Assert.assertSame(snapshot.syntaxTree(moduleId), syntaxTree);
        Assert.assertEquals(snapshot.contentVersion(), version);
    }

    @Test
    public void stableSnapshot_rejectsNullCompilation() {
        Assert.assertThrows(NullPointerException.class, () ->
                new StableSnapshot(
                        null,
                        mock(SemanticModel.class),
                        Map.of(),
                        new ContentVersion(1)
                )
        );
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
    public void inProgressSnapshot_syntaxTreeReturnsCorrectTree() {
        ModuleId moduleId = mock(ModuleId.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        Map<ModuleId, SyntaxTree> syntaxTrees = Map.of(moduleId, syntaxTree);

        InProgressSnapshot snapshot = new InProgressSnapshot(
                syntaxTrees,
                new CompletableFuture<>(),
                new CompletableFuture<>(),
                new ContentVersion(1)
        );

        Assert.assertSame(snapshot.syntaxTree(moduleId), syntaxTree);
    }

    @Test
    public void inProgressSnapshot_syntaxTreeReturnsNullForUnknownModule() {
        ModuleId knownModule = mock(ModuleId.class);
        ModuleId unknownModule = mock(ModuleId.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        Map<ModuleId, SyntaxTree> syntaxTrees = Map.of(knownModule, syntaxTree);

        InProgressSnapshot snapshot = new InProgressSnapshot(
                syntaxTrees,
                new CompletableFuture<>(),
                new CompletableFuture<>(),
                new ContentVersion(1)
        );

        Assert.assertNull(snapshot.syntaxTree(unknownModule));
    }

    @Test
    public void inProgressSnapshot_syntaxTreeAvailableImmediately() {
        ModuleId moduleId = mock(ModuleId.class);
        SyntaxTree syntaxTree = mock(SyntaxTree.class);
        Map<ModuleId, SyntaxTree> syntaxTrees = Map.of(moduleId, syntaxTree);

        // Create InProgressSnapshot with incomplete futures
        InProgressSnapshot snapshot = new InProgressSnapshot(
                syntaxTrees,
                new CompletableFuture<>(),  // Not completed
                new CompletableFuture<>(),  // Not completed
                new ContentVersion(1)
        );

        // Syntax tree should be available even though futures aren't complete
        Assert.assertSame(snapshot.syntaxTree(moduleId), syntaxTree);
    }

    @Test
    public void inProgressSnapshot_semanticModelReturnsFuture() {
        CompletableFuture<SemanticModel> semanticFuture = new CompletableFuture<>();

        InProgressSnapshot snapshot = new InProgressSnapshot(
                Map.of(),
                semanticFuture,
                new CompletableFuture<>(),
                new ContentVersion(1)
        );

        Assert.assertSame(snapshot.semanticModel(), semanticFuture);
    }

    @Test
    public void inProgressSnapshot_compilationReturnsFuture() {
        CompletableFuture<PackageCompilation> compilationFuture = new CompletableFuture<>();

        InProgressSnapshot snapshot = new InProgressSnapshot(
                Map.of(),
                new CompletableFuture<>(),
                compilationFuture,
                new ContentVersion(1)
        );

        Assert.assertSame(snapshot.compilation(), compilationFuture);
    }

    @Test
    public void inProgressSnapshot_semanticModelCompletesSuccessfully() throws Exception {
        SemanticModel expectedModel = mock(SemanticModel.class);
        CompletableFuture<SemanticModel> semanticFuture = CompletableFuture.completedFuture(expectedModel);

        InProgressSnapshot snapshot = new InProgressSnapshot(
                Map.of(),
                semanticFuture,
                new CompletableFuture<>(),
                new ContentVersion(1)
        );

        SemanticModel result = snapshot.semanticModel().get(1, TimeUnit.SECONDS);
        Assert.assertSame(result, expectedModel);
    }

    @Test
    public void inProgressSnapshot_compilationCompletesSuccessfully() throws Exception {
        PackageCompilation expectedCompilation = mock(PackageCompilation.class);
        CompletableFuture<PackageCompilation> compilationFuture = CompletableFuture.completedFuture(expectedCompilation);

        InProgressSnapshot snapshot = new InProgressSnapshot(
                Map.of(),
                new CompletableFuture<>(),
                compilationFuture,
                new ContentVersion(1)
        );

        PackageCompilation result = snapshot.compilation().get(1, TimeUnit.SECONDS);
        Assert.assertSame(result, expectedCompilation);
    }

    @Test
    public void inProgressSnapshot_cancelCancelsBothFutures() {
        CompletableFuture<SemanticModel> semanticFuture = new CompletableFuture<>();
        CompletableFuture<PackageCompilation> compilationFuture = new CompletableFuture<>();

        InProgressSnapshot snapshot = new InProgressSnapshot(
                Map.of(),
                semanticFuture,
                compilationFuture,
                new ContentVersion(1)
        );

        Assert.assertFalse(semanticFuture.isCancelled());
        Assert.assertFalse(compilationFuture.isCancelled());

        snapshot.cancel();

        Assert.assertTrue(semanticFuture.isCancelled());
        Assert.assertTrue(compilationFuture.isCancelled());
    }

    @Test
    public void inProgressSnapshot_cancelReturnsTrueIfAnyFutureWasCancelled() {
        // Already completed futures cannot be cancelled
        CompletableFuture<SemanticModel> semanticFuture = CompletableFuture.completedFuture(mock(SemanticModel.class));
        CompletableFuture<PackageCompilation> compilationFuture = new CompletableFuture<>();

        InProgressSnapshot snapshot = new InProgressSnapshot(
                Map.of(),
                semanticFuture,
                compilationFuture,
                new ContentVersion(1)
        );

        boolean result = snapshot.cancel();

        Assert.assertTrue(result); // One future was cancelled
        Assert.assertFalse(semanticFuture.isCancelled()); // Already completed
        Assert.assertTrue(compilationFuture.isCancelled()); // Was cancelled
    }

    @Test
    public void inProgressSnapshot_rejectsNullSyntaxTrees() {
        Assert.assertThrows(NullPointerException.class, () ->
                new InProgressSnapshot(
                        null,
                        new CompletableFuture<>(),
                        new CompletableFuture<>(),
                        new ContentVersion(1)
                )
        );
    }

    @Test
    public void inProgressSnapshot_rejectsNullSemanticFuture() {
        Assert.assertThrows(NullPointerException.class, () ->
                new InProgressSnapshot(
                        Map.of(),
                        null,
                        new CompletableFuture<>(),
                        new ContentVersion(1)
                )
        );
    }

    @Test
    public void inProgressSnapshot_rejectsNullCompilationFuture() {
        Assert.assertThrows(NullPointerException.class, () ->
                new InProgressSnapshot(
                        Map.of(),
                        new CompletableFuture<>(),
                        null,
                        new ContentVersion(1)
                )
        );
    }

    @Test
    public void inProgressSnapshot_rejectsNullContentVersion() {
        Assert.assertThrows(NullPointerException.class, () ->
                new InProgressSnapshot(
                        Map.of(),
                        new CompletableFuture<>(),
                        new CompletableFuture<>(),
                        null
                )
        );
    }

    @Test
    public void inProgressSnapshot_contentVersionReturnsCorrectValue() {
        ContentVersion version = new ContentVersion(42);

        InProgressSnapshot snapshot = new InProgressSnapshot(
                Map.of(),
                new CompletableFuture<>(),
                new CompletableFuture<>(),
                version
        );

        Assert.assertEquals(snapshot.contentVersion(), version);
    }

    @Test
    public void inProgressSnapshot_threadSafeAccess() throws InterruptedException {
        InProgressSnapshot snapshot = createMockInProgressSnapshot();
        int threadCount = 8;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    // Access snapshot from multiple threads
                    Assert.assertNotNull(snapshot.contentVersion());
                    Assert.assertNotNull(snapshot.semanticModel());
                    Assert.assertNotNull(snapshot.compilation());
                } finally {
                    latch.countDown();
                }
            });
        }

        Assert.assertTrue(latch.await(5, TimeUnit.SECONDS), "Concurrent access timed out");
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

    private InProgressSnapshot createMockInProgressSnapshot() {
        return new InProgressSnapshot(
                Map.of(),
                new CompletableFuture<>(),
                new CompletableFuture<>(),
                new ContentVersion(1)
        );
    }
}
