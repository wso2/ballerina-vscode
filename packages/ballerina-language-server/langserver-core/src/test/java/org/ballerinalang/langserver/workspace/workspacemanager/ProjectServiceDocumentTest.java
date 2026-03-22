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
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.eventbus.event.DomainEvent;
import org.ballerinalang.langserver.workspace.workspacemanager.change.BufferedChange;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeApplier;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeBuffer;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeLayer;
import org.ballerinalang.langserver.workspace.workspacemanager.project.MemoryBudget;
import org.ballerinalang.langserver.workspace.workspacemanager.project.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.DocumentUri;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.UriResolver;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.mockito.Mockito;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Delayed;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

/**
 * Tests document lifecycle routing through {@link ProjectServiceImpl}.
 *
 * @since 1.7.0
 */
public class ProjectServiceDocumentTest {

    private ProjectRegistry registry;
    private UriResolver uriResolver;
    private EventSyncPubSubHolder eventBus;
    private ChangeBuffer changeBuffer;
    private ChangeApplier changeApplier;
    private ScheduledExecutorService applyScheduler;
    private ProjectServiceImpl service;
    private Path tempDir;
    private Path secondProjectDir;
    private List<DomainEvent> publishedEvents;
    private List<ScheduledTask> scheduledTasks;

    @BeforeMethod
    public void setUp() throws Exception {
        tempDir = Files.createTempDirectory("test-project-docs");
        Files.write(tempDir.resolve("Ballerina.toml"), new byte[0]);
        secondProjectDir = Files.createTempDirectory("test-project-docs-2");
        Files.write(secondProjectDir.resolve("Ballerina.toml"), new byte[0]);

        registry = new ProjectRegistry(MemoryBudget.ofMb(1024));
        uriResolver = new UriResolver();
        eventBus = new EventSyncPubSubHolder();
        changeBuffer = new ChangeBuffer();
        changeApplier = Mockito.mock(ChangeApplier.class);
        applyScheduler = Mockito.mock(ScheduledExecutorService.class);
        publishedEvents = new CopyOnWriteArrayList<>();
        scheduledTasks = new CopyOnWriteArrayList<>();

        Mockito.when(applyScheduler.schedule(Mockito.any(Runnable.class), Mockito.anyLong(), Mockito.eq(TimeUnit.MILLISECONDS)))
                .thenAnswer(invocation -> {
                    Runnable task = invocation.getArgument(0);
                    long delay = invocation.getArgument(1);
                    ManualScheduledFuture future = new ManualScheduledFuture();
                    scheduledTasks.add(new ScheduledTask(task, future, delay));
                    return future;
                });

        eventBus.subscribe("test-project-updated", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_UPDATED, EventKind.WORKSPACE_PROJECT_TIER_CHANGED),
                publishedEvents::add);

