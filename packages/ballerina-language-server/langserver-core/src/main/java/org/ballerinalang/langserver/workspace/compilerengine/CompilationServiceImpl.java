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

import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureLevel;
import org.ballerinalang.langserver.workspace.workspacemanager.LockingMode;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.annotation.Nonnull;

/**
 * Service entry point for the compilation engine, managing per-project pipelines and circuit breaker.
 *
 * <p>Handles stable snapshot queries and manages the lifecycle of per-project
 * CompilationPipeline instances in response to workspace and document events.
 * Implements a circuit breaker pattern per ADR-033 to prevent recovery loops on transient failures.
 *
 * @since 1.7.0
 */
public class CompilationServiceImpl implements CompilationService, AutoCloseable {

    private static final Logger LOG = Logger.getLogger(CompilationServiceImpl.class.getName());

    private final DualSnapshotStore snapshotStore;
    private final EventSyncPubSubHolder eventBus;
    private final CompilationPipeline.CompilationAction baseAction;
    private final long retryDelayMs;
    private final long heapPressureThrottleMs;
    private final ScheduledExecutorService retryScheduler;
    private final Map<SourceRoot, CompilationPipeline> pipelines;
    private final Map<SourceRoot, CircuitBreakerAction> circuitActions;
    private final Map<SourceRoot, ScheduledFuture<?>> throttledRequests;
    private final AtomicInteger versionCounter;
    private final AtomicLong throttledUntilNanos;
    private final AtomicBoolean closed;

    /**
     * Creates a compilation service with default retry delay (500ms).
     *
     * @param snapshotStore snapshot store for publishing compiled snapshots
     * @param eventBus event bus for publishing/subscribing to domain events
     * @param baseAction the underlying compilation action to wrap with circuit breaker
     */
    public CompilationServiceImpl(DualSnapshotStore snapshotStore, EventSyncPubSubHolder eventBus,
                                  CompilationPipeline.CompilationAction baseAction) {
        this(snapshotStore, eventBus, baseAction, 500L, 250L);
    }

    /**
     * Creates a compilation service with configurable retry delay.
     *
     * @param snapshotStore snapshot store for publishing compiled snapshots
     * @param eventBus event bus for publishing/subscribing to domain events
     * @param baseAction the underlying compilation action to wrap with circuit breaker
     * @param retryDelayMs delay in milliseconds before retrying a transient failure
     */
    public CompilationServiceImpl(DualSnapshotStore snapshotStore, EventSyncPubSubHolder eventBus,
                                  CompilationPipeline.CompilationAction baseAction, long retryDelayMs) {
        this(snapshotStore, eventBus, baseAction, retryDelayMs, 250L);
    }

    /**
     * Creates a compilation service with configurable retry delay and RM-E1 throttle window.
     *
     * @param snapshotStore snapshot store for publishing compiled snapshots
     * @param eventBus event bus for publishing/subscribing to domain events
     * @param baseAction the underlying compilation action to wrap with circuit breaker
     * @param retryDelayMs delay in milliseconds before retrying a transient failure
     * @param heapPressureThrottleMs delay in milliseconds to defer document-triggered recompilation after RM-E1
     */
    public CompilationServiceImpl(@Nonnull DualSnapshotStore snapshotStore, @Nonnull EventSyncPubSubHolder eventBus,
                                  @Nonnull CompilationPipeline.CompilationAction baseAction, long retryDelayMs,
                                  long heapPressureThrottleMs) {
        this.snapshotStore = snapshotStore;
        this.eventBus = eventBus;
        this.baseAction = baseAction;
        this.retryDelayMs = retryDelayMs;
        this.heapPressureThrottleMs = heapPressureThrottleMs;
        this.pipelines = new ConcurrentHashMap<>();
        this.circuitActions = new ConcurrentHashMap<>();
        this.throttledRequests = new ConcurrentHashMap<>();
        this.versionCounter = new AtomicInteger(0);
        this.throttledUntilNanos = new AtomicLong(0L);
        this.closed = new AtomicBoolean(false);
        this.retryScheduler = Executors.newScheduledThreadPool(1, r -> {
            Thread t = new Thread(r, "ce-retry-scheduler");
            t.setDaemon(true);
            return t;
        });

        subscribeToEvents();
    }

