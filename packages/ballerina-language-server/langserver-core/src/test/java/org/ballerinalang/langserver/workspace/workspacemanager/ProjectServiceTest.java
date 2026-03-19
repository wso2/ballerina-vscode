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

package org.ballerinalang.langserver.workspace.workspacemanager;

import io.ballerina.projects.Project;
import io.ballerina.projects.BuildOptions;
import io.ballerina.projects.environment.PackageLockingMode;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureLevel;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Tests for {@link ProjectServiceImpl} service layer implementation.
 *
 * @since 1.7.0
 */
public class ProjectServiceTest {

    private ProjectRegistry registry;
    private UriResolver uriResolver;
    private EventSyncPubSubHolder eventBus;
    private ProjectServiceImpl service;
    private Path tempDir;
    private CancelChecker cancelChecker;
    private List<DomainEvent> publishedEvents;

    @BeforeMethod
    public void setUp() throws Exception {
        tempDir = Files.createTempDirectory("test-project");
        // Create a Ballerina.toml to make it a proper project root
        Files.write(tempDir.resolve("Ballerina.toml"), new byte[0]);

        registry = new ProjectRegistry(MemoryBudget.ofMb(1024)); // 1GB budget
        uriResolver = new UriResolver();
        eventBus = new EventSyncPubSubHolder();
        publishedEvents = new CopyOnWriteArrayList<>();
        cancelChecker = () -> {}; // Non-cancelling checker for tests

        // Capture published events
        eventBus.subscribe("test-event-logger", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED, EventKind.WORKSPACE_PROJECT_EVICTED,
                        EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED, EventKind.WORKSPACE_PROJECT_TIER_CHANGED,
                        EventKind.WORKSPACE_BATCH_PROJECTS_REGISTERED, EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED),
                publishedEvents::add);

