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

package org.ballerinalang.langserver.workspace.execution;

import org.ballerinalang.langserver.commons.workspace.RunContext;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.executionmanager.ExecutionService;
import org.ballerinalang.langserver.workspace.executionmanager.ProcessId;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import javax.annotation.Nonnull;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/**
 * Implementation of {@link ExecutionService} that manages process execution.
 * Publishes EM-E1, EM-E2, EM-E3 events and subscribes to WM-E2, WM-E4.
 *
 * @since 1.7.0
 */
public final class ExecutionServiceImpl implements ExecutionService {

    private final EventSyncPubSubHolder eventBus;
    private final GracePeriod defaultGracePeriod;
    private final ProcessRegistry processRegistry;
    private final ExecutorService virtualThreadExecutor;
    private final Consumer<Boolean> virtualThreadUsageTracker;
    private final ConcurrentHashMap<ProcessId, ExecutionProcess> activeProcesses = new ConcurrentHashMap<>();

    private static final String SOURCE_CONTEXT = "executionmanager";

    /**
     * Creates a new execution service.
     *
     * @param eventBus the event bus for publishing/subscribing
     * @param defaultGracePeriod default grace period for process termination
     * @param maxActiveProcesses maximum number of concurrent active processes
     */
    public ExecutionServiceImpl(EventSyncPubSubHolder eventBus,
                                GracePeriod defaultGracePeriod,
                                int maxActiveProcesses) {
        this(eventBus, defaultGracePeriod, maxActiveProcesses, ignored -> {});
    }

    /**
     * Creates a new execution service with a virtual thread usage tracker.
     *
     * @param eventBus the event bus for publishing/subscribing
     * @param defaultGracePeriod default grace period for process termination
     * @param maxActiveProcesses maximum number of concurrent active processes
     * @param virtualThreadUsageTracker consumer to track virtual thread usage (for testing)
     */
    ExecutionServiceImpl(@Nonnull EventSyncPubSubHolder eventBus,
                         @Nonnull GracePeriod defaultGracePeriod,
                         int maxActiveProcesses,
                         @Nonnull Consumer<Boolean> virtualThreadUsageTracker) {
        this.eventBus = eventBus;
        this.defaultGracePeriod = defaultGracePeriod;
        this.processRegistry = new ProcessRegistry(maxActiveProcesses);
        this.virtualThreadExecutor = Executors.newVirtualThreadPerTaskExecutor();
        this.virtualThreadUsageTracker = virtualThreadUsageTracker;

        subscribeToDomainEvents();
    }

    @Override
    public ProcessId run(@Nonnull RunContext context) {
        Path sourcePath = context.balSourcePath();
        if (sourcePath == null) {
            throw new IllegalArgumentException("balSourcePath must not be null");
        }

        SourceRoot sourceRoot = resolveSourceRoot(sourcePath);
        ProcessId processId = new ProcessId(UUID.randomUUID().toString());

        try {
            ProcessBuilder pb = createProcessBuilder(context);
            Process process = pb.start();

            ExecutionProcess executionProcess = new ExecutionProcess(
                    processId,
                    sourceRoot,
                    resolveExecutionMode(context),
                    sourcePath,
                    defaultGracePeriod,
                    process,
                    streamSource -> {
                    });

            executionProcess.markRunning();
            processRegistry.register(executionProcess);
            activeProcesses.put(processId, executionProcess);

            publish(EventKind.EXECUTION_PROCESS_STARTED, sourceRoot.path().toString(), processId.value());

            startOutputStreaming(processId, process, sourceRoot);

            return processId;

        } catch (IOException e) {
            throw new RuntimeException("Failed to start process", e);
        }
    }

    @Override
    public void stop(@Nonnull org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot sourceRoot) {
        processRegistry.cleanup(
                new SourceRoot(sourceRoot.path()),
                ExecutionProcess.TerminationReason.USER_REQUESTED);
    }

    /**
     * Stops a specific execution by process ID.
     *
     * @param processId the process ID to stop
     * @throws NullPointerException if processId is null
     */
    public void stopExecution(@Nonnull ProcessId processId) {
        Optional<ExecutionProcess> process = processRegistry.find(processId);
        process.ifPresent(p -> {
            p.terminate(ExecutionProcess.TerminationReason.USER_REQUESTED);
            processRegistry.remove(processId);
            activeProcesses.remove(processId);
        });
    }

    /**
     * Queries the current execution status of a process.
     *
     * @param processId the process ID to query
     * @return the current process state, or null if not found
     */
    public ExecutionProcess.ProcessState queryExecutionStatus(@Nonnull ProcessId processId) {
        return processRegistry.find(processId)
                .map(ExecutionProcess::state)
                .orElse(null);
    }

