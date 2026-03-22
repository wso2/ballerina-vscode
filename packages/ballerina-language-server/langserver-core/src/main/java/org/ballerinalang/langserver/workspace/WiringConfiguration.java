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

package org.ballerinalang.langserver.workspace;

import org.ballerinalang.langserver.workspace.compilerengine.CompilationPipeline;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationServiceImpl;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.event.HeapPressureEvent;
import org.ballerinalang.langserver.workspace.execution.ExecutionServiceImpl;
import org.ballerinalang.langserver.workspace.execution.GracePeriod;
import org.ballerinalang.langserver.workspace.observability.WorkspaceTraceLogger;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureDetected;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureMonitor;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeApplier;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeBuffer;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectLoader;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;

import javax.annotation.Nonnull;
import java.util.function.Consumer;

/**
 * Central wiring configuration that constructs and connects all bounded context services
 * through the shared event bus. Ensures correct construction order and cross-context
 * event subscription wiring per domain-events.md specification.
 *
 * @since 1.7.0
 */
public final class WiringConfiguration implements AutoCloseable {

    private final EventSyncPubSubHolder eventBus;
    private final ChangeBuffer changeBuffer;
    private final ChangeApplier changeApplier;
    private final HeapPressureMonitor heapPressureMonitor;
    private final ProjectServiceImpl projectService;
    private final CompilationServiceImpl compilationService;
    private final ExecutionServiceImpl executionService;
    private final WorkspaceTraceLogger traceLogger;
    private final DualSnapshotStore snapshotStore;

    private WiringConfiguration(Builder builder) {
        this.eventBus = builder.eventBus;
        this.snapshotStore = builder.snapshotStore;

        // Construction order matters — services self-subscribe in constructors.
        // 1. Shared infrastructure: ChangeBuffer
        this.changeBuffer = new ChangeBuffer();

        // 2. HeapPressureMonitor — started immediately; publishes RM-E1 via lambda bridge
        Consumer<HeapPressureDetected> hpdPublisher = hpd ->
                eventBus.publish(new HeapPressureEvent(hpd.level()));
        this.heapPressureMonitor = new HeapPressureMonitor(hpdPublisher, builder.heapPressurePollIntervalMs);
        this.heapPressureMonitor.start();

        // 3. ProjectService (subscribes to CE and RM events, owns UriResolver and ChangeApplier)
        this.projectService = new ProjectServiceImpl(eventBus, builder.projectLoader, changeBuffer);
        this.changeApplier = projectService.changeApplier();

        // 4. CompilationService (subscribes to WM-E1, WM-E2, WM-E4, WM-E9, WM-E11)
        this.compilationService = builder.compilationAction != null
                ? new CompilationServiceImpl(builder.snapshotStore, eventBus, builder.compilationAction, 500L)
                : new CompilationServiceImpl(builder.snapshotStore, eventBus, this.projectService);

        // 5. ExecutionService (subscribes to WM-E2, WM-E4)
        this.executionService = new ExecutionServiceImpl(
                eventBus, builder.gracePeriod, builder.maxActiveProcesses);

        // 6. WorkspaceTraceLogger (subscribes to ALL event kinds with BEST_EFFORT)
        this.traceLogger = new WorkspaceTraceLogger(eventBus);

    }

    public static Builder builder() {
        return new Builder();
    }

    public ChangeBuffer changeBuffer() {
        return changeBuffer;
    }

    public ChangeApplier changeApplier() {
        return changeApplier;
    }

    public HeapPressureMonitor heapPressureMonitor() {
        return heapPressureMonitor;
    }

    public ProjectServiceImpl projectService() {
        return projectService;
    }

    public CompilationServiceImpl compilationService() {
        return compilationService;
    }

    public ExecutionServiceImpl executionService() {
        return executionService;
    }

    public WorkspaceTraceLogger traceLogger() {
        return traceLogger;
    }

    public DualSnapshotStore snapshotStore() {
        return snapshotStore;
    }

    @Override
    public void close() throws Exception {
        heapPressureMonitor.stop();
        traceLogger.close();
        compilationService.close();
        executionService.shutdown();
        projectService.shutdown();
    }

    /**
     * Builder for constructing a fully-wired configuration.
     */
    public static final class Builder {

        private @Nonnull EventSyncPubSubHolder eventBus;
        private @Nonnull DualSnapshotStore snapshotStore;
        private @Nonnull ProjectLoader projectLoader;
        private @Nonnull GracePeriod gracePeriod;
        private int maxActiveProcesses = 5;
        private long heapPressurePollIntervalMs = 5000L;
        private CompilationPipeline.CompilationAction compilationAction;

        public Builder eventBus(EventSyncPubSubHolder eventBus) {
            this.eventBus = eventBus;
            return this;
        }

        public Builder snapshotStore(DualSnapshotStore snapshotStore) {
            this.snapshotStore = snapshotStore;
            return this;
        }

        public Builder projectLoader(ProjectLoader projectLoader) {
            this.projectLoader = projectLoader;
            return this;
        }

        public Builder gracePeriod(GracePeriod gracePeriod) {
            this.gracePeriod = gracePeriod;
            return this;
        }

        public Builder maxActiveProcesses(int maxActiveProcesses) {
            this.maxActiveProcesses = maxActiveProcesses;
            return this;
        }

        public Builder heapPressurePollIntervalMs(long heapPressurePollIntervalMs) {
            this.heapPressurePollIntervalMs = heapPressurePollIntervalMs;
            return this;
        }

        /**
         * Overrides the compilation action with a test double; intended for unit tests only.
         *
         * @param compilationAction test-specific compilation strategy
         * @return this builder
         */
        public Builder compilationAction(CompilationPipeline.CompilationAction compilationAction) {
            this.compilationAction = compilationAction;
            return this;
        }

        public WiringConfiguration build() {
            return new WiringConfiguration(this);
        }
    }
}