        ProjectLoader loader = (root, kind) -> Mockito.mock(Project.class);
        service = new ProjectServiceImpl(registry, uriResolver, eventBus, loader, changeBuffer,
                changeApplier, applyScheduler, 150L);
    }

    @AfterMethod
    public void tearDown() {
        service.shutdown();
        eventBus.close();
        registry.shutdown();
    }

    @Test
    public void didOpen_storesFullTextChangeWithEditorLayerAndVersion1() {
        DocumentUri uri = createTestUri(tempDir, "main.bal");
        String content = "function main() {}";

        service.didOpen(uri, content);

        List<BufferedChange> drained = changeBuffer.drain(uri, ChangeLayer.EDITOR);
        Assert.assertEquals(drained.size(), 1, "Should have exactly one buffered change");
        BufferedChange buffered = drained.get(0);
        Assert.assertEquals(buffered.layer(), ChangeLayer.EDITOR, "Layer should be EDITOR");
        Assert.assertEquals(buffered.version().value(), 1, "Version should be 1");
        Assert.assertEquals(buffered.change().getText(), content, "Content should match");
    }

    @Test
    // RED: this test should fail — ProjectServiceImpl does not debounce ChangeApplier scheduling yet
    public void didChange_debounceWindow_emitsSingleProjectUpdated() throws Exception {
        DocumentUri root = new DocumentUri.FileUri(tempDir.toUri());
        DocumentUri uri = createTestUri(tempDir, "main.bal");
        CountDownLatch latch = new CountDownLatch(1);
        List<DomainEvent> updatedEvents = new CopyOnWriteArrayList<>();
        eventBus.subscribe("debounce-project-updated", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_UPDATED), event -> {
                    updatedEvents.add(event);
                    latch.countDown();
                });
        Mockito.when(changeApplier.applyAll()).thenReturn(Set.of(root));

        service.didChange(uri, List.of(new TextDocumentContentChangeEvent("change-1")));
        service.didChange(uri, List.of(new TextDocumentContentChangeEvent("change-2")));

        Assert.assertEquals(scheduledTasks.size(), 2, "Second change should reschedule debounce task");
        Assert.assertTrue(scheduledTasks.get(0).future().isCancelled(), "First task should be cancelled");
        runScheduledTasks();

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS), "A single project-updated event should be published");
        Assert.assertEquals(updatedEvents.size(),
                1,
                "Rapid document edits should coalesce into one project-updated event");
    }

    @Test
    public void didClose_removesVersionCounter_reopenStartsAtVersion1() {
        DocumentUri uri = createTestUri(tempDir, "main.bal");

        service.didOpen(uri, "initial");
        service.didChange(uri, List.of(new TextDocumentContentChangeEvent("change")));
        service.didClose(uri);
        service.didOpen(uri, "new content");

        List<BufferedChange> drained = changeBuffer.drain(uri, ChangeLayer.EDITOR);
        Assert.assertEquals(drained.size(), 1, "Should have only the new open change");
        Assert.assertEquals(drained.get(0).version().value(), 1, "Re-open should start at version 1");
    }

    @Test
    // RED: this test should fail — open/close tracking still relies on document event round-trips
    public void didOpenAndDidClose_updateOpenDocumentCountDirectly() throws Exception {
        Path mainFile = tempDir.resolve("main.bal");
        Files.writeString(mainFile, "function main() {}\n");
        DocumentUri root = new DocumentUri.FileUri(tempDir.toUri());
        DocumentUri uri = new DocumentUri.FileUri(mainFile.toUri());
        CountDownLatch latch = new CountDownLatch(2);
        List<DomainEvent> tierEvents = new CopyOnWriteArrayList<>();
        eventBus.subscribe("tier-events", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_TIER_CHANGED), event -> {
                    tierEvents.add(event);
                    latch.countDown();
                });

        service.loadOrCreate(mainFile, null);
        service.didOpen(uri, "function main() {}\n");
        service.didClose(uri);

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS), "Open and close should emit tier transitions");
        Assert.assertEquals(registry.get(root).orElseThrow().openDocumentCount().count(), 0,
                "Direct didOpen/didClose calls should maintain open document count");
        Assert.assertEquals(tierEvents.size(),
                2,
                "Open and close should publish tier change transitions directly");
    }

    @Test
    // RED: this test should fail — watcher-triggered drains do not emit one project-updated event per project yet
    public void didChangeWatchedFiles_multipleProjects_emitsOneEventPerProject() throws Exception {
        DocumentUri firstRoot = new DocumentUri.FileUri(tempDir.toUri());
        DocumentUri secondRoot = new DocumentUri.FileUri(secondProjectDir.toUri());
        CountDownLatch latch = new CountDownLatch(2);
        List<DomainEvent> updatedEvents = new CopyOnWriteArrayList<>();
        eventBus.subscribe("multi-project-updated", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_UPDATED), event -> {
                    updatedEvents.add(event);
                    latch.countDown();
                });
        Mockito.when(changeApplier.applyAll())
                .thenReturn(Set.of(firstRoot, secondRoot))
                .thenReturn(Set.of());

        FileEvent firstEvent = new FileEvent(tempDir.resolve("Dependencies.toml").toUri().toString(), FileChangeType.Changed);
        FileEvent secondEvent = new FileEvent(secondProjectDir.resolve("Dependencies.toml").toUri().toString(),
                FileChangeType.Changed);

        service.didChangeWatchedFiles(List.of(firstEvent, secondEvent));
        runScheduledTasks();

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS), "One update event should be emitted for each project");
        Assert.assertEquals(updatedEvents.size(),
                2,
                "A single drain cycle should emit one project-updated event per affected project");
    }

    private void runScheduledTasks() {
        scheduledTasks.forEach(ScheduledTask::runIfActive);
    }

    private DocumentUri createTestUri(Path projectDir, String fileName) {
        URI fileUri = projectDir.resolve(fileName).toUri();
        return new DocumentUri.FileUri(fileUri);
    }

    private record ScheduledTask(Runnable runnable, ManualScheduledFuture future, long delayMs) {
        private void runIfActive() {
            if (!future.isCancelled()) {
                runnable.run();
            }
        }
    }

    private static final class ManualScheduledFuture implements ScheduledFuture<Object> {

        private volatile boolean cancelled;

        @Override
        public long getDelay(TimeUnit unit) {
            return 0;
        }

        @Override
        public int compareTo(Delayed other) {
            return 0;
        }

        @Override
        public boolean cancel(boolean mayInterruptIfRunning) {
            this.cancelled = true;
            return true;
        }

        @Override
        public boolean isCancelled() {
            return cancelled;
        }

        @Override
        public boolean isDone() {
            return cancelled;
        }

        @Override
        public Object get() {
            return null;
        }

        @Override
        public Object get(long timeout, TimeUnit unit) {
            return null;
        }
    }
}
