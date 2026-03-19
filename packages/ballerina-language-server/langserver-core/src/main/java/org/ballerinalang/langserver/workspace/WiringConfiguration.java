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
import org.ballerinalang.langserver.workspace.documentstore.DocumentServiceImpl;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.documentstore.VirtualFileSystem;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.execution.ExecutionServiceImpl;
import org.ballerinalang.langserver.workspace.execution.GracePeriod;
import org.ballerinalang.langserver.workspace.observability.WorkspaceTraceLogger;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectLoader;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.ballerinalang.langserver.workspace.workspacemanager.UriResolver;

import java.net.URI;
import java.nio.file.Path;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
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
    private final VirtualFileSystem virtualFileSystem;
    private final DocumentServiceImpl documentService;
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
        this.virtualFileSystem = builder.virtualFileSystem;

        // Construction order matters — services self-subscribe in constructors.
        // 1. DocumentService (subscribes to CE-E1, WM-E2)
        this.documentService = new DocumentServiceImpl(
                builder.virtualFileSystem, eventBus, builder.projectRootResolver);

        // 2. ProjectService (subscribes to DS-E1, DS-E3, CE-E2, CE-E5;
        //    internally creates LockingModeController which subscribes to CE-E6, CE-E4)
        this.projectService = new ProjectServiceImpl(
                builder.projectRegistry, builder.uriResolver, eventBus, builder.projectLoader);

        // 3. CompilationService (subscribes to WM-E1, WM-E2, WM-E4, DS-E2, DS-E4)
        this.compilationService = new CompilationServiceImpl(
                builder.snapshotStore, eventBus, builder.compilationAction);

        // 4. ExecutionService (subscribes to WM-E2, WM-E4)
        this.executionService = new ExecutionServiceImpl(
                eventBus, builder.gracePeriod, builder.maxActiveProcesses);

        // 5. WorkspaceTraceLogger (subscribes to ALL event kinds with BEST_EFFORT)
        this.traceLogger = new WorkspaceTraceLogger(eventBus);

        // 6. Wire cross-context event subscriptions not handled internally by services
        wireCrossContextSubscriptions();
    }

    /**
     * Wires cross-context event subscriptions that bridge bounded contexts.
     * These are subscriptions required by domain-events.md that are not handled
     * internally by individual service constructors.
     */
    private void wireCrossContextSubscriptions() {
        // Bridge: DS-E4 (STRUCTURAL config change) → ProjectService kind transition → WM-E4
        // When Ballerina.toml is created/deleted, the project kind must transition
        // (SINGLE_FILE ↔ BUILD), triggering CE pipeline teardown/create.
        eventBus.subscribe("wiring-config-structural-bridge", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_FILE_WATCHED_CHANGED), this::onStructuralConfigChange);

        // Bridge: DS-E2 (document changed) → apply VFS content to the cached project.
        // This keeps the in-memory Project up-to-date so the synchronous syntaxTree()
        // fallback in WorkspaceManagerFacadeImpl returns the latest editor content.
        eventBus.subscribe("wiring-doc-changed-bridge", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_CHANGED), this::onDocumentChanged);

        // Bridge: DS-E1 (document opened) → apply VFS content to the cached project.
        // Ensures that after didOpen(), the synchronous compilation path uses the editor
        // content instead of stale disk content.
        eventBus.subscribe("wiring-doc-opened-bridge", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_OPENED), this::onDocumentOpened);
    }

    /**
     * On DS-E2: apply the current VFS content of the changed .bal file to the
     * cached Ballerina {@code Project} so the synchronous fallback path returns
     * up-to-date syntax trees without waiting for the async compilation pipeline.
     */
    private void onDocumentChanged(DomainEvent event) {
        String uriString = event.coalesceScope();
        if (uriString == null || !uriString.startsWith("file:")) {
            return;
        }
        try {
            URI uri = URI.create(uriString);
            Path filePath = Path.of(uri).toAbsolutePath().normalize();
            if (!filePath.toString().endsWith(".bal")) {
                return;
            }
            DocumentUri.FileUri docUri = new DocumentUri.FileUri(uri);
            if (virtualFileSystem.isOverlaid(docUri)) {
                // Editor change: apply current editor content to the cached project.
                String content = virtualFileSystem.content(docUri);
                projectService.applyDocumentContent(filePath, content);
            } else {
                // Disk change: evict cached project so next loadOrCreate reloads from disk.
                projectService.evictProject(filePath);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "Could not apply document content for DS-E2 event: " + uriString, e);
        }
    }

    /**
     * On DS-E1 (document opened): apply the current VFS content to the cached project.
     *
     * <p>This ensures that after didOpen(), the synchronous compilation path uses the
     * editor content instead of stale disk content. Without this, TestUtil.compileAndGetDiagnostics()
     * and similar synchronous operations would compile using disk content that doesn't
     * reflect the editor state.</p>
     *
     * @param event the document opened event
     */
    private void onDocumentOpened(DomainEvent event) {
        // DS-E1 coalesceScope is the document URI
        String uriString = event.coalesceScope();
        if (uriString == null || !uriString.startsWith("file:")) {
            return;
        }

        try {
            URI uri = URI.create(uriString);
            Path filePath = Path.of(uri).toAbsolutePath().normalize();
            if (!filePath.toString().endsWith(".bal")) {
                return;
            }

            DocumentUri.FileUri docUri = new DocumentUri.FileUri(uri);
            if (virtualFileSystem.isOverlaid(docUri)) {
                // Editor content available: apply to cached project
                String content = virtualFileSystem.content(docUri);
                projectService.applyDocumentContent(filePath, content);
            }
            // Note: If not overlaid, the document was opened from disk, so no need to apply
        } catch (Exception e) {
            LOG.log(Level.FINE, "Could not apply document content for DS-E1 event: " + uriString, e);
        }
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

        SourceRoot root = new SourceRoot(rootPath);

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

    public DocumentServiceImpl documentService() {
        return documentService;
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
        traceLogger.close();
        compilationService.close();
        executionService.shutdown();
        projectService.shutdown();
    }

    /**
     * Builder for constructing a fully-wired configuration.
     */
    public static final class Builder {

        private EventSyncPubSubHolder eventBus;
        private VirtualFileSystem virtualFileSystem;
        private Function<Path, Path> projectRootResolver;
        private DualSnapshotStore snapshotStore;
        private CompilationPipeline.CompilationAction compilationAction;
        private ProjectRegistry projectRegistry;
        private UriResolver uriResolver;
        private ProjectLoader projectLoader;
        private GracePeriod gracePeriod;
        private int maxActiveProcesses = 5;

        public Builder eventBus(EventSyncPubSubHolder eventBus) {
            this.eventBus = eventBus;
            return this;
        }

        public Builder virtualFileSystem(VirtualFileSystem virtualFileSystem) {
            this.virtualFileSystem = virtualFileSystem;
            return this;
        }

        public Builder projectRootResolver(Function<Path, Path> projectRootResolver) {
            this.projectRootResolver = projectRootResolver;
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

        public WiringConfiguration build() {
            Objects.requireNonNull(eventBus, "eventBus must not be null");
            Objects.requireNonNull(virtualFileSystem, "virtualFileSystem must not be null");
            Objects.requireNonNull(projectRootResolver, "projectRootResolver must not be null");
            Objects.requireNonNull(snapshotStore, "snapshotStore must not be null");
            Objects.requireNonNull(compilationAction, "compilationAction must not be null");
            Objects.requireNonNull(projectRegistry, "projectRegistry must not be null");
            Objects.requireNonNull(uriResolver, "uriResolver must not be null");
            Objects.requireNonNull(projectLoader, "projectLoader must not be null");
            Objects.requireNonNull(gracePeriod, "gracePeriod must not be null");
            return new WiringConfiguration(this);
        }
    }
}
