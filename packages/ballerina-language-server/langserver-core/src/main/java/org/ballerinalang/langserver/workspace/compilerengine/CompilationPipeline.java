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
import org.ballerinalang.langserver.workspace.workspacemanager.LockingMode;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;

import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.CancellationException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Per-project compilation orchestrator with debounce, LIFO cancellation, and event emission (ADR-007/008/018).
 *
 * @since 1.7.0
 */
public class CompilationPipeline implements AutoCloseable {

    private static final long DEBOUNCE_MILLIS = 150;
    private static final Logger LOG = Logger.getLogger(CompilationPipeline.class.getName());

    /**
     * Strategy for performing the actual compilation work.
     */
    public interface CompilationAction {
        default ResolutionResult resolve(CompileTask task) throws Exception {
            return new ResolutionResult(task.sourceRoot(), java.util.List.of(), true);
        }

        ProjectSnapshot compile(CompileTask task) throws Exception;

        default LockingMode currentLockingMode(CompileTask task) {
            return LockingMode.LOCKED;
        }

        default RecoveryResult recover(CompileTask task, LockingMode initialMode, Throwable cause) throws Exception {
            return RecoveryResult.exhausted();
        }
    }

    /**
     * Recovery outcome for a qualifying compilation failure.
     *
     * @param recovered whether transient recovery succeeded
     * @since 1.7.0
     */
    public record RecoveryResult(boolean recovered) {

        public static RecoveryResult success() {
            return new RecoveryResult(true);
        }

        public static RecoveryResult exhausted() {
            return new RecoveryResult(false);
        }
    }

    private final SourceRoot sourceRoot;
    private final SnapshotStore snapshotStore;
    private final EventSyncPubSubHolder eventBus;
    private final CompilationAction compilationAction;
    private final ScheduledExecutorService debounceScheduler;
    private final ExecutorService compilationWorker;
    private final AtomicReference<ScheduledFuture<?>> pendingDebounce;
    private final AtomicReference<CompileTask> inflightTask;
    private final AtomicReference<ContentVersion> latestRequestedVersion;
    private final AtomicReference<Thread> activeWorkerThread;
    private final AtomicBoolean closed;