    @Override
    public StableSnapshot stableSnapshot(@Nonnull Path path, CancelChecker cancelChecker) {
        Optional<SourceRoot> sourceRoot = findSourceRoot(path);
        if (sourceRoot.isEmpty()) {
            return null;
        }
        StableSnapshot stableSnapshot = snapshotStore.getStable(sourceRoot.get());
        if (stableSnapshot != null) {
            return stableSnapshot;
        }
        return awaitInProgress(sourceRoot.get(), cancelChecker);
    }

    @Override
    public SnapshotView latestSnapshot(@Nonnull Path path, CancelChecker cancelChecker) {
        Optional<SourceRoot> sourceRoot = findSourceRoot(path);
        if (sourceRoot.isEmpty()) {
            return null;
        }
        InProgressSnapshot inProgressSnapshot = snapshotStore.getInProgress(sourceRoot.get());
        if (inProgressSnapshot != null) {
            return inProgressSnapshot;
        }
        return snapshotStore.getStable(sourceRoot.get());
    }

    @Override
    public void close() {
        if (!closed.compareAndSet(false, true)) {
            return;
        }
        pipelines.values().forEach(CompilationPipeline::close);
        pipelines.keySet().forEach(snapshotStore::remove);
        throttledRequests.values().forEach(future -> future.cancel(false));
        pipelines.clear();
        circuitActions.clear();
        throttledRequests.clear();
        retryScheduler.shutdownNow();
    }

    // ---- Private Methods ----

    private void subscribeToEvents() {
        eventBus.subscribe("ce-workspace-events", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED,
                       EventKind.WORKSPACE_PROJECT_EVICTED,
                       EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED),
                this::handleWorkspaceEvent);

        eventBus.subscribe("ce-document-events", SubscriberTier.COALESCEABLE,
                Set.of(EventKind.WM_DOCUMENT_OPENED,
                       EventKind.WM_DOCUMENT_CHANGED,
                       EventKind.WM_FILE_WATCHED_CHANGED),
                this::handleDocumentEvent);

