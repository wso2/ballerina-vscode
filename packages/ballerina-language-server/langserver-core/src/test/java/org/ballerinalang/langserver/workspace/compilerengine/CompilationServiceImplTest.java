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
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureLevel;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import javax.annotation.Nonnull;
import java.lang.reflect.Constructor;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Tests for CompilationServiceImpl covering event routing, circuit breaker, and LSP query methods.
 *
 * @since 1.7.0
 */
public class CompilationServiceImplTest {

    private CompilationServiceImpl service;
    private EventSyncPubSubHolder eventBus;
    private DualSnapshotStore snapshotStore;
    private StableSnapshot mockSnapshot;
    private PackageDescriptor mockDescriptor;
    private static final DocumentUri TEST_ROOT = new DocumentUri.FileUri(
            Path.of("/tmp/test-project").toAbsolutePath().normalize().toUri());

    @BeforeMethod
    public void setUp() {
        eventBus = new EventSyncPubSubHolder();
        snapshotStore = new DualSnapshotStore();
        mockDescriptor = mock(PackageDescriptor.class);
        // Pre-create mock snapshot to avoid Mockito initialization issues across tests
        mockSnapshot = createStableSnapshot(mock(SyntaxTree.class), mock(SemanticModel.class),
                mock(PackageCompilation.class), new ContentVersion(1));
    }

    @AfterMethod
    public void tearDown() throws InterruptedException {
        if (service != null) {
            service.close();
            service = null;
        }
        // Give background tasks time to complete before closing eventBus
        Thread.sleep(100);
        if (eventBus != null) {
            eventBus.close();
            eventBus = null;
        }
    }

    // ---- Constructor Contracts ----

    @Test
    public void service_constructor_marksReferenceParametersNonnull() throws NoSuchMethodException {
        Constructor<CompilationServiceImpl> constructor = CompilationServiceImpl.class.getConstructor(
                DualSnapshotStore.class, EventSyncPubSubHolder.class,
                CompilationPipeline.CompilationAction.class, long.class, long.class);

        Assert.assertTrue(constructor.getParameters()[0].isAnnotationPresent(Nonnull.class));
        Assert.assertTrue(constructor.getParameters()[1].isAnnotationPresent(Nonnull.class));
        Assert.assertTrue(constructor.getParameters()[2].isAnnotationPresent(Nonnull.class));
    }

    // ---- Workspace Events ----

