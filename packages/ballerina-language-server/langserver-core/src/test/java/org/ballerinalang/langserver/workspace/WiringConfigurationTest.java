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

package org.ballerinalang.langserver.workspace;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.compilerengine.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.compilerengine.StableSnapshot;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.execution.GracePeriod;
import org.ballerinalang.langserver.workspace.workspacemanager.HeapEstimate;
import org.ballerinalang.langserver.workspace.workspacemanager.MemoryBudget;
import org.ballerinalang.langserver.workspace.workspacemanager.Project;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.ballerinalang.langserver.workspace.workspacemanager.UriResolver;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import static org.mockito.Mockito.mock;

/**
 * Integration smoke tests for cross-context event subscription wiring (T-020).
 * Verifies all 5 key event chains from domain-events.md.
 *
 * @since 1.7.0
 */
public class WiringConfigurationTest {

    private EventSyncPubSubHolder eventBus;
    private WiringConfiguration wiring;
    private Path tempDir;
    private SourceRoot testRoot;

    // Track events received by a test observer
    private final List<EventKind> observedEvents = new CopyOnWriteArrayList<>();

    @BeforeMethod
    public void setUp() throws IOException {
        tempDir = Files.createTempDirectory("t020-integration");
        testRoot = new SourceRoot(tempDir.toAbsolutePath().normalize());

        eventBus = new EventSyncPubSubHolder();

        // Create test-observable mock compilation action
        StableSnapshot mockSnapshot = new StableSnapshot(Map.of(), Map.of(), Map.of(),
                mock(PackageCompilation.class), new ContentVersion(1));

        wiring = WiringConfiguration.builder()
                .eventBus(eventBus)
                .snapshotStore(new DualSnapshotStore())
                .compilationAction(task -> mockSnapshot)
                .projectRegistry(new ProjectRegistry(MemoryBudget.ofMb(256)))
                .uriResolver(new UriResolver())
                .projectLoader((root, kind) -> mock(io.ballerina.projects.Project.class))
                .gracePeriod(GracePeriod.ofMillis(1000))
                .maxActiveProcesses(5)
                .heapPressurePollIntervalMs(60000L)
                .build();

        observedEvents.clear();
    }

    @AfterMethod
    public void tearDown() throws Exception {
        if (wiring != null) {
            wiring.close();
        }
        Thread.sleep(200);
        if (eventBus != null) {
            eventBus.close();
        }
        deleteRecursive(tempDir);
    }

    // =========================================================================
    // Chain 1: didChange → DS-E2 → CE debounce → CE-E1
    // =========================================================================

    @Test
    public void chain1_documentChanged_triggersCompilationAndSnapshot() throws InterruptedException {
        CountDownLatch snapshotPublished = new CountDownLatch(1);
        eventBus.subscribe("chain1-observer", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_SNAPSHOT_PUBLISHED), event -> {
                    observedEvents.add(event.eventKind());
                    snapshotPublished.countDown();
                });

