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

import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationPipeline;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationServiceImpl;
import org.ballerinalang.langserver.workspace.compilerengine.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.compilerengine.StableSnapshot;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureLevel;
import org.ballerinalang.langserver.workspace.workspacemanager.ChangeBuffer;
import org.ballerinalang.langserver.workspace.workspacemanager.HeapEstimate;
import org.ballerinalang.langserver.workspace.workspacemanager.MemoryBudget;
import org.ballerinalang.langserver.workspace.workspacemanager.Project;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectHealthState;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectLoader;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.ballerinalang.langserver.workspace.workspacemanager.UriResolver;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.mockito.Mockito.mock;

/**
 * Acceptance tests for v2.0 cross-context boundaries after the DS+WM merge.
 *
 * @since 1.7.0
 */
public class CrossContextBoundaryTest {

    private EventSyncPubSubHolder eventBus;
    private ProjectRegistry registry;
    private UriResolver uriResolver;
    private ChangeBuffer changeBuffer;
    private ProjectServiceImpl projectService;
    private CompilationServiceImpl compilationService;
    private Path tempDir;

    @BeforeMethod
    public void setUp() throws IOException {
        eventBus = new EventSyncPubSubHolder();
        registry = new ProjectRegistry(MemoryBudget.ofMb(1024));
        uriResolver = new UriResolver();
        changeBuffer = new ChangeBuffer();
        tempDir = Files.createTempDirectory("cross-context-boundary");
        Files.writeString(tempDir.resolve("Ballerina.toml"), "[package]\norg = \"test\"\nname = \"cross\"\n");
        Files.writeString(tempDir.resolve("main.bal"), "public function main() {}\n");
    }

    @AfterMethod
    public void tearDown() throws Exception {
        if (compilationService != null) {
            compilationService.close();
            compilationService = null;
        }
        if (projectService != null) {
            projectService.shutdown();
            projectService = null;
        }
        if (eventBus != null) {
            eventBus.close();
            eventBus = null;
        }
        if (registry != null) {
            registry.shutdown();
            registry = null;
        }
        deleteRecursive(tempDir);
    }

