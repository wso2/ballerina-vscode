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
import org.ballerinalang.langserver.workspace.compilerengine.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.execution.ExecutionServiceImpl;
import org.ballerinalang.langserver.workspace.execution.GracePeriod;
import org.ballerinalang.langserver.workspace.observability.WorkspaceTraceLogger;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureDetected;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureMonitor;
import org.ballerinalang.langserver.workspace.workspacemanager.ChangeApplier;
import org.ballerinalang.langserver.workspace.workspacemanager.ChangeBuffer;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectLoader;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.UriResolver;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Set;

import javax.annotation.Nonnull;
import java.util.function.Consumer;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Central wiring configuration that constructs and connects all bounded context services
 * through the shared event bus. Ensures correct construction order and cross-context
 * event subscription wiring per domain-events.md specification.
 *
 * @since 1.7.0
 */
public final class WiringConfiguration implements AutoCloseable {

    private static final Logger LOG = Logger.getLogger(WiringConfiguration.class.getName());
    private static final String STRUCTURAL_TIER = "STRUCTURAL";

    private final EventSyncPubSubHolder eventBus;
    private final ChangeBuffer changeBuffer;
    private final ChangeApplier changeApplier;
    private final HeapPressureMonitor heapPressureMonitor;
    private final ProjectServiceImpl projectService;
    private final CompilationServiceImpl compilationService;
    private final ExecutionServiceImpl executionService;
    private final WorkspaceTraceLogger traceLogger;
    private final DualSnapshotStore snapshotStore;
    private final ProjectRegistry projectRegistry;

    private WiringConfiguration(Builder builder) {
        this.eventBus = builder.eventBus;
        this.snapshotStore = builder.snapshotStore;
        this.projectRegistry = builder.projectRegistry;

        // Construction order matters — services self-subscribe in constructors.
        // 1. Shared infrastructure: ChangeBuffer and ChangeApplier (no subscriptions)
        this.changeBuffer = new ChangeBuffer();
        this.changeApplier = new ChangeApplier(changeBuffer, builder.uriResolver);

        // 2. HeapPressureMonitor — started immediately; publishes RM-E1 via lambda bridge
        Consumer<HeapPressureDetected> hpdPublisher = hpd ->
                eventBus.publish(new DomainEvent(Instant.now(), "resource-monitor",
                        EventKind.RM_E1_HEAP_PRESSURE_DETECTED, hpd.level().name()));
        this.heapPressureMonitor = new HeapPressureMonitor(hpdPublisher, builder.heapPressurePollIntervalMs);
        this.heapPressureMonitor.start();

        // 3. ProjectService (subscribes to WM-E8..E11, CE-E2, CE-E5b, RM-E1)
        this.projectService = new ProjectServiceImpl(
                builder.projectRegistry, builder.uriResolver, eventBus, builder.projectLoader,
                changeBuffer);

        // 4. CompilationService (subscribes to WM-E1, WM-E2, WM-E4, WM-E9, WM-E11)
        this.compilationService = new CompilationServiceImpl(
                builder.snapshotStore, eventBus, builder.compilationAction);

        // 5. ExecutionService (subscribes to WM-E2, WM-E4)
        this.executionService = new ExecutionServiceImpl(
                eventBus, builder.gracePeriod, builder.maxActiveProcesses);

        // 6. WorkspaceTraceLogger (subscribes to ALL event kinds with BEST_EFFORT)
        this.traceLogger = new WorkspaceTraceLogger(eventBus);

        // 7. Wire cross-context event subscriptions not handled internally by services
        wireCrossContextSubscriptions();
    }

    /**
     * Wires cross-context event subscriptions that bridge bounded contexts.
     * These are subscriptions required by domain-events.md that are not handled
     * internally by individual service constructors.
     */
    private void wireCrossContextSubscriptions() {
        // Bridge: WM_FILE_WATCHED_CHANGED (STRUCTURAL scope) → ProjectService kind transition → WM-E4
        // When Ballerina.toml is created/deleted, the project kind must transition
        // (SINGLE_FILE ↔ BUILD), triggering CE pipeline teardown/create.
        // ProjectServiceImpl does not subscribe to WM_FILE_WATCHED_CHANGED internally,
        // so this bridge is the sole handler for structural config transitions.
        eventBus.subscribe("wiring-config-structural-bridge", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_FILE_WATCHED_CHANGED), this::onStructuralConfigChange);
    }

    /**
     * Handles DS-E4 events with STRUCTURAL reactivity tier by triggering
     * project kind transitions in the workspace manager.
     *
     * <p>DS-E4 coalesceScope format: {@code path|TIER|CHANGE_TYPE} or just {@code TIER}.
     * Only STRUCTURAL tier triggers kind transitions (Ballerina.toml create/delete).
     */
    private void onStructuralConfigChange(DomainEvent event) {
        String scope = event.coalesceScope();
        if (scope == null || !scope.contains(STRUCTURAL_TIER)) {
            return;
        }

        // Determine source root from the event
        String sourceContext = event.sourceContext();
        Path rootPath;
        try {
            rootPath = Path.of(sourceContext).toAbsolutePath().normalize();
        } catch (Exception e) {
            LOG.log(Level.FINE, "Could not parse source root from DS-E4 event: " + sourceContext, e);
            return;
        }

        DocumentUri root = new DocumentUri.FileUri(rootPath.toUri());

        // Determine new kind: if Ballerina.toml exists → BUILD, otherwise → SINGLE_FILE
        boolean tomlExists = rootPath.resolve("Ballerina.toml").toFile().exists();
        ProjectKind newKind = tomlExists ? ProjectKind.BUILD : ProjectKind.SINGLE_FILE;

        try {
            projectService.transitionKind(root, newKind);
        } catch (Exception e) {
            LOG.log(Level.FINE, "Kind transition skipped for " + root + ": " + e.getMessage());
        }
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

    public ProjectRegistry projectRegistry() {
        return projectRegistry;
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
        private @Nonnull CompilationPipeline.CompilationAction compilationAction;
        private @Nonnull ProjectRegistry projectRegistry;
        private @Nonnull UriResolver uriResolver;
        private @Nonnull ProjectLoader projectLoader;
        private @Nonnull GracePeriod gracePeriod;
        private int maxActiveProcesses = 5;
        private long heapPressurePollIntervalMs = 5000L;

        public Builder eventBus(EventSyncPubSubHolder eventBus) {
            this.eventBus = eventBus;
            return this;
        }

        public Builder snapshotStore(DualSnapshotStore snapshotStore) {
            this.snapshotStore = snapshotStore;
            return this;
        }

        public Builder compilationAction(CompilationPipeline.CompilationAction compilationAction) {
            this.compilationAction = compilationAction;
            return this;
        }

        public Builder projectRegistry(ProjectRegistry projectRegistry) {
            this.projectRegistry = projectRegistry;
            return this;
        }

        public Builder uriResolver(UriResolver uriResolver) {
            this.uriResolver = uriResolver;
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

        public WiringConfiguration build() {
            return new WiringConfiguration(this);
        }
    }
}
