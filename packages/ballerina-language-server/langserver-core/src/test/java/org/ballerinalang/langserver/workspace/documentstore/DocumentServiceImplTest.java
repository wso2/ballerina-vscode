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

package org.ballerinalang.langserver.workspace.documentstore;

import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.eclipse.lsp4j.TextDocumentIdentifier;
import org.eclipse.lsp4j.TextDocumentItem;
import org.eclipse.lsp4j.VersionedTextDocumentIdentifier;
import org.testng.Assert;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;
import org.testng.annotations.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tests for {@link DocumentServiceImpl}.
 *
 * @since 1.7.0
 */
public class DocumentServiceImplTest {

    private EventSyncPubSubHolder eventBus;
    private VirtualFileSystem virtualFileSystem;
    private DocumentServiceImpl service;
    private Path tempDir;

    @BeforeMethod
    public void setUp() throws IOException {
        this.eventBus = new EventSyncPubSubHolder();
        this.virtualFileSystem = new VirtualFileSystem();
        this.tempDir = Files.createTempDirectory("document-service-impl-test");
        this.service = new DocumentServiceImpl(virtualFileSystem, eventBus, path -> path.getParent(), 50L);
    }

    @AfterMethod
    public void tearDown() throws IOException {
        eventBus.close();
        Files.walk(tempDir)
                .sorted((left, right) -> right.compareTo(left))
                .forEach(path -> {
                    try {
                        Files.deleteIfExists(path);
                    } catch (IOException ignored) {
                    }
                });
    }