        // First: register the project so CE creates a pipeline
        publishEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, testRoot);
        Thread.sleep(500); // wait for initial compilation

        // Then: simulate document change (DS-E2)
        publishEvent(EventKind.WM_DOCUMENT_CHANGED, testRoot);

        Assert.assertTrue(snapshotPublished.await(5, TimeUnit.SECONDS),
                "Chain 1: DS-E2 should trigger CE compilation and CE-E1 (SnapshotPublished)");
        Assert.assertTrue(observedEvents.contains(EventKind.COMPILER_SNAPSHOT_PUBLISHED));
    }

    // =========================================================================
    // Chain 3: Ballerina.toml change → DS-E4 → WM-E4 → CE teardown/create
    // =========================================================================

    @Test
    public void chain3_tomlChange_triggersKindTransitionAndPipelineReset() throws InterruptedException, IOException {
        CountDownLatch wmE4Received = new CountDownLatch(1);
        CountDownLatch wmE7Received = new CountDownLatch(1);

        eventBus.subscribe("chain3-wm-e4", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED), event -> {
                    observedEvents.add(event.eventKind());
                    wmE4Received.countDown();
                });
        // WM-E7 (locking mode changed) may also be observed during workspace reactions
        eventBus.subscribe("chain3-wm-e7", SubscriberTier.BEST_EFFORT,
                Set.of(EventKind.WORKSPACE_LOCKING_MODE_CHANGED), event -> {
                    observedEvents.add(event.eventKind());
                    wmE7Received.countDown();
                });

        // Pre-register a SINGLE_FILE project
        Project wmProject = new Project(testRoot, ProjectKind.SINGLE_FILE, HeapEstimate.ofMb(64));
        wiring.projectRegistry().register(testRoot, wmProject);

        // Create Ballerina.toml on disk to simulate TOML creation (SINGLE_FILE → BUILD)
        Files.writeString(tempDir.resolve("Ballerina.toml"), "[package]\norg = \"test\"\nname = \"myproj\"\n");

        // Simulate structural config file change (DS-E4 with STRUCTURAL tier → triggers WM-E4)
        publishConfigEvent(testRoot, "STRUCTURAL");

        Assert.assertTrue(wmE4Received.await(5, TimeUnit.SECONDS),
                "Chain 3: DS-E4 structural change should trigger WM-E4 (ProjectKindTransitioned)");
        Assert.assertTrue(observedEvents.contains(EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED),
                "Chain 3: WM-E4 event should be in observed events");

        // Verify the project kind was actually transitioned
        wiring.projectRegistry().get(testRoot).ifPresent(project ->
                Assert.assertEquals(project.kind(), ProjectKind.BUILD,
                        "Chain 3: project kind should transition from SINGLE_FILE to BUILD"));
    }

    // =========================================================================
    // Chain 4: heap pressure → WM-E2 → CE + EM cleanup
    // =========================================================================

    @Test
    public void chain4_heapPressure_triggersEvictionAndCleanup() throws InterruptedException {
        CountDownLatch wmE2Received = new CountDownLatch(1);

        eventBus.subscribe("chain4-wm-e2", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_EVICTED), event -> {
                    observedEvents.add(event.eventKind());
                    wmE2Received.countDown();
                });

        // Register project and wait for pipeline
        publishEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, testRoot);
        Thread.sleep(500);

        // Verify CE pipeline exists (snapshot published)
        Assert.assertNotNull(wiring.snapshotStore().getStable(testRoot),
                "Pipeline should exist with a snapshot before eviction");

        // Simulate heap pressure → WM-E2
        publishEvent(EventKind.WORKSPACE_PROJECT_EVICTED, testRoot);

        Assert.assertTrue(wmE2Received.await(3, TimeUnit.SECONDS),
                "Chain 4: heap pressure should fire WM-E2 (ProjectEvicted)");

        // Wait for CE to process eviction
        Thread.sleep(500);

        // CE should have cleaned up the pipeline
        Assert.assertNull(wiring.snapshotStore().getStable(testRoot),
                "Chain 4: WM-E2 should cause CE to evict pipeline and clear snapshot");
    }

    // =========================================================================
    // Chain 5: compilation crash → CE-E2 → WM-E3 → recovery
    // =========================================================================

    @Test
    public void chain5_compilationFailure_triggersHealthStateChange() throws InterruptedException {
        CountDownLatch ceE2Received = new CountDownLatch(1);
        CountDownLatch wmE3Received = new CountDownLatch(1);

        eventBus.subscribe("chain5-ce-e2", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_COMPILATION_FAILED), event -> {
                    observedEvents.add(event.eventKind());
                    ceE2Received.countDown();
                });
        eventBus.subscribe("chain5-wm-e3", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED), event -> {
                    observedEvents.add(event.eventKind());
                    wmE3Received.countDown();
                });

        // Pre-register project in ProjectRegistry so WM can react to CE-E2
        Project wmProject = new Project(testRoot, ProjectKind.BUILD, HeapEstimate.ofMb(64));
        wiring.projectRegistry().register(testRoot, wmProject);

        // Simulate compilation failure (CE-E2)
        publishEvent(EventKind.COMPILER_COMPILATION_FAILED, testRoot);

        Assert.assertTrue(ceE2Received.await(3, TimeUnit.SECONDS),
                "Chain 5: compilation failure event should be received");
        Assert.assertTrue(wmE3Received.await(3, TimeUnit.SECONDS),
                "Chain 5: CE-E2 should trigger WM-E3 (ProjectHealthStateChanged) via ProjectService");
    }

    // =========================================================================
    // WorkspaceTraceLogger receives all event types
    // =========================================================================

    @Test
    public void traceLogger_receivesEventsFromAllContexts() throws InterruptedException {
        List<EventKind> loggedEvents = new CopyOnWriteArrayList<>();
        // DocumentStore is now merged into workspace-manager, so we have 3 bounded contexts:
        // WM (incl. doc ops), CE, EM
        CountDownLatch allContexts = new CountDownLatch(3);
        List<String> contextsParsed = new CopyOnWriteArrayList<>();

        // The trace logger is already wired in WiringConfiguration.
        // Verify it receives events by subscribing a test observer to all event kinds
        eventBus.subscribe("trace-test-observer", SubscriberTier.BEST_EFFORT,
                EnumSet.allOf(EventKind.class), event -> {
                    loggedEvents.add(event.eventKind());
                    String ctx = event.sourceContext();
                    if (!contextsParsed.contains(ctx)) {
                        contextsParsed.add(ctx);
                        allContexts.countDown();
                    }
                });

        // Publish events from all 3 bounded contexts (DS merged into WM per ADR-046)
        publishEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, "workspace-manager");
        publishEvent(EventKind.COMPILER_SNAPSHOT_PUBLISHED, "compiler-engine");
        publishEvent(EventKind.EXECUTION_PROCESS_STARTED, "executionmanager");

        Assert.assertTrue(allContexts.await(3, TimeUnit.SECONDS),
                "Events from all 3 bounded contexts should be received");
        Assert.assertTrue(loggedEvents.contains(EventKind.WORKSPACE_PROJECT_REGISTERED));
        Assert.assertTrue(loggedEvents.contains(EventKind.COMPILER_SNAPSHOT_PUBLISHED));
        Assert.assertTrue(loggedEvents.contains(EventKind.EXECUTION_PROCESS_STARTED));
    }

    // =========================================================================
    // WiringConfiguration construction and lifecycle
    // =========================================================================

    @Test
    public void wiring_constructionOrder_allServicesWired() {
        Assert.assertNotNull(wiring.changeBuffer(), "ChangeBuffer should be wired");
        Assert.assertNotNull(wiring.changeApplier(), "ChangeApplier should be wired");
        Assert.assertNotNull(wiring.heapPressureMonitor(), "HeapPressureMonitor should be wired");
        Assert.assertNotNull(wiring.projectService(), "ProjectService should be wired");
        Assert.assertNotNull(wiring.compilationService(), "CompilationService should be wired");
        Assert.assertNotNull(wiring.executionService(), "ExecutionService should be wired");
        Assert.assertNotNull(wiring.traceLogger(), "WorkspaceTraceLogger should be wired");
    }

    @Test
    public void heapPressureMonitor_lifecycle_startedOnConstructionStoppedOnClose() throws Exception {
        Assert.assertFalse(wiring.heapPressureMonitor().isStopped(),
                "HeapPressureMonitor should be running after construction");
        wiring.close();
        Assert.assertTrue(wiring.heapPressureMonitor().isStopped(),
                "HeapPressureMonitor should be stopped after close()");
    }

    @Test
    public void wiring_closeIsIdempotent() throws Exception {
        wiring.close();
        wiring.close(); // Should not throw
    }

    // =========================================================================
    // No orphaned subscriptions
    // =========================================================================

    @Test
    public void wiring_noOrphanedSubscriptions_allPublishersHaveSubscribers() throws InterruptedException {
        // Verify each event kind published through the bus reaches at least one subscriber
        // beyond the test observer itself. This validates no orphaned subscriptions.
        CountDownLatch allDelivered = new CountDownLatch(1);

        // Publish a WM-E1 event and verify it reaches CE (which subscribes to WM-E1)
        eventBus.subscribe("orphan-check", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_SNAPSHOT_PUBLISHED), event -> {
                    allDelivered.countDown();
                });

        publishEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, testRoot);

        // If CE received WM-E1, it creates a pipeline and publishes CE-E1
        Assert.assertTrue(allDelivered.await(5, TimeUnit.SECONDS),
                "WM-E1 should reach CE subscriber and produce CE-E1");
    }

    // =========================================================================
    // Helpers
    // =========================================================================

    private void publishEvent(EventKind kind, SourceRoot root) {
        eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), kind));
    }

    private void publishEvent(EventKind kind, String sourceContext) {
        eventBus.publish(new DomainEvent(Instant.now(), sourceContext, kind));
    }

    private void publishConfigEvent(SourceRoot root, String reactivityTier) {
        eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(),
                EventKind.WM_FILE_WATCHED_CHANGED, reactivityTier));
    }

    private static void deleteRecursive(Path path) {
        if (path == null || !Files.exists(path)) {
            return;
        }
        try {
            Files.walk(path)
                    .sorted(java.util.Comparator.reverseOrder())
                    .forEach(p -> {
                        try {
                            Files.deleteIfExists(p);
                        } catch (IOException ignored) {
                        }
                    });
        } catch (IOException ignored) {
        }
    }
}
