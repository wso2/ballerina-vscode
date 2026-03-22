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

import io.ballerina.projects.PackageDescriptor;
import io.ballerina.projects.Project;
import org.ballerinalang.langserver.workspace.compilerengine.revovery.FailureClass;
import org.ballerinalang.langserver.workspace.compilerengine.revovery.ResolutionResult;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.InProgressSnapshot;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.SnapshotView;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.StableSnapshot;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ContentVersion;
import org.ballerinalang.langserver.workspace.eventbus.event.CompilerEvent;
import org.ballerinalang.langserver.workspace.eventbus.event.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.event.HeapPressureEvent;
import org.ballerinalang.langserver.workspace.eventbus.event.ProjectEvent;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.workspacemanager.LockingMode;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.UriResolver;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;

import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.Semaphore;
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
    private final Semaphore compilationPermits;
    private final ScheduledExecutorService retryScheduler;
    private final Map<CompilationKey, CompilationPipeline> pipelines;
    private final Map<CompilationKey, CircuitBreakerAction> circuitActions;
    private final Map<CompilationKey, ScheduledFuture<?>> throttledRequests;
    private final Map<String, Set<CompilationKey>> sourceRootIndex;
    private final AtomicInteger versionCounter;
    private final AtomicLong throttledUntilNanos;
    private final AtomicBoolean closed;

    /**
     * Creates a compilation service with default retry delay (500ms).
     *
     * @param snapshotStore snapshot store for publishing compiled snapshots
     * @param eventBus event bus for publishing/subscribing to domain events
     * @param projectService the project service
     */
    public CompilationServiceImpl(DualSnapshotStore snapshotStore, EventSyncPubSubHolder eventBus,
                                  ProjectServiceImpl projectService) {
        this(snapshotStore, eventBus, projectService, 500L, 250L);
    }

    /**
     * Creates a compilation service with configurable retry delay.
     *
     * @param snapshotStore snapshot store for publishing compiled snapshots
     * @param eventBus event bus for publishing/subscribing to domain events
     * @param projectService the project service
     * @param retryDelayMs delay in milliseconds before retrying a transient failure
     */
    public CompilationServiceImpl(DualSnapshotStore snapshotStore, EventSyncPubSubHolder eventBus,
                                  ProjectServiceImpl projectService, long retryDelayMs) {
        this(snapshotStore, eventBus, projectService, retryDelayMs, 250L);
    }

    /**
     * Creates a compilation service with configurable retry delay and RM-E1 throttle window.
     *
     * @param snapshotStore snapshot store for publishing compiled snapshots
     * @param eventBus event bus for publishing/subscribing to domain events
     * @param projectService the project service
     * @param retryDelayMs delay in milliseconds before retrying a transient failure
     * @param heapPressureThrottleMs delay in milliseconds to defer document-triggered recompilation after RM-E1
     */
    public CompilationServiceImpl(@Nonnull DualSnapshotStore snapshotStore, @Nonnull EventSyncPubSubHolder eventBus,
                                  @Nonnull ProjectServiceImpl projectService, long retryDelayMs,
                                  long heapPressureThrottleMs) {
        this(snapshotStore, eventBus, projectService, retryDelayMs, heapPressureThrottleMs,
                Runtime.getRuntime().availableProcessors());
    }

    /**
     * Creates a compilation service with configurable retry delay, RM-E1 throttle window, and concurrency limit.
     *
     * @param snapshotStore              snapshot store for publishing compiled snapshots
     * @param eventBus                   event bus for publishing/subscribing to domain events
     * @param projectService             the project service
     * @param retryDelayMs               delay in milliseconds before retrying a transient failure
     * @param heapPressureThrottleMs     delay in milliseconds to defer recompilation after RM-E1
     * @param maxConcurrentCompilations  maximum number of concurrent compilations across all pipelines; must be >= 1
     */
    public CompilationServiceImpl(@Nonnull DualSnapshotStore snapshotStore, @Nonnull EventSyncPubSubHolder eventBus,
                                  @Nonnull ProjectServiceImpl projectService, long retryDelayMs,
                                  long heapPressureThrottleMs, int maxConcurrentCompilations) {
        this(snapshotStore, eventBus, new CompilationActionImpl(projectService), retryDelayMs,
                heapPressureThrottleMs, buildSemaphore(maxConcurrentCompilations));
    }

    /**
     * Test constructor: uses a custom compilation action with default retry settings.
     *
     * @param snapshotStore     snapshot store for publishing compiled snapshots
     * @param eventBus          event bus for publishing/subscribing to domain events
     * @param compilationAction the compilation strategy (typically a test double)
     * @param retryDelayMs      delay in milliseconds before retrying a transient failure
     */
    public CompilationServiceImpl(@Nonnull DualSnapshotStore snapshotStore, @Nonnull EventSyncPubSubHolder eventBus,
                                  @Nonnull CompilationPipeline.CompilationAction compilationAction,
                                  long retryDelayMs) {
        this(snapshotStore, eventBus, compilationAction, retryDelayMs, 250L);
    }

    /**
     * Test constructor: uses a custom compilation action with explicit retry and throttle settings.
     *
     * @param snapshotStore          snapshot store for publishing compiled snapshots
     * @param eventBus               event bus for publishing/subscribing to domain events
     * @param compilationAction      the compilation strategy (typically a test double)
     * @param retryDelayMs           delay in milliseconds before retrying a transient failure
     * @param heapPressureThrottleMs delay in milliseconds to defer recompilation after RM-E1
     */
    public CompilationServiceImpl(@Nonnull DualSnapshotStore snapshotStore, @Nonnull EventSyncPubSubHolder eventBus,
                                  @Nonnull CompilationPipeline.CompilationAction compilationAction,
                                  long retryDelayMs, long heapPressureThrottleMs) {
        this(snapshotStore, eventBus, compilationAction, retryDelayMs, heapPressureThrottleMs,
                new Semaphore(Integer.MAX_VALUE, false));
    }

    /**
     * Test constructor: uses a custom compilation action with explicit retry, throttle, and concurrency limit.
     *
     * @param snapshotStore              snapshot store for publishing compiled snapshots
     * @param eventBus                   event bus for publishing/subscribing to domain events
     * @param compilationAction          the compilation strategy (typically a test double)
     * @param retryDelayMs               delay in milliseconds before retrying a transient failure
     * @param heapPressureThrottleMs     delay in milliseconds to defer recompilation after RM-E1
     * @param maxConcurrentCompilations  maximum number of concurrent compilations across all pipelines; must be >= 1
     */
    public CompilationServiceImpl(@Nonnull DualSnapshotStore snapshotStore, @Nonnull EventSyncPubSubHolder eventBus,
                                  @Nonnull CompilationPipeline.CompilationAction compilationAction,
                                  long retryDelayMs, long heapPressureThrottleMs, int maxConcurrentCompilations) {
        this(snapshotStore, eventBus, compilationAction, retryDelayMs, heapPressureThrottleMs,
                buildSemaphore(maxConcurrentCompilations));
    }

    /**
     * Primary constructor: all public constructors delegate to this one.
     */
    private CompilationServiceImpl(DualSnapshotStore snapshotStore, EventSyncPubSubHolder eventBus,
                                   CompilationPipeline.CompilationAction compilationAction, long retryDelayMs,
                                   long heapPressureThrottleMs, Semaphore compilationPermits) {
        this.snapshotStore = snapshotStore;
        this.eventBus = eventBus;
        this.baseAction = compilationAction;
        this.retryDelayMs = retryDelayMs;
        this.heapPressureThrottleMs = heapPressureThrottleMs;
        this.compilationPermits = compilationPermits;
        this.pipelines = new ConcurrentHashMap<>();
        this.circuitActions = new ConcurrentHashMap<>();
        this.throttledRequests = new ConcurrentHashMap<>();
        this.sourceRootIndex = new ConcurrentHashMap<>();
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
    public StableSnapshot stableSnapshot(@Nonnull Project project, @Nonnull PackageDescriptor descriptor,
                                         CancelChecker cancelChecker) {
        CompilationKey key = keyOf(project, descriptor);
        while (true) {
            if (cancelChecker != null) {
                cancelChecker.checkCanceled();
            }
            StableSnapshot stable = snapshotStore.getStable(key);
            if (stable != null) {
                return stable;
            }
            InProgressSnapshot inProgress = snapshotStore.getInProgress(key);
            if (inProgress instanceof DualSnapshotStore.StoreInProgressSnapshot storeInProgress) {
                StableSnapshot awaited = awaitPublished(storeInProgress, cancelChecker);
                if (awaited != null) {
                    return awaited;
                }
            }
            if (!pipelines.containsKey(key)) {
                if (!awaitOrBootstrapPipeline(key, project, cancelChecker)) {
                    return null;
                }
            }
            try {
                Thread.sleep(50);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return null;
            }
        }
    }

    /**
     * Waits briefly for async event delivery to register the pipeline, then bootstraps it directly if needed.
     *
     * @param key compilation key for the requested package
     * @param project project owning the compilation request
     * @param cancelChecker cancellation checker for the waiting thread
     * @return true if the pipeline exists after waiting or bootstrapping, false if interrupted or closed
     */
    private boolean awaitOrBootstrapPipeline(CompilationKey key, Project project, CancelChecker cancelChecker) {
        long deadline = System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(200);
        while (!pipelines.containsKey(key)) {
            if (closed.get()) {
                return false;
            }
            if (cancelChecker != null) {
                cancelChecker.checkCanceled();
            }
            if (System.nanoTime() >= deadline) {
                createPipelineIfAbsent(project.sourceRoot().toAbsolutePath().normalize().toString());
                return pipelines.containsKey(key);
            }
            try {
                Thread.sleep(20);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }
        return true;
    }

    @Override
    public SnapshotView latestSnapshot(@Nonnull Project project, @Nonnull PackageDescriptor descriptor,
                                       CancelChecker cancelChecker) {
        CompilationKey key = keyOf(project, descriptor);
        InProgressSnapshot inProgressSnapshot = snapshotStore.getInProgress(key);
        if (inProgressSnapshot != null) {
            return inProgressSnapshot;
        }
        return snapshotStore.getStable(key);
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
        sourceRootIndex.clear();
        retryScheduler.shutdownNow();
    }

    // ---- Private Methods ----

    private void subscribeToEvents() {
        eventBus.subscribe("ce-workspace-events", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_REGISTERED,
                       EventKind.WORKSPACE_PROJECT_EVICTED,
                       EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED,
                       EventKind.WORKSPACE_PROJECT_UPDATED),
                this::handleWorkspaceEvent);

        eventBus.subscribe("ce-heap-pressure-events", SubscriberTier.CRITICAL,
                Set.of(EventKind.RM_E1_HEAP_PRESSURE_DETECTED), this::handleHeapPressureEvent);
    }

    private void handleWorkspaceEvent(DomainEvent event) {
        String sourceRootIdentifier = sourceRootIdentifier(event);
        if (sourceRootIdentifier == null) {
            return;
        }

        switch (event.eventKind()) {
            case WORKSPACE_PROJECT_REGISTERED -> createPipelineIfAbsent(sourceRootIdentifier);
            case WORKSPACE_PROJECT_EVICTED -> evictPipeline(sourceRootIdentifier);
            case WORKSPACE_PROJECT_KIND_TRANSITIONED -> {
                evictPipeline(sourceRootIdentifier);
                createPipelineIfAbsent(sourceRootIdentifier);
            }
            case WORKSPACE_PROJECT_UPDATED -> handleProjectUpdated(event);
            default -> {
                // No-op for unexpected event kinds
            }
        }
    }

    private void handleProjectUpdated(DomainEvent event) {
        Set<CompilationKey> keys = resolveKeys(event);
        if (keys != null) {
            keys.forEach(this::requestCompilationWithThrottle);
        }
    }

    private void handleHeapPressureEvent(DomainEvent event) {
        if (heapPressureThrottleMs <= 0) {
            return;
        }
        if (!(event instanceof HeapPressureEvent hpe)) {
            return;
        }
        switch (hpe.pressureLevel()) {
            case WARNING, CRITICAL, EMERGENCY ->
                    throttledUntilNanos.set(System.nanoTime() + TimeUnit.MILLISECONDS.toNanos(heapPressureThrottleMs));
            case NORMAL -> throttledUntilNanos.set(0L);
        }
    }

    private void requestCompilationWithThrottle(CompilationKey key) {
        CompilationPipeline pipeline = pipelines.get(key);
        if (pipeline == null) {
            return;
        }

        long delayNanos = throttledUntilNanos.get() - System.nanoTime();
        if (delayNanos <= 0) {
            cancelThrottledRequest(key);
            requestCompilation(pipeline);
            return;
        }

        ScheduledFuture<?> existing = throttledRequests.remove(key);
        if (existing != null) {
            existing.cancel(false);
        }

        ScheduledFuture<?> scheduled = retryScheduler.schedule(() -> {
            throttledRequests.remove(key);
            CompilationPipeline activePipeline = pipelines.get(key);
            if (activePipeline != null && !closed.get()) {
                requestCompilation(activePipeline);
            }
        }, TimeUnit.NANOSECONDS.toMillis(delayNanos), TimeUnit.MILLISECONDS);
        throttledRequests.put(key, scheduled);
    }

    private void requestCompilation(CompilationPipeline pipeline) {
        ContentVersion nextVersion = new ContentVersion(versionCounter.getAndIncrement());
        pipeline.requestCompilation(nextVersion);
    }

    private void cancelThrottledRequest(CompilationKey key) {
        ScheduledFuture<?> pendingRequest = throttledRequests.remove(key);
        if (pendingRequest != null) {
            pendingRequest.cancel(false);
        }
    }

    private void createPipelineIfAbsent(String sourceRootIdentifier) {
        PackageDescriptor descriptor;
        try {
            descriptor = baseAction.describe(sourceRootIdentifier);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to describe project at " + sourceRootIdentifier, e);
            return;
        }
        CompilationKey key = new CompilationKey(sourceRootIdentifier, descriptor);
        if (pipelines.containsKey(key)) {
            return;
        }
        CircuitBreakerAction circuitAction = new CircuitBreakerAction(key);
        CompilationPipeline pipeline = new CompilationPipeline(key, snapshotStore, eventBus,
                circuitAction, compilationPermits);
        CompilationPipeline existing = pipelines.putIfAbsent(key, pipeline);
        if (existing != null) {
            pipeline.close();
            return;
        }
        sourceRootIndex.computeIfAbsent(sourceRootIdentifier, k -> ConcurrentHashMap.newKeySet()).add(key);
        circuitActions.put(key, circuitAction);
        pipeline.requestCompilation(new ContentVersion(versionCounter.getAndIncrement()));
    }

    private void evictPipeline(String sourceRootIdentifier) {
        Set<CompilationKey> keys = sourceRootIndex.remove(sourceRootIdentifier);
        if (keys == null) {
            return;
        }
        for (CompilationKey key : keys) {
            CompilationPipeline pipeline = pipelines.remove(key);
            circuitActions.remove(key);
            ScheduledFuture<?> pendingRequest = throttledRequests.remove(key);
            if (pendingRequest != null) {
                pendingRequest.cancel(false);
            }
            if (pipeline != null) {
                pipeline.close();
                snapshotStore.remove(key);
            }
        }
    }

    private StableSnapshot awaitPublished(DualSnapshotStore.StoreInProgressSnapshot storeInProgress,
                                           CancelChecker cancelChecker) {
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

    private Set<CompilationKey> resolveKeys(DomainEvent event) {
        String sourceRootIdentifier = sourceRootIdentifier(event);
        return sourceRootIdentifier == null ? null : sourceRootIndex.get(sourceRootIdentifier);
    }

    private CompilationKey keyOf(Project project, PackageDescriptor descriptor) {
        String sourceRoot = project.sourceRoot().toAbsolutePath().normalize().toString();
        return new CompilationKey(sourceRoot, descriptor);
    }

    private String sourceRootIdentifier(DomainEvent event) {
        URI uri = switch (event) {
            case ProjectEvent pe    -> pe.sourceRoot();
            case CompilerEvent ce   -> ce.sourceRoot();
            default                 -> null;
        };
        return uri == null ? null : UriResolver.pathOf(uri);
    }

    private static Semaphore buildSemaphore(int maxConcurrentCompilations) {
        if (maxConcurrentCompilations < 1) {
            throw new IllegalArgumentException(
                    "maxConcurrentCompilations must be >= 1, got: " + maxConcurrentCompilations);
        }
        return new Semaphore(maxConcurrentCompilations, true);
    }

    private static String descriptorName(PackageDescriptor descriptor) {
        try {
            if (descriptor != null && descriptor.name() != null && descriptor.name().value() != null
                    && !descriptor.name().value().isBlank()) {
                return descriptor.name().value();
            }
        } catch (Exception ignored) {
            // Fall through to the default name.
        }
        return "unknown-package";
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

        private final CompilationKey key;
        private final AtomicInteger retryCount;
        private final AtomicBoolean circuitOpen;
        private volatile ScheduledFuture<?> retryTask;

        CircuitBreakerAction(CompilationKey key) {
            this.key = key;
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
                throw new IllegalStateException("Circuit breaker is open for " + descriptorName(key.descriptor()));
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
                CompilationPipeline pipeline = pipelines.get(key);
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
                URI uri = parseSourceRootUri(key.sourceRoot());
                eventBus.publish(new CompilerEvent(EventKind.CE_RESOLUTION_EXHAUSTED, uri,
                        descriptorName(key.descriptor())));
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Failed to emit CE-E6 for " + descriptorName(key.descriptor()), e);
            }
        }

        private URI parseSourceRootUri(String identifier) {
            if (identifier == null || identifier.isBlank()) {
                return null;
            }
            try {
                String trimmed = identifier.trim();
                if (trimmed.startsWith("file:") || trimmed.startsWith("http:") || trimmed.startsWith("https:")) {
                    return URI.create(trimmed);
                }
                return URI.create("file://" + trimmed);
            } catch (IllegalArgumentException e) {
                return null;
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