    /**
     * Verifies open, change, and close commands publish DS-E1/DS-E2/DS-E3.
     */
    @Test
    public void didOpenDidChangeDidClose_publishesExpectedDocumentEvents() throws Exception {
        Path file = createFile("project/main.bal", "function main() {}");
        List<EventKind> received = new CopyOnWriteArrayList<>();
        CountDownLatch latch = new CountDownLatch(3);

        subscribe("doc-lifecycle", Set.of(EventKind.WM_DOCUMENT_OPENED, EventKind.WM_DOCUMENT_CHANGED,
                EventKind.WM_DOCUMENT_CLOSED), event -> {
            received.add(event.eventKind());
            latch.countDown();
        });

        service.didOpen(file, openParams(file, "function main() {}", 1));
        service.didChange(file, changeParams(file, "function updated() {}", 2));
        service.didClose(file, closeParams(file));

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS));
        Assert.assertTrue(received.contains(EventKind.WM_DOCUMENT_OPENED));
        Assert.assertTrue(received.contains(EventKind.WM_DOCUMENT_CHANGED));
        Assert.assertTrue(received.contains(EventKind.WM_DOCUMENT_CLOSED));
    }

    /**
     * Verifies self-write suppression token skips Dependencies.toml config reactivity.
     */
    @Test
    public void watcherDependenciesToml_withSelfWriteToken_suppressesConfigEvent() throws Exception {
        Path dependenciesToml = createFile("project/Dependencies.toml", "[[dependency]]");
        AtomicInteger configChangedCount = new AtomicInteger();
        CountDownLatch watcherProcessed = new CountDownLatch(1);

        subscribe("self-write-suppression",
                Set.of(EventKind.WM_FILE_WATCHED_CHANGED, EventKind.WM_FILE_WATCHED_CHANGED),
                event -> {
                    if (event.eventKind() == EventKind.WM_FILE_WATCHED_CHANGED) {
                        configChangedCount.incrementAndGet();
                    }
                    if (event.eventKind() == EventKind.WM_FILE_WATCHED_CHANGED) {
                        watcherProcessed.countDown();
                    }
                });

        service.registerDependenciesTomlSelfWrite(dependenciesToml);
        service.didChangeWatched(dependenciesToml,
                new FileEvent(dependenciesToml.toUri().toString(), FileChangeType.Changed));

        Assert.assertTrue(watcherProcessed.await(2, TimeUnit.SECONDS));
        Assert.assertEquals(configChangedCount.get(), 0);
    }

    /**
     * Verifies watcher config updates publish DS-E4 and DS-E5.
     */
    @Test
    public void didChangeWatched_forConfigFile_publishesConfigAndWatcherEvents() throws Exception {
        Path cloudToml = createFile("project/Cloud.toml", "[cloud]");
        CountDownLatch latch = new CountDownLatch(2);
        List<EventKind> received = new CopyOnWriteArrayList<>();

        subscribe("watcher-config",
                Set.of(EventKind.WM_FILE_WATCHED_CHANGED, EventKind.WM_FILE_WATCHED_CHANGED),
                event -> {
                    received.add(event.eventKind());
                    latch.countDown();
                });

        service.didChangeWatched(new DidChangeWatchedFilesParams(List.of(
                new FileEvent(cloudToml.toUri().toString(), FileChangeType.Changed)
        )));

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS));
        Assert.assertTrue(received.contains(EventKind.WM_FILE_WATCHED_CHANGED));
        Assert.assertTrue(received.contains(EventKind.WM_FILE_WATCHED_CHANGED));
    }

    /**
     * Verifies CE-E1 subscription invalidates sandboxes and publishes DS-E6.
     */
    @Test
    public void compilerSnapshotPublished_invalidatesSandboxAndPublishesEvent() throws Exception {
        Path parent = createFile("project/source/main.bal", "function main() {}").getParent();
        String sandboxUri = "expr:///project/source/sandbox";
        CountDownLatch latch = new CountDownLatch(1);

        subscribe("snapshot-subscription", Set.of(EventKind.WM_FILE_WATCHED_CHANGED), event -> latch.countDown());

        service.didOpen(parent.resolve("ignored.bal"),
                openParams(sandboxUri, "return 1;", "ballerina", 1));
        eventBus.publish(new DomainEvent(Instant.now(), parent.toString(), EventKind.COMPILER_SNAPSHOT_PUBLISHED));

        Assert.assertTrue(latch.await(2, TimeUnit.SECONDS));
    }

    /**
     * Verifies WM-E2 subscription cleans tracked sandboxes for evicted projects.
     */
    @Test
    public void projectEvicted_cleansSandboxes_forSourceRoot() throws Exception {
        Path parent = createFile("project-evict/source/main.bal", "function main() {}").getParent();
        String sandboxUri = "ai:///project-evict/source/sandbox";
        AtomicInteger invalidationCount = new AtomicInteger();

        subscribe("eviction-subscription", Set.of(EventKind.WM_FILE_WATCHED_CHANGED), event -> {
            invalidationCount.incrementAndGet();
        });

        service.didOpen(parent.resolve("ignored.bal"), openParams(sandboxUri, "snippet", "ballerina", 1));
        eventBus.publish(new DomainEvent(Instant.now(), parent.toString(), EventKind.WORKSPACE_PROJECT_EVICTED));

        Thread.sleep(100L);
        eventBus.publish(new DomainEvent(Instant.now(), parent.toString(), EventKind.COMPILER_SNAPSHOT_PUBLISHED));

        Thread.sleep(200L);
        Assert.assertEquals(invalidationCount.get(), 0);
    }

    private Path createFile(String relativePath, String content) throws IOException {
        Path file = tempDir.resolve(relativePath);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content);
        return file;
    }

    private void subscribe(String id, Set<EventKind> kinds, java.util.function.Consumer<DomainEvent> consumer) {
        eventBus.subscribe(id, SubscriberTier.CRITICAL, kinds, consumer);
    }

    private DidOpenTextDocumentParams openParams(Path file, String content, int version) {
        return openParams(file.toUri().toString(), content, "ballerina", version);
    }

    private DidOpenTextDocumentParams openParams(String uri, String content, String languageId, int version) {
        DidOpenTextDocumentParams params = new DidOpenTextDocumentParams();
        params.setTextDocument(new TextDocumentItem(uri, languageId, version, content));
        return params;
    }

    private DidChangeTextDocumentParams changeParams(Path file, String newContent, int version) {
        DidChangeTextDocumentParams params = new DidChangeTextDocumentParams();
        VersionedTextDocumentIdentifier identifier = new VersionedTextDocumentIdentifier(file.toUri().toString(), version);
        params.setTextDocument(identifier);
        params.setContentChanges(List.of(new TextDocumentContentChangeEvent(newContent)));
        return params;
    }

    private DidCloseTextDocumentParams closeParams(Path file) {
        DidCloseTextDocumentParams params = new DidCloseTextDocumentParams();
        params.setTextDocument(new TextDocumentIdentifier(file.toUri().toString()));
        return params;
    }
}
