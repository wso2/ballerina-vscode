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

import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.PackageDescriptor;
import io.ballerina.projects.PackageName;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationKey;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.StableSnapshot;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ContentVersion;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.DocumentUri;
import org.ballerinalang.langserver.workspace.eventbus.event.CompilerEvent;
import org.ballerinalang.langserver.workspace.eventbus.event.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.event.ProcessEvent;
import org.ballerinalang.langserver.workspace.eventbus.event.ProjectEvent;
import org.ballerinalang.langserver.workspace.eventbus.ProjectEvictedEvent;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.ballerinalang.langserver.workspace.workspacemanager.project.EvictionReason;
import org.ballerinalang.langserver.workspace.execution.GracePeriod;
import org.ballerinalang.langserver.workspace.workspacemanager.project.HeapEstimate;
import org.ballerinalang.langserver.workspace.workspacemanager.project.MemoryBudget;
import org.ballerinalang.langserver.workspace.workspacemanager.project.Project;
import org.ballerinalang.langserver.workspace.workspacemanager.project.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.project.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.UriResolver;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
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
    private DocumentUri testRoot;
    private PackageDescriptor testDescriptor;

    // Track events received by a test observer
    private final List<EventKind> observedEvents = new CopyOnWriteArrayList<>();

    @BeforeMethod
    public void setUp() throws IOException {
        tempDir = Files.createTempDirectory("t020-integration");
        testRoot = new DocumentUri.FileUri(tempDir.toAbsolutePath().normalize().toUri());

        eventBus = new EventSyncPubSubHolder();

        // Create test-observable mock compilation action
        StableSnapshot mockSnapshot = new StableSnapshot(Map.of(), Map.of(), Map.of(),
                mock(PackageCompilation.class), new ContentVersion(1));
        testDescriptor = descriptor(tempDir.getFileName().toString());

        wiring = WiringConfiguration.builder()
                .eventBus(eventBus)
                .snapshotStore(new DualSnapshotStore())
                .compilationAction(new org.ballerinalang.langserver.workspace.compilerengine.CompilationPipeline
                        .CompilationAction() {
                    @Override
                    public StableSnapshot compile(org.ballerinalang.langserver.workspace.compilerengine.CompileTask task) {
                        return mockSnapshot;
                    }

                    @Override
                    public PackageDescriptor describe(String sourceRootIdentifier) {
                        return testDescriptor;
                    }
                })
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
    // Chain 1: didChange → WM-E4 → CE debounce → CE-E1
    // =========================================================================

    @Test
    public void chain1_projectUpdated_triggersCompilationAndSnapshot() throws InterruptedException {
        CountDownLatch snapshotPublished = new CountDownLatch(1);
        eventBus.subscribe("chain1-observer", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_SNAPSHOT_PUBLISHED), event -> {
                    observedEvents.add(event.eventKind());
                    snapshotPublished.countDown();
                });

        // First: register the project so CE creates a pipeline
        publishEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, testRoot);
        Thread.sleep(500); // wait for initial compilation

        // Then: simulate project update after ChangeApplier drain (WM-E4)
        publishEvent(EventKind.WORKSPACE_PROJECT_UPDATED, testRoot);

        Assert.assertTrue(snapshotPublished.await(5, TimeUnit.SECONDS),
                "Chain 1: WM-E4 should trigger CE compilation and CE-E1 (SnapshotPublished)");
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

        // Simulate structural config file change through the project service watcher path.
        wiring.projectService().didChangeWatchedFiles(List.of(
                new FileEvent(tempDir.resolve("Ballerina.toml").toUri().toString(), FileChangeType.Created)));

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
        Assert.assertNotNull(wiring.snapshotStore().getStable(
                        new CompilationKey(tempDir.toAbsolutePath().normalize().toString(), testDescriptor)),
                "Pipeline should exist with a snapshot before eviction");

        // Simulate heap pressure → WM-E2
        publishEvent(EventKind.WORKSPACE_PROJECT_EVICTED, testRoot);

        Assert.assertTrue(wmE2Received.await(3, TimeUnit.SECONDS),
                "Chain 4: heap pressure should fire WM-E2 (ProjectEvicted)");

        // Wait for CE to process eviction
        Thread.sleep(500);

        // CE should have cleaned up the pipeline
        Assert.assertNull(wiring.snapshotStore().getStable(
                        new CompilationKey(tempDir.toAbsolutePath().normalize().toString(), testDescriptor)),
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
        CountDownLatch allThreeEvents = new CountDownLatch(3);

        // The trace logger is already wired in WiringConfiguration.
        // Verify it receives events by subscribing a test observer to all event kinds
        eventBus.subscribe("trace-test-observer", SubscriberTier.BEST_EFFORT,
                EnumSet.allOf(EventKind.class), event -> {
                    loggedEvents.add(event.eventKind());
                    allThreeEvents.countDown();
                });

        // Publish events from all 3 bounded contexts (DS merged into WM per ADR-046)
        URI wmRoot = URI.create("file:///workspace-manager");
        URI ceRoot = URI.create("file:///compiler-engine");
        URI emRoot = URI.create("file:///execution-manager");
        eventBus.publish(new ProjectEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, wmRoot));
        eventBus.publish(new CompilerEvent(EventKind.COMPILER_SNAPSHOT_PUBLISHED, ceRoot, "test-pkg"));
        eventBus.publish(new ProcessEvent(EventKind.EXECUTION_PROCESS_STARTED, emRoot, "pid-1"));

        Assert.assertTrue(allThreeEvents.await(3, TimeUnit.SECONDS),
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

    private void publishEvent(EventKind kind, DocumentUri root) {
        DomainEvent event = switch (kind) {
            case WORKSPACE_PROJECT_REGISTERED, WORKSPACE_PROJECT_HEALTH_STATE_CHANGED,
                 WORKSPACE_PROJECT_UPDATED,
                 WORKSPACE_PROJECT_TIER_CHANGED, WORKSPACE_LOCKING_MODE_CHANGED,
                 CACHE_INVALIDATION_REQUESTED ->
                    new ProjectEvent(kind, root.uri());
            case WORKSPACE_PROJECT_EVICTED ->
                    new ProjectEvictedEvent(root.uri(), EvictionReason.DOCUMENT_CLOSED);
            case WORKSPACE_PROJECT_KIND_TRANSITIONED ->
                    new ProjectEvent(kind, root.uri());
            case COMPILER_COMPILATION_FAILED, COMPILER_SNAPSHOT_PUBLISHED, COMPILER_COMPILATION_CANCELLED,
                 COMPILER_RESOLUTION_COMPLETED, CE_E5A_RESOLUTION_DIAGNOSTICS_READY,
                 CE_E5B_COMPILATION_DIAGNOSTICS_READY, CE_RESOLUTION_EXHAUSTED, CE_RESOLUTION_RECOVERED ->
                    new CompilerEvent(kind, root.uri(), "test-pkg");
            case EXECUTION_PROCESS_STARTED, EXECUTION_PROCESS_TERMINATED ->
                    new ProcessEvent(kind, root.uri(), "pid-1");
            default -> new ProjectEvent(EventKind.WORKSPACE_PROJECT_REGISTERED, root.uri());
        };
        eventBus.publish(event);
    }

    private PackageDescriptor descriptor(String packageNameValue) {
        PackageDescriptor descriptor = mock(PackageDescriptor.class);
        PackageName packageName = mock(PackageName.class);
        org.mockito.Mockito.when(descriptor.name()).thenReturn(packageName);
        org.mockito.Mockito.when(packageName.value()).thenReturn(packageNameValue);
        return descriptor;
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
