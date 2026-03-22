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
import org.ballerinalang.langserver.workspace.eventbus.event.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.workspacemanager.change.BufferedChange;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeBuffer;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeLayer;
import org.ballerinalang.langserver.workspace.workspacemanager.project.MemoryBudget;
import org.ballerinalang.langserver.workspace.workspacemanager.project.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.DocumentUri;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.UriResolver;
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
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tests for document lifecycle operations on {@link ProjectService}.
 *
 * <p>Verifies didOpen/didChange/didClose operations through ProjectService
 * using ChangeBuffer as the document state intermediary per ADR-046 and ADR-047.
 *
 * @since 1.7.0
 */
public class ProjectServiceDocumentTest {

    private ProjectRegistry registry;
    private UriResolver uriResolver;
    private EventSyncPubSubHolder eventBus;
    private ChangeBuffer changeBuffer;
    private ProjectServiceImpl service;
    private Path tempDir;
    private List<DomainEvent> publishedEvents;

    @BeforeMethod
    public void setUp() throws Exception {
        tempDir = Files.createTempDirectory("test-project-docs");
        Files.write(tempDir.resolve("Ballerina.toml"), new byte[0]);

        registry = new ProjectRegistry(MemoryBudget.ofMb(1024));
        uriResolver = new UriResolver();
        eventBus = new EventSyncPubSubHolder();
        changeBuffer = new ChangeBuffer();
        publishedEvents = new CopyOnWriteArrayList<>();

        // Capture all document lifecycle events
        eventBus.subscribe("test-doc-events", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_OPENED, EventKind.WM_DOCUMENT_CHANGED,
                        EventKind.WM_DOCUMENT_CLOSED),
                publishedEvents::add);