    /**
     * Creates a compilation pipeline for the given source root.
     *
     * @param sourceRoot        the project identity
     * @param snapshotStore     store to publish snapshots into
     * @param eventBus          event bus for domain event emission
     * @param compilationAction the actual compilation strategy
     */
    public CompilationPipeline(SourceRoot sourceRoot, SnapshotStore snapshotStore,
                               EventSyncPubSubHolder eventBus, CompilationAction compilationAction) {
        this.sourceRoot = Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        this.snapshotStore = Objects.requireNonNull(snapshotStore, "snapshotStore must not be null");
        this.eventBus = Objects.requireNonNull(eventBus, "eventBus must not be null");
        this.compilationAction = Objects.requireNonNull(compilationAction, "compilationAction must not be null");

        String dirName = sourceRoot.path().getFileName().toString();
        this.debounceScheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "compile-debounce-" + dirName);
            t.setDaemon(true);
            return t;
        });
        this.compilationWorker = Executors.newSingleThreadExecutor(r -> {
            Thread t = new Thread(r, "compile-worker-" + dirName);
            t.setDaemon(true);
            return t;
        });
        this.pendingDebounce = new AtomicReference<>();
        this.inflightTask = new AtomicReference<>();
        this.latestRequestedVersion = new AtomicReference<>();
        this.activeWorkerThread = new AtomicReference<>();
        this.closed = new AtomicBoolean(false);
    }

    /**
     * Requests compilation for the given content version. Debounces at 150ms (ADR-008).
     *
     * @param contentVersion the version to compile
     */
    public void requestCompilation(ContentVersion contentVersion) {
        Objects.requireNonNull(contentVersion, "contentVersion must not be null");
        if (closed.get()) {
            return;
        }
        latestRequestedVersion.set(contentVersion);

        ScheduledFuture<?> prev = pendingDebounce.getAndSet(
                debounceScheduler.schedule(() -> submitCompilation(contentVersion), DEBOUNCE_MILLIS,
                        TimeUnit.MILLISECONDS));
        if (prev != null) {
            prev.cancel(false);
        }
    }

    /**
     * Returns the source root this pipeline manages.
     *
     * @return source root
     */
    public SourceRoot sourceRoot() {
        return sourceRoot;
    }

    /**
     * Returns whether a compilation is currently in flight.
     *
     * @return {@code true} if compiling
     */
    public boolean isCompiling() {
        return inflightTask.get() != null;
    }

    @Override
    public void close() {
        if (!closed.compareAndSet(false, true)) {
            return;
        }
        ScheduledFuture<?> pending = pendingDebounce.getAndSet(null);
        if (pending != null) {
            pending.cancel(false);
        }
        CompileTask inflight = inflightTask.get();
        if (inflight != null) {
            inflight.cancel();
        }
        debounceScheduler.shutdownNow();
        compilationWorker.shutdownNow();
    }

    private void submitCompilation(ContentVersion contentVersion) {
        if (closed.get()) {
            return;
        }
        // LIFO: cancel inflight task and interrupt worker thread (ADR-018 Mandate 8)
        CompileTask previous = inflightTask.get();
        if (previous != null) {
            previous.cancel();
            Thread workerThread = activeWorkerThread.get();
            if (workerThread != null) {
                workerThread.interrupt();
            }
        }

        // Staleness check: use latestRequestedVersion, not the debounced version
        ContentVersion latest = latestRequestedVersion.get();
        if (latest != null && latest.compareTo(contentVersion) > 0) {
            return;
        }

        CancellationToken token = new CancellationToken();
        CompileTask task = new CompileTask(sourceRoot, contentVersion, token);
        inflightTask.set(task);

        compilationWorker.submit(() -> executeCompilation(task));
    }

    private void executeCompilation(CompileTask task) {
        activeWorkerThread.set(Thread.currentThread());
        try {
            ResolutionResult resolutionResult = compilationAction.resolve(task);
            if (!resolutionResult.success()) {
                emitEvent(EventKind.CE_E5A_RESOLUTION_DIAGNOSTICS_READY);
                return;
            }

            ProjectSnapshot snapshot = compilationAction.compile(task);

            // Publication guard: discard result if cancelled (ADR-018 Mandate 8)
            if (task.isCancelled()) {
                LOG.fine(() -> "Cancelled compilation result discarded for " + sourceRoot);
                emitEvent(EventKind.COMPILER_COMPILATION_CANCELLED);
                return;
            }

            // Staleness guard before publish
            ContentVersion latest = latestRequestedVersion.get();
            if (latest != null && latest.compareTo(task.contentVersion()) > 0) {
                LOG.fine(() -> "Stale compilation discarded for " + sourceRoot + " version="
                        + task.contentVersion());
                emitEvent(EventKind.COMPILER_COMPILATION_CANCELLED);
                return;
            }

            emitEvent(EventKind.CE_E5B_COMPILATION_DIAGNOSTICS_READY);
            snapshotStore.publish(sourceRoot, snapshot);
            emitEvent(EventKind.COMPILER_SNAPSHOT_PUBLISHED);
        } catch (CancellationException e) {
            LOG.fine(() -> "Compilation cancelled for " + sourceRoot);
            emitEvent(EventKind.COMPILER_COMPILATION_CANCELLED);
        } catch (InterruptedException e) {
            LOG.fine(() -> "Compilation interrupted for " + sourceRoot);
            emitEvent(EventKind.COMPILER_COMPILATION_CANCELLED);
        } catch (Exception e) {
            if (isBirCompilationFailure(e)) {
                scheduleRecovery(task, e);
                return;
            }
            LOG.log(Level.WARNING, "Compilation failed for " + sourceRoot, e);
            emitEvent(EventKind.COMPILER_COMPILATION_FAILED);
        } finally {
            activeWorkerThread.compareAndSet(Thread.currentThread(), null);
            inflightTask.compareAndSet(task, null);
            // Clear interrupt flag so the worker thread can pick up the next task
            Thread.interrupted();
            // If a newer version is pending, submit it immediately (skip debounce)
            scheduleLatestIfPending(task.contentVersion());
        }
    }

    private void scheduleRecovery(CompileTask task, Throwable cause) {
        compilationWorker.submit(() -> executeRecovery(task, cause));
    }

    private void executeRecovery(CompileTask task, Throwable cause) {
        try {
            RecoveryResult recoveryResult = compilationAction.recover(task, compilationAction.currentLockingMode(task), cause);
            if (recoveryResult.recovered()) {
                emitEvent(EventKind.CE_RESOLUTION_RECOVERED);
                requestCompilation(latestRequestedVersion.updateAndGet(version ->
                        version != null ? version : task.contentVersion()));
            } else {
                emitEvent(EventKind.CE_RESOLUTION_EXHAUSTED);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Recovery failed for " + sourceRoot, e);
            emitEvent(EventKind.CE_RESOLUTION_EXHAUSTED);
        }
    }

    private void scheduleLatestIfPending(ContentVersion completedVersion) {
        if (closed.get()) {
            return;
        }
        ContentVersion latest = latestRequestedVersion.get();
        if (latest != null && latest.compareTo(completedVersion) > 0 && inflightTask.get() == null) {
            compilationWorker.submit(() -> {
                // Re-check to avoid duplicate work if debounce already fired
                if (!closed.get() && inflightTask.get() == null) {
                    submitCompilation(latest);
                }
            });
        }
    }

    private void emitEvent(EventKind kind) {
        try {
            DomainEvent event = new DomainEvent(Instant.now(), "compilation-pipeline", kind,
                    sourceRoot.path().toString());
            eventBus.publish(event);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Failed to emit event " + kind + " for " + sourceRoot, e);
        }
    }

    private boolean isBirCompilationFailure(Throwable error) {
        String message = error.getMessage();
        if (message == null) {
            return false;
        }
        String normalized = message.toLowerCase();
        return normalized.startsWith("failed to load the module")
                || normalized.contains(".bir")
                || normalized.contains(" bir ");
    }
}