    /**
     * Shuts down the execution service and terminates all active processes.
     */
    public void shutdown() {
        virtualThreadExecutor.shutdown();
        try {
            if (!virtualThreadExecutor.awaitTermination(5, TimeUnit.SECONDS)) {
                virtualThreadExecutor.shutdownNow();
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            virtualThreadExecutor.shutdownNow();
        }

        activeProcesses.values().forEach(p -> {
            try {
                p.terminate(ExecutionProcess.TerminationReason.USER_REQUESTED);
            } catch (Exception ignored) {
            }
        });
        activeProcesses.clear();
    }

    private void subscribeToDomainEvents() {
        String subscriberId = "execution-service-" + System.identityHashCode(this);

        eventBus.subscribe(subscriberId + "-eviction",
                SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_EVICTED),
                this::onProjectEvicted);

        eventBus.subscribe(subscriberId + "-kind-transition",
                SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED),
                this::onProjectKindTransitioned);
    }

    private void onProjectEvicted(DomainEvent event) {
        String sourceContext = event.sourceContext();
        if (sourceContext == null || sourceContext.isBlank()) {
            return;
        }

        try {
            Path path = Path.of(sourceContext).toAbsolutePath().normalize();
            SourceRoot sourceRoot = new SourceRoot(path);

            processRegistry.cleanup(sourceRoot, ExecutionProcess.TerminationReason.EVICTION_CLEANUP);
        } catch (Exception ignored) {
        }
    }

    private void onProjectKindTransitioned(DomainEvent event) {
        String sourceContext = event.sourceContext();
        String coalesceScope = event.coalesceScope();
        if (sourceContext == null || sourceContext.isBlank()) {
            return;
        }

        ProjectKind newKind;
        try {
            newKind = ProjectKind.valueOf(coalesceScope);
        } catch (IllegalArgumentException | NullPointerException e) {
            return;
        }

        if (isSupportedProjectKind(newKind)) {
            return;
        }

        try {
            Path path = Path.of(sourceContext).toAbsolutePath().normalize();
            SourceRoot sourceRoot = new SourceRoot(path);

            processRegistry.cleanup(sourceRoot, ExecutionProcess.TerminationReason.PROJECT_KIND_TRANSITIONED);
        } catch (Exception ignored) {
        }
    }

    private boolean isSupportedProjectKind(ProjectKind kind) {
        return kind == ProjectKind.SINGLE_FILE || kind == ProjectKind.BUILD;
    }

    private void startOutputStreaming(ProcessId processId, Process process, SourceRoot sourceRoot) {
        virtualThreadExecutor.submit(() -> {
            virtualThreadUsageTracker.accept(Thread.currentThread().isVirtual());
            streamOutput(processId, process, sourceRoot, process.getInputStream(), true);
        });

        virtualThreadExecutor.submit(() -> {
            virtualThreadUsageTracker.accept(Thread.currentThread().isVirtual());
            streamOutput(processId, process, sourceRoot, process.getErrorStream(), false);
        });

        virtualThreadExecutor.submit(() -> {
            virtualThreadUsageTracker.accept(Thread.currentThread().isVirtual());
            try {
                process.waitFor();
                ExecutionProcess execProcess = activeProcesses.get(processId);
                if (execProcess != null) {
                    try {
                        execProcess.terminate(ExecutionProcess.TerminationReason.USER_REQUESTED);
                    } catch (IllegalStateException e) {
                        // Process already terminated, ignore
                    }
                }
                publish(EventKind.EXECUTION_PROCESS_TERMINATED, sourceRoot.path().toString(), processId.value());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
    }

    private void streamOutput(ProcessId processId, Process process, SourceRoot sourceRoot,
                              InputStream stream, boolean isStdout) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (!process.isAlive()) {
                    break;
                }
                publish(EventKind.EXECUTION_PROCESS_OUTPUT,
                        sourceRoot.path().toString(),
                        processId.value() + "|" + (isStdout ? "stdout" : "stderr") + "|" + line);
            }
        } catch (IOException ignored) {
        }
    }

    private ProcessBuilder createProcessBuilder(RunContext context) {
        ProcessBuilder pb = new ProcessBuilder();
        pb.command().add(context.javaCmd());
        pb.command().addAll(context.programArgs());
        pb.environment().putAll(context.env());
        return pb;
    }

    private SourceRoot resolveSourceRoot(Path sourcePath) {
        Path normalized = sourcePath.toAbsolutePath().normalize();
        Path parent = normalized.getParent();
        if (parent == null) {
            parent = normalized;
        }
        return new SourceRoot(parent);
    }

    private ExecutionProcess.ExecutionMode resolveExecutionMode(RunContext context) {
        if (context.debugPort() != null && context.debugPort() > 0) {
            return ExecutionProcess.ExecutionMode.DEBUG;
        }
        return ExecutionProcess.ExecutionMode.RUN;
    }

    private void publish(EventKind eventKind, String sourceContext, String coalesceScope) {
        String eventSourceContext = sourceContext == null || sourceContext.isBlank() ? SOURCE_CONTEXT : sourceContext;
        String eventCoalesceScope = coalesceScope == null || coalesceScope.isBlank() ? SOURCE_CONTEXT : coalesceScope;
        eventBus.publish(new DomainEvent(Instant.now(), eventSourceContext, eventKind, eventCoalesceScope));
    }
}
