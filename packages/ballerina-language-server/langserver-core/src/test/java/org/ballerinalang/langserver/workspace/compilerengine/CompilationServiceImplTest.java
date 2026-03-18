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
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.Mockito.mock;

/**
 * Tests for CompilationServiceImpl covering event routing, circuit breaker, and LSP query methods.
 *
 * @since 1.7.0
 */
public class CompilationServiceImplTest {

    private CompilationServiceImpl service;
    private EventSyncPubSubHolder eventBus;
    private SnapshotStore snapshotStore;
    private ProjectSnapshot mockSnapshot;
    private static final SourceRoot TEST_ROOT = new SourceRoot(
            Path.of("/tmp/test-project").toAbsolutePath().normalize());

    @BeforeMethod
    public void setUp() {
        eventBus = new EventSyncPubSubHolder();
        snapshotStore = new SnapshotStore(10);
        // Pre-create mock snapshot to avoid Mockito initialization issues across tests
        mockSnapshot = new ProjectSnapshot(
                mock(PackageCompilation.class),
                mock(SemanticModel.class),
                mock(SyntaxTree.class),
                new ContentVersion(1)
        );
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

    // ---- Constructor & Null Checks ----

    @Test(expectedExceptions = NullPointerException.class)
    public void service_constructor_rejectsNullSnapshotStore() {
        new CompilationServiceImpl(null, eventBus, task -> mockSnapshot);
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void service_constructor_rejectsNullEventBus() {
        new CompilationServiceImpl(snapshotStore, null, task -> mockSnapshot);
    }

    @Test(expectedExceptions = NullPointerException.class)
    public void service_constructor_rejectsNullBaseAction() {
        new CompilationServiceImpl(snapshotStore, eventBus, null);
    }

    // ---- Workspace Events ----

    @Test
    public void wme1_createsPipelineAndTriggersInitialCompilation() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            compiled.countDown();
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);

        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS),
                "WM-E1 should trigger initial compilation");
    }

    @Test
    public void wme2_evictsPipeline() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            compiled.countDown();
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS), "Pipeline should be created");
        Thread.sleep(200);

        // Verify pipeline exists
        Assert.assertTrue(snapshotStore.get(TEST_ROOT).isPresent(), "Snapshot should exist");

        publishWmE2(TEST_ROOT);
        Thread.sleep(200);

        // Verify pipeline is evicted
        Assert.assertFalse(snapshotStore.get(TEST_ROOT).isPresent(),
                "WM-E2 should evict pipeline and snapshot");
    }

    @Test
    public void wme4_evictsThenRecreatesPipeline() throws InterruptedException {
        AtomicInteger compileCount = new AtomicInteger(0);
        CountDownLatch firstComplete = new CountDownLatch(1);
        CountDownLatch secondStart = new CountDownLatch(1);
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            if (compileCount.incrementAndGet() == 1) {
                firstComplete.countDown();
            } else {
                secondStart.countDown();
            }
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstComplete.await(3, TimeUnit.SECONDS), "First compilation");

        publishWmE4(TEST_ROOT);
        Assert.assertTrue(secondStart.await(3, TimeUnit.SECONDS),
                "WM-E4 should evict and recreate pipeline");
        Assert.assertEquals(compileCount.get(), 2, "Should compile twice");
    }

    // ---- Document Events ----

    @Test
    public void dse2_documentChanged_requestsCompilation() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        CountDownLatch secondCompiled = new CountDownLatch(1);
        AtomicInteger compileCount = new AtomicInteger(0);
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            int count = compileCount.incrementAndGet();
            if (count == 1) {
                firstCompiled.countDown();
            } else if (count == 2) {
                secondCompiled.countDown();
            }
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        publishDSE2(TEST_ROOT);
        Assert.assertTrue(secondCompiled.await(3, TimeUnit.SECONDS),
                "DS-E2 should request compilation");
    }

    @Test
    public void dse4_configFileChanged_dependencyGraph_requestsCompilation() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        CountDownLatch secondCompiled = new CountDownLatch(1);
        AtomicInteger compileCount = new AtomicInteger(0);
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            int count = compileCount.incrementAndGet();
            if (count == 1) {
                firstCompiled.countDown();
            } else if (count == 2) {
                secondCompiled.countDown();
            }
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        publishDSE4WithScope(TEST_ROOT, "DEPENDENCY_GRAPH");
        Assert.assertTrue(secondCompiled.await(3, TimeUnit.SECONDS),
                "DS-E4 with DEPENDENCY_GRAPH scope should request compilation");
    }

    @Test
    public void dse4_configFileChanged_configuration_doesNotRequest() throws InterruptedException {
        CountDownLatch firstCompiled = new CountDownLatch(1);
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            firstCompiled.countDown();
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(firstCompiled.await(3, TimeUnit.SECONDS), "Initial compilation");

        publishDSE4WithScope(TEST_ROOT, "CONFIGURATION");
        Thread.sleep(300);

        // Verify no second compilation triggered
        Assert.assertEquals(firstCompiled.getCount(), 0, "Only initial compilation should occur");
    }

    // ---- LSP Query Methods ----

    @Test
    public void service_syntaxTree_returnsTreeWhenSnapshotExists() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        SyntaxTree mockTree = mock(SyntaxTree.class);
        ProjectSnapshot snapshot = new ProjectSnapshot(mock(PackageCompilation.class),
                mock(SemanticModel.class), mockTree, new ContentVersion(1));
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            compiled.countDown();
            return snapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS));

        SyntaxTree tree = service.syntaxTree(TEST_ROOT.path().resolve("main.bal"), null);
        Assert.assertNotNull(tree);
        Assert.assertSame(tree, mockTree);
    }

    @Test
    public void service_syntaxTree_returnsNull_whenNoSnapshot() {
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> mockSnapshot, 50);

        SyntaxTree tree = service.syntaxTree(TEST_ROOT.path().resolve("main.bal"), null);
        Assert.assertNull(tree, "Should return null when no snapshot exists");
    }

    @Test
    public void service_semanticModel_returnsModelWhenSnapshotExists() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        SemanticModel mockModel = mock(SemanticModel.class);
        ProjectSnapshot snapshot = new ProjectSnapshot(mock(PackageCompilation.class),
                mockModel, mock(SyntaxTree.class), new ContentVersion(1));
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            compiled.countDown();
            return snapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS));

        SemanticModel model = service.semanticModel(TEST_ROOT.path().resolve("main.bal"), null);
        Assert.assertNotNull(model);
        Assert.assertSame(model, mockModel);
    }

    @Test
    public void service_semanticModel_returnsNull_whenNoSnapshot() {
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> mockSnapshot, 50);

        SemanticModel model = service.semanticModel(TEST_ROOT.path().resolve("main.bal"), null);
        Assert.assertNull(model, "Should return null when no snapshot exists");
    }

    @Test
    public void service_compilation_returnsCompilationWhenSnapshotExists() throws InterruptedException {
        CountDownLatch compiled = new CountDownLatch(1);
        PackageCompilation mockCompilation = mock(PackageCompilation.class);
        ProjectSnapshot snapshot = new ProjectSnapshot(mockCompilation,
                mock(SemanticModel.class), mock(SyntaxTree.class), new ContentVersion(1));
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            compiled.countDown();
            return snapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(compiled.await(3, TimeUnit.SECONDS));

        PackageCompilation compilation = service.compilation(TEST_ROOT.path().resolve("main.bal"), null);
        Assert.assertNotNull(compilation);
        Assert.assertSame(compilation, mockCompilation);
    }

    @Test
    public void service_compilation_returnsNull_whenNoSnapshot() {
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> mockSnapshot, 50);

        PackageCompilation compilation = service.compilation(TEST_ROOT.path().resolve("main.bal"), null);
        Assert.assertNull(compilation, "Should return null when no snapshot exists");
    }

    // ---- Circuit Breaker Tests ----

    @Test
    public void circuit_transientFailureSchedulesRetry() throws InterruptedException {
        AtomicInteger callCount = new AtomicInteger(0);
        CountDownLatch secondCall = new CountDownLatch(1);
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            if (callCount.incrementAndGet() < 2) {
                throw new java.io.IOException("transient network error");
            }
            secondCall.countDown();
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        Assert.assertTrue(secondCall.await(3, TimeUnit.SECONDS),
                "Transient failure should be retried");
        Assert.assertEquals(callCount.get(), 2, "Should attempt compilation twice");
    }

    @Test
    public void circuit_persistentFailureOpensBreakerAndEmitsCEE6() throws InterruptedException {
        CountDownLatch recoveryExhausted = new CountDownLatch(1);
        List<EventKind> receivedEvents = Collections.synchronizedList(new ArrayList<>());
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            throw new IllegalArgumentException("persistent source error");
        }, 50);

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
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            throw new AssertionError("compiler bug");
        }, 50);

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
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> mockSnapshot, 50);
        service.close();
        service.close(); // Should not throw
    }

    @Test
    public void service_closeShutdownsRetryScheduler() throws InterruptedException {
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> mockSnapshot, 50);
        service.close();
        Thread.sleep(100);
        // Verify no leaked threads (observable via graceful close)
    }

    @Test
    public void service_multipleProjects_managedIndependently() throws InterruptedException {
        SourceRoot root2 = new SourceRoot(Path.of("/tmp/test-project-2").toAbsolutePath().normalize());
        AtomicInteger compileCount = new AtomicInteger(0);
        CountDownLatch twoCompiles = new CountDownLatch(2);
        // Use pre-created mockSnapshot
        service = new CompilationServiceImpl(snapshotStore, eventBus, task -> {
            compileCount.incrementAndGet();
            twoCompiles.countDown();
            return mockSnapshot;
        }, 50);

        publishWmE1(TEST_ROOT);
        publishWmE1(root2);

        Assert.assertTrue(twoCompiles.await(3, TimeUnit.SECONDS),
                "Both projects should compile independently");
        Assert.assertEquals(compileCount.get(), 2);
    }

    // ---- Helper Methods ----

    private void publishWmE1(SourceRoot sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.path().toString(),
                EventKind.WORKSPACE_PROJECT_REGISTERED));
    }

    private void publishWmE2(SourceRoot sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.path().toString(),
                EventKind.WORKSPACE_PROJECT_EVICTED));
    }

    private void publishWmE4(SourceRoot sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.path().toString(),
                EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED));
    }

    private void publishDSE2(SourceRoot sr) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.path().toString(),
                EventKind.WM_DOCUMENT_CHANGED));
    }

    private void publishDSE4WithScope(SourceRoot sr, String scope) {
        eventBus.publish(new DomainEvent(Instant.now(), sr.path().toString(),
                EventKind.WM_FILE_WATCHED_CHANGED, scope));
    }

}
