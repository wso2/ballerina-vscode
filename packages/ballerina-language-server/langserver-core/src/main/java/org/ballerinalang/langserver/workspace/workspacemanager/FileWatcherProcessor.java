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

import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.documentstore.VirtualFileSystem;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;

import java.net.URI;
import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;

/**
 * Debounced file watcher event processor with per-event fault tolerance.
 *
 * @since 1.7.0
 */
public final class FileWatcherProcessor {

    /**
     * Functional callback for handling one resolved file watcher event.
     *
     * @since 1.7.0
     */
    @FunctionalInterface
    public interface WatchEventHandler {

        /**
         * Handles one watcher event.
         *
         * @param projectRoot pre-computed project root
         * @param filePath changed file path
         * @param changeType watcher change type
         */
        void handle(Path projectRoot, Path filePath, FileChangeType changeType);
    }

    /**
     * Default debounce window for watched file notifications.
     */
    public static final long DEFAULT_DEBOUNCE_MILLIS = 150L;

    private static final int MAX_PENDING_EVENTS = 4096;

    private final VirtualFileSystem virtualFileSystem;
    private final Function<Path, Path> projectRootResolver;
    private final WatchEventHandler watchEventHandler;
    private final long debounceMillis;
    private final ScheduledExecutorService scheduler;

    private final ReentrantLock queueLock = new ReentrantLock();
    private final ArrayDeque<FileEvent> pendingEvents = new ArrayDeque<>();
    private final AtomicInteger processedBatchCount = new AtomicInteger();
    private ScheduledFuture<?> scheduledFlush;

    /**
     * Creates a file watcher processor with a 150ms debounce window.
     *
     * @param virtualFileSystem virtual file system for overlay checks
     * @param projectRootResolver function resolving project root from a file path
     * @param watchEventHandler per-event handler
     */
    public FileWatcherProcessor(VirtualFileSystem virtualFileSystem, Function<Path, Path> projectRootResolver,
                                WatchEventHandler watchEventHandler) {
        this(virtualFileSystem, projectRootResolver, watchEventHandler, DEFAULT_DEBOUNCE_MILLIS);
    }

    /**
     * Creates a file watcher processor with a custom debounce window.
     *
     * @param virtualFileSystem virtual file system for overlay checks
     * @param projectRootResolver function resolving project root from a file path
     * @param watchEventHandler per-event handler
     * @param debounceMillis debounce window in milliseconds
     */
    public FileWatcherProcessor(VirtualFileSystem virtualFileSystem, Function<Path, Path> projectRootResolver,
                                WatchEventHandler watchEventHandler, long debounceMillis) {
        this.virtualFileSystem = Objects.requireNonNull(virtualFileSystem, "virtualFileSystem must not be null");
        this.projectRootResolver = Objects.requireNonNull(projectRootResolver, "projectRootResolver must not be null");
        this.watchEventHandler = Objects.requireNonNull(watchEventHandler, "watchEventHandler must not be null");
        if (debounceMillis <= 0) {
            throw new IllegalArgumentException("debounceMillis must be positive");
        }
        this.debounceMillis = debounceMillis;
        this.scheduler = Executors.newSingleThreadScheduledExecutor();
    }

    /**
     * Submits a file watcher event for debounced processing.
     *
     * @param event file event
     */
    public void submit(FileEvent event) {
        Objects.requireNonNull(event, "event must not be null");
        queueLock.lock();
        try {
            if (pendingEvents.size() >= MAX_PENDING_EVENTS) {
                pendingEvents.removeFirst();
            }
            pendingEvents.addLast(event);

            if (scheduledFlush != null) {
                scheduledFlush.cancel(false);
            }
            scheduledFlush = scheduler.schedule(this::flushSafely, debounceMillis, TimeUnit.MILLISECONDS);
        } finally {
            queueLock.unlock();
        }
    }

    /**
     * Returns the number of processed batches.
     *
     * @return processed batch count
     */
    public int processedBatchCount() {
        return processedBatchCount.get();
    }

    /**
     * Stops the internal scheduler.
     */
    public void shutdown() {
        scheduler.shutdownNow();
    }

    private void flushSafely() {
        try {
            flush();
        } catch (RuntimeException ignored) {
            // Per-event fault tolerance is handled in processing. Unexpected errors are isolated to this flush.
        }
    }

    private void flush() {
        List<FileEvent> batch = new ArrayList<>();

        queueLock.lock();
        try {
            while (!pendingEvents.isEmpty()) {
                batch.add(pendingEvents.removeFirst());
            }
            scheduledFlush = null;
        } finally {
            queueLock.unlock();
        }

        if (batch.isEmpty()) {
            return;
        }

        // Pre-compute project roots before dispatching handlers.
        List<ResolvedEvent> resolvedEvents = precomputeProjectRoots(batch);
        processedBatchCount.incrementAndGet();

        for (ResolvedEvent resolvedEvent : resolvedEvents) {
            try {
                if (isOverlaid(resolvedEvent.filePath())) {
                    continue;
                }
                watchEventHandler.handle(resolvedEvent.projectRoot(), resolvedEvent.filePath(), resolvedEvent.changeType());
            } catch (RuntimeException ignored) {
                // Per-event fault tolerance: one bad event must not abort the batch.
            }
        }
    }

    private List<ResolvedEvent> precomputeProjectRoots(List<FileEvent> batch) {
        Map<Path, List<ResolvedEvent>> rootToEvents = new LinkedHashMap<>();

        for (FileEvent event : batch) {
            try {
                Path filePath = extractFilePath(event);
                if (filePath == null) {
                    continue;
                }
                Path projectRoot = projectRootResolver.apply(filePath);
                if (projectRoot == null) {
                    continue;
                }

                FileChangeType changeType = event.getType();
                ResolvedEvent resolvedEvent = new ResolvedEvent(projectRoot, filePath, changeType);
                rootToEvents.computeIfAbsent(projectRoot, ignored -> new ArrayList<>()).add(resolvedEvent);
            } catch (RuntimeException ignored) {
                // Skip this event and continue processing siblings.
            }
        }

        List<ResolvedEvent> resolvedEvents = new ArrayList<>();
        for (List<ResolvedEvent> eventList : rootToEvents.values()) {
            resolvedEvents.addAll(eventList);
        }
        return resolvedEvents;
    }

    private boolean isOverlaid(Path filePath) {
        DocumentUri fileUri = new DocumentUri.FileUri(filePath.toUri());
        return virtualFileSystem.isOverlaid(fileUri);
    }

    private Path extractFilePath(FileEvent event) {
        String uriString = event.getUri();
        if (uriString == null) {
            return null;
        }

        URI uri = URI.create(uriString);
        if (!"file".equals(uri.getScheme())) {
            return null;
        }
        return Path.of(uri);
    }

    private record ResolvedEvent(Path projectRoot, Path filePath, FileChangeType changeType) {
    }
}
