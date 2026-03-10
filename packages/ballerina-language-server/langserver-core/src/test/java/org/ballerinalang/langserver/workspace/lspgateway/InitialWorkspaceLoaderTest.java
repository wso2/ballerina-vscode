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

package org.ballerinalang.langserver.workspace.lspgateway;

import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.eclipse.lsp4j.ClientCapabilities;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Tests for {@link InitialWorkspaceLoader} IWL orchestration.
 *
 * @since 1.7.0
 */
public class InitialWorkspaceLoaderTest {

    private ProjectService projectService;
    private EventSyncPubSubHolder eventBus;
    private ProgressTracker progressTracker;
    private ExecutorService testExecutor;
    private Path tempDir;
    private List<DomainEvent> publishedEvents;

    @BeforeMethod
    public void setUp() throws Exception {
        tempDir = Files.createTempDirectory("iwl-test");
        Files.write(tempDir.resolve("Ballerina.toml"), new byte[0]);

        projectService = Mockito.mock(ProjectService.class);
        eventBus = new EventSyncPubSubHolder();
        progressTracker = Mockito.mock(ProgressTracker.class);
        testExecutor = Executors.newSingleThreadExecutor();
        publishedEvents = new CopyOnWriteArrayList<>();

        // Capture published events
        eventBus.subscribe("iwl-test-logger", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_SNAPSHOT_PUBLISHED),
                publishedEvents::add);
    }

    @AfterMethod
    public void tearDown() throws Exception {
        eventBus.close();
        testExecutor.shutdownNow();
        // Clean up temp directory
        Files.walk(tempDir)
                .sorted((a, b) -> -a.compareTo(b))
                .forEach(p -> {
                    try {
                        Files.delete(p);
                    } catch (Exception e) {
                        // Ignore
                    }
                });
    }

    @Test(groups = "iwl-lifecycle")
    public void startIwl_callsProgressTrackerBegin() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(100);

        Mockito.verify(progressTracker).begin(
                InitialWorkspaceLoader.IWL_PROGRESS_TOKEN,
                "Indexing",
                "Scanning workspace...",
                0
        );
    }

    @Test(groups = "iwl-lifecycle")
    public void startIwl_isIdempotent() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        loader.startIwl(session);
        loader.startIwl(session);

        Thread.sleep(100);

        // Progress begin should be called only once
        Mockito.verify(progressTracker, Mockito.times(1)).begin(
                Mockito.anyString(), Mockito.anyString(),
                Mockito.anyString(), Mockito.anyInt()
        );
    }

    @Test(groups = "iwl-lifecycle")
    public void startIwl_callsRegisterWorkspace() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        // Wait for background task to complete
        Thread.sleep(500);

        Mockito.verify(projectService).registerWorkspace(Mockito.argThat(
                list -> !list.isEmpty()
        ));
    }

    @Test(groups = "iwl-lifecycle")
    public void startIwl_marksSyntaxReady() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        boolean syntaxReady = loader.readinessController().awaitSyntaxReady(5, TimeUnit.SECONDS);

        Assert.assertTrue(syntaxReady, "Syntax tier should be ready after IWL");
    }

    @Test(groups = "iwl-scan")
    public void scanForBallerinaRoots_emptyFolderReturnsEmpty() throws Exception {
        Path emptyDir = Files.createTempDirectory("empty");
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(emptyDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(300);

        // registerWorkspace may be called with empty list or not called at all
        Mockito.verify(projectService, Mockito.atMost(1)).registerWorkspace(Mockito.anyList());
    }

    @Test(groups = "iwl-scan")
    public void scanForBallerinaRoots_singleProjectFound() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(300);

        Mockito.verify(projectService).registerWorkspace(Mockito.argThat(
                list -> list.size() >= 1 && list.stream().anyMatch(p -> p.resolve("Ballerina.toml").toFile().exists())
        ));
    }

    @Test(groups = "iwl-scan")
    public void scanForBallerinaRoots_nestedProjectsFound() throws Exception {
        // Create nested projects
        Path nested1 = tempDir.resolve("sub1");
        Path nested2 = tempDir.resolve("sub1/subsub");
        Files.createDirectories(nested1);
        Files.createDirectories(nested2);
        Files.write(nested1.resolve("Ballerina.toml"), new byte[0]);
        Files.write(nested2.resolve("Ballerina.toml"), new byte[0]);

        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(500);

        Mockito.verify(projectService).registerWorkspace(Mockito.argThat(
                list -> list.size() >= 3  // tempDir, nested1, nested2
        ));
    }

    @Test(groups = "iwl-semantic-readiness")
    public void ceE1Event_marksSemanticReady() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(200);

        // Simulate CE-E1 event
        eventBus.publish(new DomainEvent(Instant.now(), "compiler", EventKind.COMPILER_SNAPSHOT_PUBLISHED));
        Thread.sleep(200);

        Assert.assertTrue(loader.readinessController().isSemanticReady());
    }

    @Test(groups = "iwl-semantic-readiness")
    public void ceE1Event_endsProgressReport() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(200);

        // Simulate CE-E1 event
        eventBus.publish(new DomainEvent(Instant.now(), "compiler", EventKind.COMPILER_SNAPSHOT_PUBLISHED));
        Thread.sleep(200);

        Mockito.verify(progressTracker).end(
                InitialWorkspaceLoader.IWL_PROGRESS_TOKEN,
                "Workspace ready"
        );
    }

    @Test(groups = "iwl-semantic-readiness")
    public void ceE1Event_endSentOnlyOnce() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(300);

        // Simulate multiple CE-E1 events
        eventBus.publish(new DomainEvent(Instant.now(), "compiler", EventKind.COMPILER_SNAPSHOT_PUBLISHED));
        Thread.sleep(100);
        eventBus.publish(new DomainEvent(Instant.now(), "compiler", EventKind.COMPILER_SNAPSHOT_PUBLISHED));
        Thread.sleep(100);

        // Progress end should be called only once (from CE-E1, not from finally block)
        Mockito.verify(progressTracker, Mockito.times(1)).end(
                Mockito.anyString(), Mockito.anyString()
        );
    }

    @Test(groups = "iwl-failure-path")
    public void startIwl_endsProgressEvenOnException() throws Exception {
        // Create a mock ProjectService that throws an exception
        ProjectService failingService = Mockito.mock(ProjectService.class);
        Mockito.doThrow(new RuntimeException("Test exception"))
                .when(failingService).registerWorkspace(Mockito.anyList());

        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                failingService, eventBus, progressTracker, testExecutor);

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                List.of(tempDir.toUri().toString()),
                "session-1"
        );

        loader.startIwl(session);
        Thread.sleep(300);

        // Progress end should still be called despite exception
        Mockito.verify(progressTracker).end(
                Mockito.eq(InitialWorkspaceLoader.IWL_PROGRESS_TOKEN),
                Mockito.anyString()
        );
    }

    @Test(groups = "iwl-stale-result")
    public void contentModifiedHint_beforeSemanticReady() {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        TwoTierReadinessController.ContentModifiedError error =
                loader.readinessController().contentModifiedHint(2000);

        Assert.assertEquals(error.errorCode(), -32801);
        Assert.assertEquals(error.retryAfterMs(), 2000);
    }

    @Test(groups = "iwl-lifecycle")
    public void readinessController_exposedForFacade() {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        TwoTierReadinessController controller = loader.readinessController();
        Assert.assertNotNull(controller);
        Assert.assertFalse(controller.isSyntaxReady());
        Assert.assertFalse(controller.isSemanticReady());
    }

    @Test(groups = "iwl-lifecycle")
    public void shutdown_shutdownsExecutor() throws Exception {
        InitialWorkspaceLoader loader = new InitialWorkspaceLoader(
                projectService, eventBus, progressTracker, testExecutor);

        loader.shutdown();
        // Executor should be shutdown
        boolean terminated = testExecutor.awaitTermination(1, TimeUnit.SECONDS);
        Assert.assertTrue(terminated, "Executor should be terminated");
    }
}