        ProjectLoader loader = (root, kind) -> Mockito.mock(Project.class);
        service = new ProjectServiceImpl(registry, uriResolver, eventBus, loader, changeBuffer);
    }

    @AfterMethod
    public void tearDown() {
        service.shutdown();
        eventBus.close();
        registry.shutdown();
    }

    // =========================================================================
    // didOpen Tests
    // =========================================================================

    /**
     * Verifies that didOpen creates a ChangeBuffer entry and publishes WM_DOCUMENT_OPENED.
     */
    @Test
    public void didOpen_createsChangeBufferEntryAndPublishesOpenedEvent() throws Exception {
        DocumentUri uri = createTestUri("main.bal");
        CountDownLatch latch = new CountDownLatch(1);
        eventBus.subscribe("test-opened-latch", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_OPENED), e -> latch.countDown());

        service.didOpen(uri, "function main() {}");

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS), "WM_DOCUMENT_OPENED event should be published");
        Assert.assertTrue(changeBuffer.hasChanges(uri), "ChangeBuffer should have changes after didOpen");
    }

    /**
     * Verifies that didOpen stores a full-text change with EDITOR layer and version 1.
     */
    @Test
    public void didOpen_storesFullTextChangeWithEditorLayerAndVersion1() throws Exception {
        DocumentUri uri = createTestUri("main.bal");
        String content = "function main() {}";

        service.didOpen(uri, content);

        List<BufferedChange> drained = changeBuffer.drain(uri, ChangeLayer.EDITOR);
        Assert.assertEquals(drained.size(), 1, "Should have exactly one buffered change");
        BufferedChange buffered = drained.get(0);
        Assert.assertEquals(buffered.layer(), ChangeLayer.EDITOR, "Layer should be EDITOR");
        Assert.assertEquals(buffered.version().value(), 1, "Version should be 1");
        Assert.assertEquals(buffered.change().getText(), content, "Content should match");
    }

    // =========================================================================
    // didChange Tests
    // =========================================================================

    /**
     * Verifies that didChange appends a BufferedChange and publishes WM_DOCUMENT_CHANGED.
     */
    @Test
    public void didChange_appendsBufferedChangeAndPublishesChangedEvent() throws Exception {
        DocumentUri uri = createTestUri("main.bal");
        CountDownLatch latch = new CountDownLatch(1);
        eventBus.subscribe("test-changed-latch", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_CHANGED), e -> latch.countDown());

        // Open first
        service.didOpen(uri, "initial");
        publishedEvents.clear();

        // Change
        service.didChange(uri, List.of(new TextDocumentContentChangeEvent("updated content")));

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS), "WM_DOCUMENT_CHANGED event should be published");
        Assert.assertTrue(changeBuffer.hasChanges(uri), "ChangeBuffer should have changes after didChange");
    }

    /**
     * Verifies that multiple didChange calls accumulate changes in order.
     */
    @Test
    public void didChange_multipleChangesAccumulateInOrder() throws Exception {
        DocumentUri uri = createTestUri("main.bal");

        // Open
        service.didOpen(uri, "initial");

        // Three changes
        String[] changes = {"change1", "change2", "change3"};
        for (String change : changes) {
            service.didChange(uri, List.of(new TextDocumentContentChangeEvent(change)));
        }

        // Drain all changes (1 open + 3 changes)
        List<BufferedChange> drained = changeBuffer.drain(uri, ChangeLayer.EDITOR);

        Assert.assertEquals(drained.size(), 4, "Should have 4 changes (1 open + 3 changes)");
        Assert.assertEquals(drained.get(0).change().getText(), "initial");
        Assert.assertEquals(drained.get(1).change().getText(), "change1");
        Assert.assertEquals(drained.get(2).change().getText(), "change2");
        Assert.assertEquals(drained.get(3).change().getText(), "change3");
    }

    // =========================================================================
    // didClose Tests
    // =========================================================================

    /**
     * Verifies that didClose clears the ChangeBuffer and publishes WM_DOCUMENT_CLOSED.
     */
    @Test
    public void didClose_clearsChangeBufferAndPublishesClosedEvent() throws Exception {
        DocumentUri uri = createTestUri("main.bal");
        CountDownLatch latch = new CountDownLatch(1);
        eventBus.subscribe("test-closed-latch", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_CLOSED), e -> latch.countDown());

        // Open and verify buffer has changes
        service.didOpen(uri, "content");
        Assert.assertTrue(changeBuffer.hasChanges(uri), "Should have changes before close");

        // Close
        service.didClose(uri);

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS), "WM_DOCUMENT_CLOSED event should be published");
        Assert.assertFalse(changeBuffer.hasChanges(uri), "ChangeBuffer should be empty after didClose");
    }

    /**
     * Verifies that didClose removes the version counter, so re-open starts at version 1.
     */
    @Test
    public void didClose_removesVersionCounter_reopenStartsAtVersion1() throws Exception {
        DocumentUri uri = createTestUri("main.bal");

        // Open with version 1
        service.didOpen(uri, "initial");

        // Change with version 2
        service.didChange(uri, List.of(new TextDocumentContentChangeEvent("change")));

        // Close - clears buffer and removes version counter
        service.didClose(uri);

        // Re-open - should start at version 1 again
        service.didOpen(uri, "new content");

        List<BufferedChange> drained = changeBuffer.drain(uri, ChangeLayer.EDITOR);
        Assert.assertEquals(drained.size(), 1, "Should have only the new open change");
        Assert.assertEquals(drained.get(0).version().value(), 1, "Re-open should start at version 1");
    }

    // =========================================================================
    // Full Lifecycle Test
    // =========================================================================

    /**
     * Verifies the full lifecycle: open → change → close publishes all events in order.
     */
    @Test
    public void fullLifecycle_openChangeClose_publishesAllEventsInOrder() throws Exception {
        DocumentUri uri = createTestUri("main.bal");
        List<EventKind> receivedEvents = new CopyOnWriteArrayList<>();
        CountDownLatch latch = new CountDownLatch(3);

        eventBus.subscribe("test-lifecycle", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_OPENED, EventKind.WM_DOCUMENT_CHANGED,
                        EventKind.WM_DOCUMENT_CLOSED),
                event -> {
                    receivedEvents.add(event.eventKind());
                    latch.countDown();
                });

        // didOpen
        service.didOpen(uri, "initial");

        // didChange
        service.didChange(uri, List.of(new TextDocumentContentChangeEvent("updated")));

        // didClose
        service.didClose(uri);

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS), "All three events should be published");
        Assert.assertEquals(receivedEvents.size(), 3, "Should receive exactly 3 events");
        Assert.assertEquals(receivedEvents.get(0), EventKind.WM_DOCUMENT_OPENED,
                "First event should be WM_DOCUMENT_OPENED");
        Assert.assertEquals(receivedEvents.get(1), EventKind.WM_DOCUMENT_CHANGED,
                "Second event should be WM_DOCUMENT_CHANGED");
        Assert.assertEquals(receivedEvents.get(2), EventKind.WM_DOCUMENT_CLOSED,
                "Third event should be WM_DOCUMENT_CLOSED");
    }

    // =========================================================================
    // Error Cases - Graceful No-Ops
    // =========================================================================

    /**
     * Verifies that didChange on an unopened document is a graceful no-op.
     *
     * <p>Note: Observability for this edge case may be added in future work.
     */
    @Test
    public void didChange_onUnopenedDocument_isGracefulNoOp() throws Exception {
        DocumentUri uri = createTestUri("unopened.bal");
        AtomicInteger eventCount = new AtomicInteger(0);

        eventBus.subscribe("test-unopened-change", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_CHANGED), e -> eventCount.incrementAndGet());

        // didChange without didOpen - should be graceful, no exception
        service.didChange(uri, List.of(new TextDocumentContentChangeEvent("orphan change")));

        // Wait briefly for any potential async events
        Thread.sleep(100);

        // The change is accepted into the buffer (no pre-validation)
        Assert.assertTrue(changeBuffer.hasChanges(uri),
                "ChangeBuffer accepts the change (no pre-validation of open state)");

        // An event IS published by ProjectServiceImpl.didChange - verify it was received
        Assert.assertEquals(eventCount.get(), 1,
                "WM_DOCUMENT_CHANGED event should be published even for unopened document");

        // TODO: Add observability tracking to distinguish didChange on unopened vs opened documents
    }

    /**
     * Verifies that didClose on an already-closed document is a graceful no-op.
     *
     * <p>Note: Observability for this edge case may be added in future work.
     */
    @Test
    public void didClose_onAlreadyClosedDocument_isGracefulNoOp() throws Exception {
        DocumentUri uri = createTestUri("doubleclose.bal");
        List<EventKind> receivedEvents = new CopyOnWriteArrayList<>();

        eventBus.subscribe("test-double-close", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_CLOSED), e -> receivedEvents.add(e.eventKind()));

        // Open and close normally
        service.didOpen(uri, "content");
        service.didClose(uri);

        Assert.assertFalse(changeBuffer.hasChanges(uri), "Buffer should be empty after first close");

        // Wait for first close event
        Thread.sleep(100);
        int firstCloseEventCount = receivedEvents.size();

        // Second close - should be a graceful no-op
        service.didClose(uri);

        // Wait for any potential second event
        Thread.sleep(100);

        // No exception should be thrown
        Assert.assertFalse(changeBuffer.hasChanges(uri),
                "Buffer should still be empty after second close");

        // Second close also publishes an event (current implementation)
        // This test documents the behavior
        Assert.assertEquals(receivedEvents.size(), firstCloseEventCount + 1,
                "Second close also publishes WM_DOCUMENT_CLOSED event");

        // TODO: Add observability tracking for double-close operations
    }

    // =========================================================================
    // Helper Methods
    // =========================================================================

    private DocumentUri createTestUri(String fileName) {
        URI fileUri = tempDir.resolve(fileName).toUri();
        return new DocumentUri.FileUri(fileUri);
    }
}