        eventBus.subscribe("ce-heap-pressure-events", SubscriberTier.CRITICAL,
                Set.of(EventKind.RM_E1_HEAP_PRESSURE_DETECTED), this::handleHeapPressureEvent);
    }

    private void handleWorkspaceEvent(DomainEvent event) {
        SourceRoot sourceRoot = reconstructSourceRoot(event);
        System.err.println("[CE] Workspace event: " + event.eventKind() + " for " + sourceRoot.path());

        switch (event.eventKind()) {
            case WORKSPACE_PROJECT_REGISTERED -> {
                System.err.println("[CE] Creating pipeline for: " + sourceRoot.path());
                createPipelineIfAbsent(sourceRoot);
            }
            case WORKSPACE_PROJECT_EVICTED -> evictPipeline(sourceRoot);
            case WORKSPACE_PROJECT_KIND_TRANSITIONED -> {
                evictPipeline(sourceRoot);
                createPipelineIfAbsent(sourceRoot);
            }
            default -> {
                // No-op for unexpected event kinds
            }
        }
    }

    private void handleDocumentEvent(DomainEvent event) {
        switch (event.eventKind()) {
            case WM_DOCUMENT_OPENED -> handleDocumentOpened(event);
            case WM_DOCUMENT_CHANGED -> handleDocumentChanged(event);
            case WM_FILE_WATCHED_CHANGED -> handleFileWatchedChanged(event);
            default -> {
                // No-op for unexpected event kinds
            }
        }
    }

    private void handleDocumentOpened(DomainEvent event) {
        handleDocumentChanged(event);
    }

    private void handleDocumentChanged(DomainEvent event) {
        SourceRoot sourceRoot = reconstructSourceRoot(event);
        requestCompilationWithThrottle(sourceRoot);
    }

    private void handleFileWatchedChanged(DomainEvent event) {
        SourceRoot sourceRoot = reconstructSourceRoot(event);
        if (isDependencyGraphChange(event.coalesceScope())) {
            requestCompilationWithThrottle(sourceRoot);
        }
        // "CONFIGURATION" scope is ignored
    }

    private void handleHeapPressureEvent(DomainEvent event) {
        if (heapPressureThrottleMs <= 0) {
            return;
        }
        HeapPressureLevel level = parseHeapPressureLevel(event.coalesceScope());
        switch (level) {
            case WARNING, CRITICAL, EMERGENCY ->
                    throttledUntilNanos.set(System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(heapPressureThrottleMs));
            case NORMAL -> throttledUntilNanos.set(0L);
        }
    }

    private void requestCompilationWithThrottle(SourceRoot sourceRoot) {
        CompilationPipeline pipeline = pipelines.get(sourceRoot);
        if (pipeline == null) {
            return;
        }

        long delayNanos = throttledUntilNanos.get() - System.nanoTime();
        if (delayNanos <= 0) {
            cancelThrottledRequest(sourceRoot);
            requestCompilation(pipeline);
            return;
        }

        ScheduledFuture<?> existing = throttledRequests.remove(sourceRoot);
        if (existing != null) {
            existing.cancel(false);
        }

        ScheduledFuture<?> scheduled = retryScheduler.schedule(() -> {
            throttledRequests.remove(sourceRoot);
            CompilationPipeline activePipeline = pipelines.get(sourceRoot);
            if (activePipeline != null && !closed.get()) {
                requestCompilation(activePipeline);
            }
        }, TimeUnit.NANOSECONDS.toMillis(delayNanos), TimeUnit.MILLISECONDS);
        throttledRequests.put(sourceRoot, scheduled);
    }

    private void requestCompilation(CompilationPipeline pipeline) {
        ContentVersion nextVersion = new ContentVersion(versionCounter.getAndIncrement());
        pipeline.requestCompilation(nextVersion);
    }

    private void cancelThrottledRequest(SourceRoot sourceRoot) {
        ScheduledFuture<?> pendingRequest = throttledRequests.remove(sourceRoot);
        if (pendingRequest != null) {
            pendingRequest.cancel(false);
        }
    }

    private HeapPressureLevel parseHeapPressureLevel(String scope) {
        try {
            return HeapPressureLevel.valueOf(scope);
        } catch (IllegalArgumentException ex) {
            LOG.log(Level.FINE, "Unknown heap pressure level: {0}", scope);
            return HeapPressureLevel.NORMAL;
        }
    }

    private void createPipelineIfAbsent(SourceRoot sourceRoot) {
        if (pipelines.containsKey(sourceRoot)) {
            System.err.println("[CE] Pipeline already exists for: " + sourceRoot.path());
            return;
        }
        System.err.println("[CE] Creating new pipeline for: " + sourceRoot.path());
        CircuitBreakerAction circuitAction = new CircuitBreakerAction(sourceRoot);
        CompilationPipeline pipeline = new CompilationPipeline(sourceRoot, snapshotStore, eventBus, circuitAction);
        CompilationPipeline existing = pipelines.putIfAbsent(sourceRoot, pipeline);
        if (existing != null) {
            System.err.println("[CE] Pipeline race condition for: " + sourceRoot.path());
            pipeline.close();
            return;
        }
        circuitActions.put(sourceRoot, circuitAction);
        System.err.println("[CE] Requesting compilation for: " + sourceRoot.path());
        pipeline.requestCompilation(new ContentVersion(versionCounter.getAndIncrement()));
    }

    private void evictPipeline(SourceRoot sourceRoot) {
        CompilationPipeline pipeline = pipelines.remove(sourceRoot);
        circuitActions.remove(sourceRoot);
        ScheduledFuture<?> pendingRequest = throttledRequests.remove(sourceRoot);
        if (pendingRequest != null) {
            pendingRequest.cancel(false);
        }
        if (pipeline != null) {
            pipeline.close();
            snapshotStore.remove(sourceRoot);
        }
    }

    private Optional<SourceRoot> findSourceRoot(Path path) {
        return pipelines.keySet().stream()
                .filter(sr -> path.startsWith(sr.path()))
                .findFirst();
    }

    private StableSnapshot awaitInProgress(SourceRoot sourceRoot, CancelChecker cancelChecker) {
        InProgressSnapshot inProgressSnapshot = snapshotStore.getInProgress(sourceRoot);
        if (!(inProgressSnapshot instanceof DualSnapshotStore.StoreInProgressSnapshot storeInProgress)) {
            return null;
        }
        while (true) {
            if (cancelChecker != null) {
                cancelChecker.checkCanceled();
            }
            try {
                return storeInProgress.publishedStableSnapshot().get(50, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                // Keep waiting until the next stable snapshot is published.
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            } catch (ExecutionException e) {
                return null;
            }
        }
    }

    private SourceRoot reconstructSourceRoot(DomainEvent event) {
        return new SourceRoot(Path.of(event.sourceContext()).normalize());
    }

    private boolean isDependencyGraphChange(String scope) {
        return "DEPENDENCY_GRAPH".equals(scope) || scope.contains("|DEPENDENCY_GRAPH|");
    }

    // ---- Inner Class: CircuitBreakerAction ----

    /**
     * Wraps the base compilation action with retry/circuit-breaker logic per ADR-033.
     *
     * <p>Classifies failures into TRANSIENT (retryable), PERSISTENT (user fix required),
     * and FATAL (compiler bug). Retries once on TRANSIENT; opens circuit and emits
     * CE-E6 (recovery exhausted) otherwise.
     */
    private class CircuitBreakerAction implements CompilationPipeline.CompilationAction {

        private final SourceRoot sourceRoot;
        private final AtomicInteger retryCount;
        private final AtomicBoolean circuitOpen;
        private volatile ScheduledFuture<?> retryTask;

        CircuitBreakerAction(SourceRoot sourceRoot) {
            this.sourceRoot = sourceRoot;
            this.retryCount = new AtomicInteger(0);
            this.circuitOpen = new AtomicBoolean(false);
        }

        @Override
        public ResolutionResult resolve(CompileTask task) throws Exception {
            return baseAction.resolve(task);
        }

        @Override
        public StableSnapshot compile(CompileTask task) throws Exception {
            if (circuitOpen.get()) {
                throw new IllegalStateException("Circuit breaker is open for " + sourceRoot);
            }

            try {
                StableSnapshot result = baseAction.compile(task);
                retryCount.set(0);
                return result;
            } catch (Throwable e) {
                FailureClass failureClass = classifyFailure(e);
                scheduleRetryOrOpenCircuit(failureClass);
                if (e instanceof Exception) {
                    throw (Exception) e;
                } else {
                    throw new RuntimeException(e);
                }
            }
        }

        @Override
        public LockingMode currentLockingMode(CompileTask task) {
            return baseAction.currentLockingMode(task);
        }

        @Override
        public CompilationPipeline.RecoveryResult recover(CompileTask task, LockingMode initialMode,
                                                          Throwable cause) throws Exception {
            return baseAction.recover(task, initialMode, cause);
        }

        boolean isOpen() {
            return circuitOpen.get();
        }

        void reset() {
            circuitOpen.set(false);
            retryCount.set(0);
            if (retryTask != null) {
                retryTask.cancel(false);
                retryTask = null;
            }
        }

        private void scheduleRetryOrOpenCircuit(FailureClass failureClass) {
            if (failureClass == FailureClass.TRANSIENT && retryCount.getAndIncrement() < 1) {
                // Schedule a retry for the next compilation request
                CompilationPipeline pipeline = pipelines.get(sourceRoot);
                if (pipeline != null) {
                    retryTask = retryScheduler.schedule(() -> {
                        ContentVersion nextVersion = new ContentVersion(versionCounter.getAndIncrement());
                        pipeline.requestCompilation(nextVersion);
                    }, retryDelayMs, TimeUnit.MILLISECONDS);
                }
            } else {
                // Open circuit and emit recovery exhausted event
                circuitOpen.set(true);
                emitRecoveryExhausted();
            }
        }

        private void emitRecoveryExhausted() {
            try {
                DomainEvent event = new DomainEvent(Instant.now(), sourceRoot.path().toString(),
                        EventKind.CE_RESOLUTION_EXHAUSTED);
                eventBus.publish(event);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Failed to emit CE-E6 for " + sourceRoot, e);
            }
        }

        private FailureClass classifyFailure(Throwable e) {
            if (e instanceof java.io.IOException) {
                return FailureClass.TRANSIENT;
            } else if (e instanceof IllegalArgumentException || e instanceof IllegalStateException) {
                return FailureClass.PERSISTENT;
            } else {
                return FailureClass.FATAL;
            }
        }
    }
}
