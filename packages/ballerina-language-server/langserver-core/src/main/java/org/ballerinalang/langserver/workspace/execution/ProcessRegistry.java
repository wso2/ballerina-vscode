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

import org.ballerinalang.langserver.workspace.executionmanager.ProcessId;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Bounded registry for active processes.
 * Enforces maximum active-process limit and provides project-scoped cleanup.
 *
 * @since 1.7.0
 */
public final class ProcessRegistry {

    private final int maxActiveProcesses;
    private final ConcurrentHashMap<ProcessId, ExecutionProcess> processes = new ConcurrentHashMap<>();
    private final AtomicInteger activeCount = new AtomicInteger(0);

    /**
     * Creates a registry with the specified maximum active process count.
     *
     * @param maxActiveProcesses maximum number of concurrent active processes
     * @throws IllegalArgumentException if maxActiveProcesses is not positive
     */
    public ProcessRegistry(int maxActiveProcesses) {
        if (maxActiveProcesses <= 0) {
            throw new IllegalArgumentException("maxActiveProcesses must be positive");
        }
        this.maxActiveProcesses = maxActiveProcesses;
    }

    /**
     * Registers a new execution process.
     *
     * @param process the process to register
     * @throws IllegalStateException if max active processes exceeded
     * @throws NullPointerException if process is null
     */
    public void register(ExecutionProcess process) {
        Objects.requireNonNull(process, "process must not be null");

        if (activeCount.get() >= maxActiveProcesses) {
            throw new IllegalStateException(
                    "Maximum active process count exceeded: " + maxActiveProcesses);
        }

        processes.put(process.processId(), process);
        activeCount.incrementAndGet();
    }

    /**
     * Finds a process by its ID.
     *
     * @param processId the process ID
     * @return optional containing the process if found
     * @throws NullPointerException if processId is null
     */
    public Optional<ExecutionProcess> find(ProcessId processId) {
        Objects.requireNonNull(processId, "processId must not be null");
        return Optional.ofNullable(processes.get(processId));
    }

    /**
     * Removes a process from the registry without terminating it.
     *
     * @param processId the process ID to remove
     * @return true if a process was removed
     * @throws NullPointerException if processId is null
     */
    public boolean remove(ProcessId processId) {
        Objects.requireNonNull(processId, "processId must not be null");
        ExecutionProcess removed = processes.remove(processId);
        if (removed != null) {
            activeCount.decrementAndGet();
            return true;
        }
        return false;
    }

    /**
     * Cleans up all processes for a given source root by terminating them.
     *
     * @param sourceRoot the source root to cleanup
     * @param reason the reason for termination
     * @return list of process IDs that were terminated
     * @throws NullPointerException if sourceRoot or reason is null
     */
    public List<ProcessId> cleanup(SourceRoot sourceRoot, ExecutionProcess.TerminationReason reason) {
        Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        Objects.requireNonNull(reason, "reason must not be null");

        List<ProcessId> removed = new ArrayList<>();

        processes.entrySet().removeIf(entry -> {
            ExecutionProcess process = entry.getValue();
            if (process.sourceRoot().equals(sourceRoot)) {
                process.terminate(reason);
                removed.add(process.processId());
                activeCount.decrementAndGet();
                return true;
            }
            return false;
        });

        return removed;
    }

    /**
     * Returns the current count of active processes.
     *
     * @return active process count
     */
    public int activeProcessCount() {
        return activeCount.get();
    }

    /**
     * Returns the configured maximum active process limit.
     *
     * @return max active processes
     */
    public int maxActiveProcesses() {
        return maxActiveProcesses;
    }
}