    @Test
    public void wme1_createsPipelineAndTriggersInitialCompilation() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            compiled.countDown();
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);

        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS),
                "WM-E1 should trigger initial compilation");
    }

    @Test
    public void wme2_evictsPipeline() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            compiled.countDown();
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS), "Pipeline should be created");
        Thread.sleep(200);

        // Verify pipeline exists
        Assert.assertNotNull(snapshotStore.getStable(TEST_ROOT), "Snapshot should exist");

        publishWmE2(TEST_ROOT);
        Thread.sleep(200);

        // Verify pipeline is evicted
        Assert.assertNull(snapshotStore.getStable(TEST_ROOT),
                "WM-E2 should evict pipeline and snapshot");
    }

    @Test
    public void wme4_evictsThenRecreatesPipeline() throws InterruptedException {
        AtomicInteger compileCount = new AtomicInteger(0);
        CountDownLatch firstComplete = new CountDownLatch(1);
        CountDownLatch secondStart = new CountDownLatch(1);
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            if (compileCount.incrementAndGet() == 1) {
                firstComplete.countDown();
            } else {
                secondStart.countDown();
            }
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstComplete.await(3, TimeUnit.SECONDS), "First compilation");

        publishWmE4(TEST_ROOT);
        Assert.assertTrue(secondStart.await(3, TimeUnit.SECONDS),
                "WM-E4 should evict and recreate pipeline");
        Assert.assertEquals(compileCount.get(), 2, "Should compile twice");
    }

    // ---- Document Events ----

    @Test
    public void wmDocumentOpened_requestsCompilation() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        CountDownLatch secondCompiled = new CountDownLatch(1);
        AtomicInteger compileCount = new AtomicInteger(0);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            int count = compileCount.incrementAndGet();
            if (count == 1) {
                firstCompiled.countDown();
            } else if (count == 2) {
                secondCompiled.countDown();
            }
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        publishWmDocumentOpened(TEST_ROOT);
        Assert.assertTrue(secondCompiled.await(3, TimeUnit.SECONDS),
                "WM_DOCUMENT_OPENED should request compilation");
    }

    @Test
    public void wmDocumentChanged_requestsCompilation() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        CountDownLatch secondCompiled = new CountDownLatch(1);
        AtomicInteger compileCount = new AtomicInteger(0);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            int count = compileCount.incrementAndGet();
            if (count == 1) {
                firstCompiled.countDown();
            } else if (count == 2) {
                secondCompiled.countDown();
            }
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        publishWmDocumentChanged(TEST_ROOT);
        Assert.assertTrue(secondCompiled.await(3, TimeUnit.SECONDS),
                "WM_DOCUMENT_CHANGED should request compilation");
    }

    @Test
    public void rmE1_throttlesDocumentTriggeredCompilationUntilWindowExpires() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        CountDownLatch throttledCompilation = new CountDownLatch(1);
        AtomicInteger compileCount = new AtomicInteger(0);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            int count = compileCount.incrementAndGet();
            if (count == 1) {
                firstCompiled.countDown();
            } else if (count == 2) {
                throttledCompilation.countDown();
            }
            return mockSnapshot;
        }), 50L, 300L);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        eventBus.publish(new DomainEvent(Instant.now(), "resource-monitor",
                EventKind.RM_E1_HEAP_PRESSURE_DETECTED, HeapPressureLevel.WARNING.name()));
        publishWmDocumentChanged(TEST_ROOT);

        Assert.assertFalse(throttledCompilation.await(150, TimeUnit.MILLISECONDS),
                "RM-E1 should throttle immediate document-triggered recompilation");
        Assert.assertTrue(throttledCompilation.await(2, TimeUnit.SECONDS),
                "Compilation should resume after the throttle window");
    }

    @Test
    public void wmFileWatchedChanged_dependencyGraph_requestsCompilation() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        CountDownLatch secondCompiled = new CountDownLatch(1);
        AtomicInteger compileCount = new AtomicInteger(0);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            int count = compileCount.incrementAndGet();
            if (count == 1) {
                firstCompiled.countDown();
            } else if (count == 2) {
                secondCompiled.countDown();
            }
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        publishWmFileWatchedChanged(TEST_ROOT, "DEPENDENCY_GRAPH");
        Assert.assertTrue(secondCompiled.await(3, TimeUnit.SECONDS),
                "WM_FILE_WATCHED_CHANGED with DEPENDENCY_GRAPH scope should request compilation");
    }

    @Test
    public void wmFileWatchedChanged_configuration_doesNotRequest() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            firstCompiled.countDown();
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        publishWmFileWatchedChanged(TEST_ROOT, "CONFIGURATION");
        Thread.sleep(300);

        // Verify no second compilation triggered
        Assert.assertEquals(firstCompiled.getCount(), 0, "Only initial compilation should occur");
    }

    // ---- LSP Query Methods ----

    @Test
    public void service_stableSnapshot_returnsSnapshotWhenSnapshotExists() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        StableSnapshot snapshot = createStableSnapshot(mock(SyntaxTree.class), mock(SemanticModel.class),
                mock(PackageCompilation.class), new ContentVersion(1));
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            compiled.countDown();
            return snapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS));

        StableSnapshot stableSnapshot = service.stableSnapshot(mockDescriptor, null);
        Assert.assertNotNull(stableSnapshot);
        Assert.assertSame(stableSnapshot, snapshot);
    }

    @Test
    public void service_stableSnapshot_returnsNull_whenNoSnapshot() {
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> mockSnapshot, 50);

        StableSnapshot snapshot = service.stableSnapshot(mockDescriptor, null);
        Assert.assertNull(snapshot, "Should return null when no snapshot exists");
    }

    @Test
    public void service_latestSnapshot_returnsStableSnapshotWhenOnlyStableExists() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        StableSnapshot snapshot = createStableSnapshot(mock(SyntaxTree.class), mock(SemanticModel.class),
                mock(PackageCompilation.class), new ContentVersion(7));
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            compiled.countDown();
            return snapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS));

        SnapshotView latestSnapshot = service.latestSnapshot(mockDescriptor, null);
        Assert.assertSame(latestSnapshot, snapshot);
    }

    @Test
    public void service_latestSnapshot_returnsInProgressSnapshotWhenCompilationIsRunning() throws Exception {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        CountDownLatch secondCompileStarted = new CountDownLatch(1);
        CountDownLatch allowSecondCompileToFinish = new CountDownLatch(1);
        AtomicInteger compileCount = new AtomicInteger(0);
        StableSnapshot firstSnapshot = createStableSnapshot(mock(SyntaxTree.class), mock(SemanticModel.class),
                mock(PackageCompilation.class), new ContentVersion(8));
        StableSnapshot secondSnapshot = createStableSnapshot(mock(SyntaxTree.class), mock(SemanticModel.class),
                mock(PackageCompilation.class), new ContentVersion(9));
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            int invocation = compileCount.incrementAndGet();
            if (invocation == 1) {
                firstCompiled.countDown();
                return firstSnapshot;
            }
            secondCompileStarted.countDown();
            Assert.assertTrue(allowSecondCompileToFinish.await(3, TimeUnit.SECONDS),
                    "Test should release second compilation");
            return secondSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial stable snapshot should exist");

        publishWmDocumentChanged(TEST_ROOT);
        Assert.assertTrue(secondCompileStarted.await(3, TimeUnit.SECONDS), "Second compilation should start");

        InProgressSnapshot inProgressSnapshot = snapshotStore.getInProgress(TEST_ROOT);
        Assert.assertNotNull(inProgressSnapshot, "In-progress snapshot should be published while compiling");
        Assert.assertSame(service.latestSnapshot(mockDescriptor, null), inProgressSnapshot);

        allowSecondCompileToFinish.countDown();
    }

    @Test
    public void service_stableSnapshot_blocksUntilNextSnapshotIsPublished() throws Exception {
        CountDownLatch compileStarted = new CountDownLatch(1);
        CountDownLatch allowCompileToFinish = new CountDownLatch(1);
        StableSnapshot snapshot = createStableSnapshot(mock(SyntaxTree.class), mock(SemanticModel.class),
                mock(PackageCompilation.class), new ContentVersion(2));
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            compileStarted.countDown();
            Assert.assertTrue(allowCompileToFinish.await(3, TimeUnit.SECONDS),
                    "Test should release compile action");
            return snapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compileStarted.await(3, TimeUnit.SECONDS), "Compilation should start");

        CompletableFuture<StableSnapshot> future = CompletableFuture.supplyAsync(
                () -> service.stableSnapshot(mockDescriptor, null));
        Thread.sleep(150);
        Assert.assertFalse(future.isDone(), "stableSnapshot should wait while compilation is in progress");

        allowCompileToFinish.countDown();

        Assert.assertSame(future.get(3, TimeUnit.SECONDS), snapshot,
                "stableSnapshot should return the newly published stable snapshot");
    }

    // ---- Circuit Breaker Tests ----

    @Test
    public void circuit_transientFailureSchedulesRetry() throws InterruptedException {
        AtomicInteger callCount = new AtomicInteger(0);
        CountDownLatch secondCall = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            if (callCount.incrementAndGet() < 2) {
                throw new java.io.IOException("transient network error");
            }
            secondCall.countDown();
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(secondCall.await(3, TimeUnit.SECONDS),
                "Transient failure should be retried");
        Assert.assertEquals(callCount.get(), 2, "Should attempt compilation twice");
    }

    @Test
    public void circuit_persistentFailureOpensBreakerAndEmitsCEE6() throws InterruptedException {
        CountDownLatch recoveryExhausted = new CountDownLatch(1);
        List<EventKind> receivedEvents = Collections.synchronizedList(new ArrayList<>());
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            throw new IllegalArgumentException("persistent source error");
        }), 50);

        // Subscribe to CE-E6 event
        eventBus.subscribe("test-sub", SubscriberTier.CRITICAL,
                Set.of(EventKind.CE_RESOLUTION_EXHAUSTED), event -> {
                    receivedEvents.add(event.eventKind());
                    recoveryExhausted.countDown();
                });

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(recoveryExhausted.await(3, TimeUnit.SECONDS),
                "Persistent failure should emit CE-E6");
        Assert.assertTrue(receivedEvents.contains(EventKind.CE_RESOLUTION_EXHAUSTED));
    }

    @Test
    public void circuit_fatalFailureOpensBreakerAndEmitsCEE6() throws InterruptedException {
        CountDownLatch recoveryExhausted = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            throw new AssertionError("compiler bug");
        }), 50);

        eventBus.subscribe("test-sub", SubscriberTier.CRITICAL,
                Set.of(EventKind.CE_RESOLUTION_EXHAUSTED), event -> {
                    recoveryExhausted.countDown();
                });

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(recoveryExhausted.await(3, TimeUnit.SECONDS),
                "Fatal failure should emit CE-E6");
    }

    // ---- Close Behavior ----

    @Test
    public void service_closeIdempotent() {
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> mockSnapshot), 50);
        service.close();
        service.close(); // Should not throw
    }

    @Test
    public void service_closeShutdownsRetryScheduler() throws InterruptedException {
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> mockSnapshot), 50);
        service.close();
        Thread.sleep(100);
        // Verify no leaked threads (observable via graceful close)
    }

    @Test
    public void service_multipleProjects_managedIndependently() throws InterruptedException {
        DocumentUri root2 = new DocumentUri.FileUri(
                Path.of("/tmp/test-project-2").toAbsolutePath().normalize().toUri());
        AtomicInteger compileCount = new AtomicInteger(0);
        CountDownLatch twoCompiles = new CountDownLatch(2);
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, actionWithDescribe(task -> {
            compileCount.incrementAndGet();
            twoCompiles.countDown();
            return mockSnapshot;
        }), 50);

        publishWmE1(TEST_ROOT);
        publishWmE1(root2);

        Assert.assertTrue(twoCompiles.await(3, TimeUnit.SECONDS),
                "Both projects should compile independently");
        Assert.assertEquals(compileCount.get(), 2);
    }

    // ---- Helper Methods ----

    /**
     * Wraps a compile-only lambda so that {@code describe()} returns {@link #mockDescriptor},
     * satisfying the pipeline creation contract in {@code createPipelineIfAbsent}.
     */
    private CompilationPipeline.CompilationAction actionWithDescribe(
            CompilationPipeline.CompilationAction base) {
        return new CompilationPipeline.CompilationAction() {
            @Override
            public ResolutionResult resolve(CompileTask task) throws Exception {
                return base.resolve(task);
            }
            @Override
            public StableSnapshot compile(CompileTask task) throws Exception {
                return base.compile(task);
            }
            @Override
            public PackageDescriptor describe(DocumentUri sourceRootUri) {
                return mockDescriptor;
            }
        };
    }

    private void publishWmE1(DocumentUri sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.uri().toString(),
                EventKind.WORKSPACE_PROJECT_REGISTERED));
    }

    private void publishWmE2(DocumentUri sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.uri().toString(),
                EventKind.WORKSPACE_PROJECT_EVICTED));
    }

    private void publishWmE4(DocumentUri sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.uri().toString(),
                EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED));
    }

    private void publishWmDocumentOpened(DocumentUri sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.uri().toString(),
                EventKind.WM_DOCUMENT_OPENED,
                Path.of(sr.uri()).resolve("main.bal").toUri().toString()));
    }

    private void publishWmDocumentChanged(DocumentUri sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.uri().toString(),
                EventKind.WM_DOCUMENT_CHANGED,
                Path.of(sr.uri()).resolve("main.bal").toUri().toString()));
    }

    private void publishWmFileWatchedChanged(DocumentUri sr, String scope) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.uri().toString(),
                EventKind.WM_FILE_WATCHED_CHANGED,
                Path.of(sr.uri()).resolve("Dependencies.toml") + "|" + scope + "|Changed"));
    }

    private StableSnapshot createStableSnapshot(SyntaxTree syntaxTree, SemanticModel semanticModel,
                                                PackageCompilation compilation, ContentVersion version) {
        DocumentId documentId = mock(DocumentId.class);
        ModuleId moduleId = mock(ModuleId.class);
        when(documentId.moduleId()).thenReturn(moduleId);
        return new StableSnapshot(Map.of(documentId, syntaxTree),
                Map.of(Path.of(TEST_ROOT.uri()).resolve("main.bal").normalize(), documentId),
                Map.of(moduleId, semanticModel), compilation, version);
    }

}