    @Test
    public void wmDocumentChanged_crossesToCompilerEngineAndTriggersCompilation() throws Exception {
        // RED: this test should fail — WM->CE compilation trigger wiring is not yet verified here
        AtomicInteger compileCount = new AtomicInteger();
        CountDownLatch secondCompilation = new CountDownLatch(1);
        compilationService = new CompilationServiceImpl(new DualSnapshotStore(), eventBus,
                countingAction(compileCount, secondCompilation), 50L);
        SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());
        Path mainFile = tempDir.resolve("main.bal");
        eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WORKSPACE_PROJECT_REGISTERED));

        Assert.assertTrue(awaitCompileCount(compileCount, 1, 3), "Project registration should trigger initial compile");

        eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WM_DOCUMENT_CHANGED,
                mainFile.toString()));

        Assert.assertTrue(secondCompilation.await(3, TimeUnit.SECONDS),
                "WM_DOCUMENT_CHANGED should trigger a second compilation in CE");
    }

    @Test
    public void rmHeapPressure_crossesToProjectServiceAndEvictsBackgroundProjects() throws Exception {
        projectService = createProjectService();
        SourceRoot activeRoot = new SourceRoot(tempDir.toAbsolutePath().normalize());
        SourceRoot backgroundRoot = new SourceRoot(tempDir.resolve("background").toAbsolutePath().normalize());

        Project activeProject = new Project(activeRoot, ProjectKind.BUILD, HeapEstimate.ofMb(64));
        Project backgroundProject = new Project(backgroundRoot, ProjectKind.BUILD, HeapEstimate.ofMb(64));
        activeProject.openDocumentCount().increment();
        registry.register(activeRoot, activeProject);
        registry.register(backgroundRoot, backgroundProject);

        eventBus.publish(new DomainEvent(Instant.now(), "resource-monitor",
                EventKind.RM_E1_HEAP_PRESSURE_DETECTED, HeapPressureLevel.WARNING.name()));

        Assert.assertTrue(awaitCondition(() -> registry.get(activeRoot).isPresent(), 3),
                "Active project should remain after RM_E1");
        Assert.assertTrue(awaitCondition(() -> registry.get(backgroundRoot).isEmpty(), 3),
                "Background project should be evicted after RM_E1");
    }

    @Test
    public void rmHeapPressure_crossesToCompilerEngineAndThrottlesCompilation() throws Exception {
        AtomicInteger compileCount = new AtomicInteger();
        CountDownLatch throttledCompilation = new CountDownLatch(1);
        compilationService = new CompilationServiceImpl(new DualSnapshotStore(), eventBus,
                countingAction(compileCount, throttledCompilation), 50L, 300L);
        SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());
        Path mainFile = tempDir.resolve("main.bal");
        eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WORKSPACE_PROJECT_REGISTERED));
        Assert.assertTrue(awaitCompileCount(compileCount, 1, 3), "Project registration should trigger initial compile");

        eventBus.publish(new DomainEvent(Instant.now(), "resource-monitor",
                EventKind.RM_E1_HEAP_PRESSURE_DETECTED, HeapPressureLevel.WARNING.name()));
        eventBus.publish(new DomainEvent(Instant.now(), root.path().toString(), EventKind.WM_DOCUMENT_CHANGED,
                mainFile.toString()));

        Assert.assertFalse(throttledCompilation.await(150, TimeUnit.MILLISECONDS),
                "RM_E1 should throttle immediate recompilation requests in CE");
        Assert.assertTrue(throttledCompilation.await(2, TimeUnit.SECONDS),
                "Compilation should resume after the throttle window expires");
    }

    @Test
    public void ceE5a_crossesToProjectServiceAndIsRecorded() throws Exception {
        projectService = createProjectService();
        Path mainFile = tempDir.resolve("main.bal");
        projectService.loadOrCreate(mainFile, () -> { });
        SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());

        eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
                EventKind.CE_E5A_RESOLUTION_DIAGNOSTICS_READY, root.path().toString()));

        Assert.assertTrue(awaitCondition(() -> hasObservedCompilerSignal(root, EventKind.CE_E5A_RESOLUTION_DIAGNOSTICS_READY), 3),
                "CE-E5a should be observed by ProjectService");
    }

    @Test
    public void ceE5b_crossesToProjectServiceAndRestoresHealthyState() throws Exception {
        projectService = createProjectService();
        Path mainFile = tempDir.resolve("main.bal");
        projectService.loadOrCreate(mainFile, () -> { });
        SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());
        Project project = registry.get(root).orElseThrow();
        project.notifySourceChanged();
        project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);

        eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
                EventKind.CE_E5B_COMPILATION_DIAGNOSTICS_READY, root.path().toString()));

        Assert.assertTrue(awaitCondition(() -> project.healthState() == ProjectHealthState.HEALTHY, 3),
                "CE-E5b should restore a recovering project to HEALTHY");
    }

    @Test
    public void ceResolutionExhausted_crossesToProjectServiceAndOpensCircuit() throws Exception {
        projectService = createProjectService();
        Path mainFile = tempDir.resolve("main.bal");
        projectService.loadOrCreate(mainFile, () -> { });
        SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());
        Project project = registry.get(root).orElseThrow();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);

        eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
                EventKind.CE_RESOLUTION_EXHAUSTED, root.path().toString()));

        Assert.assertTrue(awaitCondition(() -> project.healthState() == ProjectHealthState.CIRCUIT_OPEN, 3),
                "CE resolution exhaustion should move a recovering project to CIRCUIT_OPEN");
    }

    @Test
    public void ceResolutionRecovered_crossesToProjectServiceAndReturnsToRecovering() throws Exception {
        projectService = createProjectService();
        Path mainFile = tempDir.resolve("main.bal");
        projectService.loadOrCreate(mainFile, () -> { });
        SourceRoot root = new SourceRoot(tempDir.toAbsolutePath().normalize());
        Project project = registry.get(root).orElseThrow();
        project.transitionTo(ProjectHealthState.PROJECT_CRASHED);
        project.transitionTo(ProjectHealthState.RECOVERING);
        project.transitionTo(ProjectHealthState.CIRCUIT_OPEN);

        eventBus.publish(new DomainEvent(Instant.now(), "compiler-engine",
                EventKind.CE_RESOLUTION_RECOVERED, root.path().toString()));

        Assert.assertTrue(awaitCondition(() -> project.healthState() == ProjectHealthState.RECOVERING, 3),
                "CE resolution recovery should move a circuit-open project back to RECOVERING");
    }

    private ProjectServiceImpl createProjectService() {
        ProjectLoader loader = (root, kind) -> mock(io.ballerina.projects.Project.class);
        return projectService = new ProjectServiceImpl(registry, uriResolver, eventBus, loader, changeBuffer);
    }

    private CompilationPipeline.CompilationAction countingAction(AtomicInteger compileCount, CountDownLatch latch) {
        StableSnapshot snapshot = new StableSnapshot(Map.of(), Map.of(), Map.of(),
                mock(PackageCompilation.class), new ContentVersion(1));
        return task -> {
            if (compileCount.incrementAndGet() >= 2) {
                latch.countDown();
            }
            return snapshot;
        };
    }

    private boolean hasObservedCompilerSignal(SourceRoot root, EventKind signal) {
        try {
            Method method = ProjectServiceImpl.class.getDeclaredMethod("hasObservedCompilerSignal", SourceRoot.class,
                    EventKind.class);
            method.setAccessible(true);
            return (boolean) method.invoke(projectService, root, signal);
        } catch (ReflectiveOperationException e) {
            throw new AssertionError("ProjectServiceImpl should expose compiler signal observation for boundary tests", e);
        }
    }

    private boolean awaitCompileCount(AtomicInteger compileCount, int expected, int timeoutSeconds) throws InterruptedException {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
        while (System.nanoTime() < deadline) {
            if (compileCount.get() >= expected) {
                return true;
            }
            TimeUnit.MILLISECONDS.sleep(25);
        }
        return compileCount.get() >= expected;
    }

    private boolean awaitCondition(CheckedBooleanSupplier condition, int timeoutSeconds) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(timeoutSeconds);
        while (System.nanoTime() < deadline) {
            if (condition.getAsBoolean()) {
                return true;
            }
            TimeUnit.MILLISECONDS.sleep(25);
        }
        return condition.getAsBoolean();
    }

    private static void deleteRecursive(Path path) throws IOException {
        if (path == null || !Files.exists(path)) {
            return;
        }
        try (var stream = Files.walk(path)) {
            stream.sorted(java.util.Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                }
            });
        }
    }

    @FunctionalInterface
    private interface CheckedBooleanSupplier {
        boolean getAsBoolean() throws Exception;
    }
}