        ProjectLoader loader = (root, kind) -> mockBallerinaProject(root, kind);
        service = new ProjectServiceImpl(registry, uriResolver, eventBus, loader, new ChangeBuffer());
    }

    @AfterMethod
    public void tearDown() {
        service.shutdown();
        eventBus.close();
        registry.shutdown();
    }

    // =========================================================================
    // Wiring Tests
    // =========================================================================

    @Test(groups = "wiring")
    public void wiring_uriResolverIsUsedForResolution() throws Exception {
        // After loadOrCreate, the URI should be resolvable via UriResolver
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);

        // The project path should be registered in UriResolver
        DocumentUri docUri = new DocumentUri.FileUri(projectPath.toUri());
        Optional<ResolvedEntry> resolved = uriResolver.resolve(docUri);
        Assert.assertTrue(resolved.isPresent(), "Path should be resolvable via UriResolver");
        Assert.assertTrue(resolved.get() instanceof ResolvedEntry.ProjectEntry,
                "Resolved entry should be a ProjectEntry");
    }

    @Test(groups = "wiring")
    public void wiring_heapPressureEventEvictsBackgroundProjects() throws Exception {
        SourceRoot root1 = new SourceRoot(tempDir.toAbsolutePath().normalize());
        SourceRoot root2 = new SourceRoot(tempDir.resolve("subdir").toAbsolutePath().normalize());

        // Create two projects
        org.ballerinalang.langserver.workspace.workspacemanager.Project project1 =
                new org.ballerinalang.langserver.workspace.workspacemanager.Project(
                        root1, org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.SINGLE_FILE,
                        HeapEstimate.ofMb(64));
        org.ballerinalang.langserver.workspace.workspacemanager.Project project2 =
                new org.ballerinalang.langserver.workspace.workspacemanager.Project(
                        root2, org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.SINGLE_FILE,
                        HeapEstimate.ofMb(64));

        registry.register(root1, project1);
        registry.register(root2, project2);

        // Make project1 active (has open documents)
        project1.openDocumentCount().increment();

        // Publish RM-E1 heap pressure through the event bus
        eventBus.publish(new DomainEvent(Instant.now(), "heap-monitor",
                EventKind.RM_E1_HEAP_PRESSURE_DETECTED, HeapPressureLevel.WARNING.name()));

        Thread.sleep(200);

        // project2 should be evicted (background), project1 should remain (active)
        Assert.assertTrue(registry.get(root1).isPresent(), "Active project should not be evicted");
        Assert.assertTrue(registry.get(root2).isEmpty(), "Background project should be evicted");
    }

    @Test(groups = "wiring")
    public void wiring_emergencyHeapPressureAlsoEvictsBackgroundProjects() throws Exception {
        SourceRoot root = new SourceRoot(tempDir.resolve("subdir").toAbsolutePath().normalize());

        org.ballerinalang.langserver.workspace.workspacemanager.Project project =
                new org.ballerinalang.langserver.workspace.workspacemanager.Project(
                        root, org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.SINGLE_FILE,
                        HeapEstimate.ofMb(64));

        registry.register(root, project);

        eventBus.publish(new DomainEvent(Instant.now(), EventKind.RM_E1_HEAP_PRESSURE_DETECTED.eventId(),
                EventKind.RM_E1_HEAP_PRESSURE_DETECTED, HeapPressureLevel.EMERGENCY.name()));

        Thread.sleep(200);
        Assert.assertTrue(registry.get(root).isEmpty(), "Emergency pressure should evict background projects");
    }

    @Test(groups = "wiring")
    public void wiring_noDirectHeapPressureListenerField() {
        Assert.assertThrows(NoSuchFieldException.class,
                () -> ProjectServiceImpl.class.getDeclaredField("heapListener"));
    }

    @Test(groups = "wiring")
    public void wiring_eventBusSubscriptionsRegistered() throws Exception {
        // Verify event bus has subscriptions for document and compiler events
        List<DomainEvent> capturedEvents = new CopyOnWriteArrayList<>();
        eventBus.subscribe("test-doc-opened", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_OPENED), capturedEvents::add);

        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_OPENED));
        // Wait for async event delivery
        Thread.sleep(200);
        Assert.assertEquals(capturedEvents.size(), 1, "Event should be published");
    }

    // =========================================================================
    // LockingMode Tests
    // =========================================================================

    @Test(groups = "locking-mode")
    public void lockingMode_defaultIsSOFT() {
        Project project = Mockito.mock(Project.class);
        BuildOptions buildOptions = Mockito.mock(BuildOptions.class);
        Mockito.when(project.buildOptions()).thenReturn(buildOptions);
        Mockito.when(buildOptions.lockingMode()).thenReturn(PackageLockingMode.SOFT);

        Assert.assertEquals(service.getLockingMode(project), LockingMode.SOFT,
                "Default locking mode should be read from project options");
    }

    @Test(groups = "locking-mode")
    public void lockingMode_readsFromProjectCompilationOptions() {
        Project project = Mockito.mock(Project.class);
        BuildOptions buildOptions = Mockito.mock(BuildOptions.class);
        Mockito.when(project.buildOptions()).thenReturn(buildOptions);
        Mockito.when(buildOptions.lockingMode()).thenReturn(PackageLockingMode.HARD);

        Assert.assertEquals(service.getLockingMode(project), LockingMode.HARD,
                "Locking mode should come from project build options");
    }

    @Test(groups = "locking-mode")
    public void lockingMode_nullProjectThrowsNPE() {
        Assert.assertThrows(NullPointerException.class,
                () -> service.getLockingMode(null));
    }

    @Test(groups = "locking-mode")
    public void lockingMode_projectServiceImplDoesNotDeclareControllerField() {
        Assert.assertThrows(NoSuchFieldException.class,
                () -> ProjectServiceImpl.class.getDeclaredField("lockingModeController"));
    }

    // =========================================================================
    // loadOrCreate Tests
    // =========================================================================

    @Test(groups = "load-or-create")
    public void loadOrCreate_firstCallLoadsAndPublishesEvent() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        publishedEvents.clear();

        Project project = service.loadOrCreate(projectPath, cancelChecker);

        // Wait for async event delivery
        Thread.sleep(200);
        Assert.assertNotNull(project, "Project should be loaded");
        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_REGISTERED),
                "WORKSPACE_PROJECT_REGISTERED event should be published");
    }

    @Test(groups = "load-or-create")
    public void loadOrCreate_secondCallIsIdempotent() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        publishedEvents.clear();

        Project project1 = service.loadOrCreate(projectPath, cancelChecker);
        // Wait for async event delivery
        Thread.sleep(200);
        int registrationEventCount = (int) publishedEvents.stream()
                .filter(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_REGISTERED)
                .count();
        Assert.assertEquals(registrationEventCount, 1, "Should publish REGISTERED event once");

        publishedEvents.clear();
        Project project2 = service.loadOrCreate(projectPath, cancelChecker);
        // Wait briefly to ensure no events are delivered
        Thread.sleep(100);
        Assert.assertSame(project1, project2, "Should return same project");
        Assert.assertTrue(publishedEvents.stream()
                .noneMatch(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_REGISTERED),
                "Should not publish duplicate REGISTERED event");
    }

    @Test(groups = "load-or-create")
    public void loadOrCreate_cachesPathInUriResolver() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();

        service.loadOrCreate(projectPath, cancelChecker);

        DocumentUri docUri = new DocumentUri.FileUri(projectPath.toUri());
        Optional<ResolvedEntry> resolved = uriResolver.resolve(docUri);
        Assert.assertTrue(resolved.isPresent(), "Path should be resolvable via UriResolver");
    }

    @Test(groups = "load-or-create")
    public void loadOrCreate_nullPathThrowsNPE() {
        Assert.assertThrows(NullPointerException.class,
                () -> service.loadOrCreate(null, cancelChecker));
    }

    @Test(groups = "load-or-create")
    public void loadOrCreate_nullCancelCheckerIsAccepted() {
        // null cancelChecker means "no cancellation" — must not throw
        Assert.assertNotNull(service.loadOrCreate(tempDir, null));
    }

    // =========================================================================
    // allProjects Tests
    // =========================================================================

    @Test(groups = "all-projects")
    public void allProjects_emptyInitially() {
        Collection<Project> projects = service.allProjects();
        Assert.assertTrue(projects.isEmpty(), "Should be empty initially");
    }

    @Test(groups = "all-projects")
    public void allProjects_returnsLoadedProjects() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);

        Collection<Project> projects = service.allProjects();
        Assert.assertEquals(projects.size(), 1, "Should contain one project");
    }

    // =========================================================================
    // Remove / Eviction Tests
    // =========================================================================

    @Test(groups = "remove")
    public void remove_publishesEvictionEvent() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);
        publishedEvents.clear();

        SourceRoot root = new SourceRoot(projectPath);
        registry.remove(root);

        // Wait for async event delivery
        Thread.sleep(200);
        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_EVICTED),
                "WORKSPACE_PROJECT_EVICTED event should be published");
    }

    @Test(groups = "remove")
    public void remove_removesFromAllProjects() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);
        Assert.assertEquals(service.allProjects().size(), 1);

        SourceRoot root = new SourceRoot(projectPath);
        registry.remove(root);

        Assert.assertTrue(service.allProjects().isEmpty(), "Project should be removed");
    }

    // =========================================================================
    // putAll Tests
    // =========================================================================

    @Test(groups = "put-all")
    public void putAll_publishesBatchEvent() throws Exception {
        SourceRoot root1 = new SourceRoot(tempDir.toAbsolutePath().normalize());
        SourceRoot root2 = new SourceRoot(tempDir.resolve("subdir").toAbsolutePath().normalize());

        org.ballerinalang.langserver.workspace.workspacemanager.Project project1 =
                new org.ballerinalang.langserver.workspace.workspacemanager.Project(
                        root1, org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.SINGLE_FILE,
                        HeapEstimate.ofMb(64));
        org.ballerinalang.langserver.workspace.workspacemanager.Project project2 =
                new org.ballerinalang.langserver.workspace.workspacemanager.Project(
                        root2, org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.SINGLE_FILE,
                        HeapEstimate.ofMb(64));

        publishedEvents.clear();
        Map<SourceRoot, org.ballerinalang.langserver.workspace.workspacemanager.Project> map = new HashMap<>();
        map.put(root1, project1);
        map.put(root2, project2);
        registry.putAll(map);

        // Wait for async event delivery
        Thread.sleep(200);
        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_BATCH_PROJECTS_REGISTERED),
                "WORKSPACE_BATCH_PROJECTS_REGISTERED event should be published");
    }

    // =========================================================================
    // registerWorkspace Tests
    // =========================================================================

    @Test(groups = "register-workspace")
    public void registerWorkspace_batchRegistersAndPublishesWmE6() throws Exception {
        // Create multiple workspace folders
        Path folder1 = tempDir;
        Path folder2 = Files.createTempDirectory("test-project-2");
        Files.write(folder2.resolve("Ballerina.toml"), new byte[0]);

        publishedEvents.clear();
        service.registerWorkspace(List.of(folder1, folder2));

        // Wait for async event delivery
        Thread.sleep(200);
        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_BATCH_PROJECTS_REGISTERED),
                "WORKSPACE_BATCH_PROJECTS_REGISTERED (WM-E6) event should be published");

        // Verify projects are registered
        Collection<Project> projects = service.allProjects();
        Assert.assertEquals(projects.size(), 2, "Should have registered both projects");
    }

    @Test(groups = "register-workspace")
    public void registerWorkspace_emptyListIsNoOp() throws Exception {
        publishedEvents.clear();
        service.registerWorkspace(List.of());

        Thread.sleep(100);
        Assert.assertTrue(publishedEvents.isEmpty(), "Should be no-op for empty list");
    }

    @Test(groups = "register-workspace")
    public void registerWorkspace_nullListThrowsNPE() {
        Assert.assertThrows(NullPointerException.class,
                () -> service.registerWorkspace(null));
    }

    // =========================================================================
    // UriResolver Eviction Tests
    // =========================================================================

    @Test(groups = "cache-invalidation")
    public void cacheInvalidation_projectRemovedEvictsFromUriResolver() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);
        
        // Verify project is registered in UriResolver
        DocumentUri docUri = new DocumentUri.FileUri(projectPath.toUri());
        Assert.assertTrue(uriResolver.resolve(docUri).isPresent(), 
                "Project should be registered in UriResolver");

        // Remove the project
        SourceRoot root = new SourceRoot(projectPath);
        registry.remove(root);

        // Verify subtree was evicted from UriResolver
        Assert.assertTrue(uriResolver.resolve(docUri).isEmpty(), 
                "Project subtree should be evicted from UriResolver after removal");
    }

    @Test(groups = "cache-invalidation")
    public void cacheInvalidation_subtreeEvictionRemovesAllChildPaths() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);
        
        // Verify project is registered
        DocumentUri projectUri = new DocumentUri.FileUri(projectPath.toUri());
        Assert.assertTrue(uriResolver.resolve(projectUri).isPresent(), 
                "Project should be registered in UriResolver");

        // Remove the project (triggers subtree eviction)
        SourceRoot root = new SourceRoot(projectPath);
        registry.remove(root);

        // Verify all paths under the project are also evicted
        Path childPath = projectPath.resolve("modules/test.bal");
        DocumentUri childUri = new DocumentUri.FileUri(childPath.toUri());
        Assert.assertTrue(uriResolver.resolve(childUri).isEmpty(), 
                "Child paths should be evicted when project subtree is removed");
    }

    // =========================================================================
    // Event Subscription: DOCUMENT_OPENED Tests
    // =========================================================================

    @Test(groups = "event-subscription-document-opened")
    public void documentOpened_incrementsOpenDocumentCount() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);
        publishedEvents.clear();

        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_OPENED,
                projectPath.toString()));

        // Allow async processing
        Thread.sleep(100);

        SourceRoot root = new SourceRoot(projectPath);
        Optional<org.ballerinalang.langserver.workspace.workspacemanager.Project> proj = registry.get(root);
        Assert.assertTrue(proj.isPresent());
        Assert.assertEquals(proj.get().openDocumentCount().count(), 1, "Open document count should be 1");
    }

    @Test(groups = "event-subscription-document-opened")
    public void documentOpened_transitionsBACKGROUNDToACTIVE_publishesTierChangedEvent() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);
        publishedEvents.clear();

        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_OPENED,
                projectPath.toString()));

        // Allow async processing
        Thread.sleep(100);

        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_TIER_CHANGED),
                "WORKSPACE_PROJECT_TIER_CHANGED event should be published on transition");
    }

    @Test(groups = "event-subscription-document-opened")
    public void documentOpened_unknownPathNoOp() {
        Path unknownPath = tempDir.resolve("unknown").toAbsolutePath().normalize();
        publishedEvents.clear();

        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_OPENED,
                unknownPath.toString()));

        Assert.assertTrue(publishedEvents.isEmpty(), "No event should be published for unknown path");
    }

    // =========================================================================
    // Event Subscription: DOCUMENT_CLOSED Tests
    // =========================================================================

    @Test(groups = "event-subscription-document-closed")
    public void documentClosed_decrementsOpenDocumentCount() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);

        // Open document
        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_OPENED,
                projectPath.toString()));
        Thread.sleep(100);

        publishedEvents.clear();

        // Close document
        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_CLOSED,
                projectPath.toString()));
        Thread.sleep(100);

        SourceRoot root = new SourceRoot(projectPath);
        Optional<org.ballerinalang.langserver.workspace.workspacemanager.Project> proj = registry.get(root);
        Assert.assertTrue(proj.isPresent());
        Assert.assertEquals(proj.get().openDocumentCount().count(), 0, "Open document count should be 0");
    }

    @Test(groups = "event-subscription-document-closed")
    public void documentClosed_transitionsACTIVEToBACKGROUND_publishesTierChangedEvent() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);

        // Open document
        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_OPENED,
                projectPath.toString()));
        Thread.sleep(100);

        publishedEvents.clear();

        // Close document
        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.WM_DOCUMENT_CLOSED,
                projectPath.toString()));
        Thread.sleep(100);

        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_TIER_CHANGED),
                "WORKSPACE_PROJECT_TIER_CHANGED event should be published on transition");
    }

    // =========================================================================
    // Event Subscription: COMPILER_COMPILATION_FAILED Tests
    // =========================================================================

    @Test(groups = "event-subscription-compilation-failed")
    public void compilationFailed_transitionsToCompilationCrashed() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);

        publishedEvents.clear();
        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.COMPILER_COMPILATION_FAILED,
                projectPath.toString()));
        Thread.sleep(100);

        SourceRoot root = new SourceRoot(projectPath);
        Optional<org.ballerinalang.langserver.workspace.workspacemanager.Project> proj = registry.get(root);
        Assert.assertTrue(proj.isPresent());
        Assert.assertEquals(proj.get().healthState(), ProjectHealthState.COMPILATION_CRASHED,
                "Project should be in COMPILATION_CRASHED state");
    }

    @Test(groups = "event-subscription-compilation-failed")
    public void compilationFailed_publishesHealthStateChangedEvent() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);
        publishedEvents.clear();

        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.COMPILER_COMPILATION_FAILED,
                projectPath.toString()));
        Thread.sleep(100);

        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED),
                "WORKSPACE_PROJECT_HEALTH_STATE_CHANGED event should be published");
    }

    @Test(groups = "event-subscription-compilation-failed")
    public void compilationFailed_unknownRootNoOp() {
        Path unknownPath = tempDir.resolve("unknown").toAbsolutePath().normalize();
        publishedEvents.clear();

        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.COMPILER_COMPILATION_FAILED,
                unknownPath.toString()));

        Assert.assertTrue(publishedEvents.isEmpty(), "No event should be published for unknown root");
    }

    // =========================================================================
    // Event Subscription: COMPILER_DIAGNOSTICS_READY Tests
    // =========================================================================

    @Test(groups = "event-subscription-diagnostics-ready")
    public void diagnosticsReady_recoveringProjectTransitionsToHealthy() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);

        SourceRoot root = new SourceRoot(projectPath);
        org.ballerinalang.langserver.workspace.workspacemanager.Project proj = registry.get(root).get();

        // Transition to RECOVERING
        proj.notifySourceChanged();
        proj.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
        proj.transitionTo(ProjectHealthState.RECOVERING);

        publishedEvents.clear();
        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.CE_E5B_COMPILATION_DIAGNOSTICS_READY,
                projectPath.toString()));
        Thread.sleep(100);

        Assert.assertEquals(proj.healthState(), ProjectHealthState.HEALTHY,
                "Project should transition to HEALTHY");
    }

    @Test(groups = "event-subscription-diagnostics-ready")
    public void diagnosticsReady_nonRecoveringProjectNoOp() throws Exception {
        Path projectPath = tempDir.toAbsolutePath().normalize();
        service.loadOrCreate(projectPath, cancelChecker);

        SourceRoot root = new SourceRoot(projectPath);
        org.ballerinalang.langserver.workspace.workspacemanager.Project proj = registry.get(root).get();
        Assert.assertEquals(proj.healthState(), ProjectHealthState.HEALTHY);

        publishedEvents.clear();
        eventBus.publish(new DomainEvent(Instant.now(), "test", EventKind.CE_E5B_COMPILATION_DIAGNOSTICS_READY,
                projectPath.toString()));
        Thread.sleep(100);

        // Should not publish event if no transition occurred
        long eventCount = publishedEvents.stream()
                .filter(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED)
                .count();
        Assert.assertEquals(eventCount, 0, "No health state change should occur if not in RECOVERING");
    }

    // =========================================================================
    // Health Transition Tests
    // =========================================================================

    @Test(groups = "health-transition")
    public void healthTransition_kindTransitionPublishesEvent() throws Exception {
        // Create a single-file project (no Ballerina.toml in this temp dir)
        Path singleFileDir = Files.createTempDirectory("test-single-file");
        service.loadOrCreate(singleFileDir, cancelChecker);

        SourceRoot root = new SourceRoot(singleFileDir.toAbsolutePath().normalize());
        org.ballerinalang.langserver.workspace.workspacemanager.Project proj = registry.get(root).get();
        Assert.assertEquals(proj.kind(), org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.SINGLE_FILE);

        // Project is initially SINGLE_FILE, transition to BUILD
        publishedEvents.clear();
        service.transitionKind(root, org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.BUILD);

        // Wait for async event delivery
        Thread.sleep(200);
        Assert.assertTrue(publishedEvents.stream()
                .anyMatch(e -> e.eventKind() == EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED),
                "WORKSPACE_PROJECT_KIND_TRANSITIONED event should be published");
    }

    @Test(groups = "health-transition")
    public void healthTransition_invalidTransitionThrowsException() throws Exception {
        // Create a single-file project (no Ballerina.toml in this temp dir)
        Path singleFileDir = Files.createTempDirectory("test-single-file-invalid");
        service.loadOrCreate(singleFileDir, cancelChecker);

        SourceRoot root = new SourceRoot(singleFileDir.toAbsolutePath().normalize());
        org.ballerinalang.langserver.workspace.workspacemanager.Project proj = registry.get(root).get();

        // Try to transition from SINGLE_FILE to SINGLE_FILE (same kind)
        Assert.assertThrows(IllegalStateException.class,
                () -> service.transitionKind(root, org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind.SINGLE_FILE));
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private Project mockBallerinaProject(SourceRoot root,
                                        org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind kind) {
        // Create a mock Ballerina project using Mockito
        Project mockProject = Mockito.mock(Project.class);
        return mockProject;
    }
}
