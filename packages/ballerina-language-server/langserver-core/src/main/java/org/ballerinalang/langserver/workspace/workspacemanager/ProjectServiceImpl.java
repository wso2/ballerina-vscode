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

import io.ballerina.projects.Project;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.nio.file.Path;
import java.time.Instant;
import java.util.Collection;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Service layer implementation managing workspace projects.
 *
 * <p>Implements {@link ProjectService} and coordinates:
 * <ul>
 *   <li>Project lifecycle via {@link ProjectRegistry}</li>
 *   <li>Ballerina project caching via internal {@link ConcurrentHashMap}</li>
 *   <li>File-to-root mapping via {@link PathToRootCache}</li>
 *   <li>Heap pressure monitoring via {@link HeapPressureListener}</li>
 *   <li>Domain event publishing and subscription via {@link EventSyncPubSubHolder}</li>
 * </ul>
 * </p>
 *
 * <p>Wiring order is critical (ADR-009):
 * <ol>
 *   <li>Register PathToRootCache as ProjectRegistry listener</li>
 *   <li>Register self as ProjectRegistry listener for eviction/batch events</li>
 *   <li>Create and start HeapPressureListener</li>
 *   <li>Subscribe to incoming domain events</li>
 *   <li>Initialize locking mode to SOFT</li>
 * </ol>
 * </p>
 *
 * @since 1.7.0
 */
public final class ProjectServiceImpl implements ProjectService, CacheInvalidationListener {

    private static final int DEFAULT_HEAP_MB = 64;

    private final ProjectRegistry registry;
    private final PathToRootCache pathToRootCache;
    private final EventSyncPubSubHolder eventBus;
    private final ProjectLoader loader;
    private final ConcurrentHashMap<SourceRoot, Project> ballerinaProjects;
    private final AtomicReference<LockingMode> currentMode;
    private final HeapPressureListener heapListener;

    /**
     * Constructs a project service with full wiring of dependencies.
     *
     * <p>Critical wiring order per ADR-009:
     * <ol>
     *   <li>Wire PathToRootCache as registry listener</li>
     *   <li>Wire self as registry listener</li>
     *   <li>Create and start HeapPressureListener</li>
     *   <li>Subscribe to domain events</li>
     *   <li>Initialize locking mode</li>
     * </ol>
     * </p>
     *
     * @param registry project registry; must not be null
     * @param pathToRootCache path-to-root cache; must not be null
     * @param eventBus event bus; must not be null
     * @param loader Ballerina project loader; must not be null
     * @throws NullPointerException if any argument is null
     */
    public ProjectServiceImpl(ProjectRegistry registry, PathToRootCache pathToRootCache,
                             EventSyncPubSubHolder eventBus, ProjectLoader loader) {
        Objects.requireNonNull(registry, "registry must not be null");
        Objects.requireNonNull(pathToRootCache, "pathToRootCache must not be null");
        Objects.requireNonNull(eventBus, "eventBus must not be null");
        Objects.requireNonNull(loader, "loader must not be null");

        this.registry = registry;
        this.pathToRootCache = pathToRootCache;
        this.eventBus = eventBus;
        this.loader = loader;
        this.ballerinaProjects = new ConcurrentHashMap<>();
        this.currentMode = new AtomicReference<>(LockingMode.SOFT);

        // 1. Wire PathToRootCache as registry listener (T-008 DO NOT constraint resolved here)
        registry.addListener(pathToRootCache);

        // 2. Wire self as registry listener for eviction and batch events
        registry.addListener(this);

        // 3. Create and start HeapPressureListener
        this.heapListener = new HeapPressureListener(0.75, registry::evictBackgroundProjects);
        heapListener.start();

        // 4. Subscribe to incoming domain events
        eventBus.subscribe("wm-document-opened", SubscriberTier.CRITICAL,
                Set.of(EventKind.DOCUMENT_OPENED), this::onDocumentOpened);
        eventBus.subscribe("wm-document-closed", SubscriberTier.CRITICAL,
                Set.of(EventKind.DOCUMENT_CLOSED), this::onDocumentClosed);
        eventBus.subscribe("wm-compilation-failed", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_COMPILATION_FAILED), this::onCompilationFailed);
        eventBus.subscribe("wm-diagnostics-ready", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_DIAGNOSTICS_READY), this::onDiagnosticsReady);

        // 5. Default locking mode is already initialized above
    }

    // =========================================================================
    // ProjectService Interface Implementation
    // =========================================================================

    @Override
    public Project loadOrCreate(Path path, CancelChecker cancelChecker) {
        Objects.requireNonNull(path, "path must not be null");
        Objects.requireNonNull(cancelChecker, "cancelChecker must not be null");

        Path normalized = path.toAbsolutePath().normalize();

        // Fast path: check if already cached
        Optional<SourceRoot> cached = pathToRootCache.get(normalized);
        if (cached.isPresent()) {
            Project bp = ballerinaProjects.get(cached.get());
            if (bp != null) {
                return bp;
            }
        }

        // Slow path: resolve root, get-or-create WM project (ADR-019 mandate 2)
        SourceRoot root = resolveSourceRoot(normalized);
        try {
            org.ballerinalang.langserver.workspace.workspacemanager.Project wmProject =
                    registry.computeIfAbsent(root,
                            () -> new org.ballerinalang.langserver.workspace.workspacemanager.Project(
                                    root, detectKind(root), HeapEstimate.ofMb(DEFAULT_HEAP_MB)));

            // Load Ballerina project; publish event only on first creation
            Project bp = loader.load(root, wmProject.kind());
            Project prev = ballerinaProjects.putIfAbsent(root, bp);

            if (prev == null) {
                // First time: publish registration event
                publishWm(EventKind.WORKSPACE_PROJECT_REGISTERED, root);
            }

            pathToRootCache.put(normalized, root);
            return prev != null ? prev : bp;
        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to load project for " + root, e);
        }
    }

    @Override
    public Collection<Project> allProjects() {
        return ballerinaProjects.values();
    }

    @Override
    public io.ballerina.projects.Module module(Path path, CancelChecker cancelChecker) {
        Objects.requireNonNull(path, "path must not be null");
        Objects.requireNonNull(cancelChecker, "cancelChecker must not be null");

        Project project = loadOrCreate(path, cancelChecker);
        try {
            io.ballerina.projects.DocumentId documentId = project.documentId(path);
            return project.currentPackage().module(documentId.moduleId());
        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve module for path: " + path, e);
        }
    }

    @Override
    public void setLockingMode(LockingMode mode, LockingModeAuthority authority) {
        Objects.requireNonNull(mode, "mode must not be null");
        Objects.requireNonNull(authority, "authority must not be null");

        currentMode.set(mode);
    }

    @Override
    public LockingMode getLockingMode() {
        return currentMode.get();
    }

    // =========================================================================
    // CacheInvalidationListener Implementation
    // =========================================================================

    @Override
    public void onCacheInvalidation(CacheInvalidationEvent event) {
        Objects.requireNonNull(event, "event must not be null");

        switch (event.type()) {
            case PROJECT_REMOVED -> {
                if (event.affectedRoot() != null) {
                    ballerinaProjects.remove(event.affectedRoot());
                    publishWm(EventKind.WORKSPACE_PROJECT_EVICTED, event.affectedRoot());
                }
            }
            case BATCH_UPDATE -> publishWmNoRoot(EventKind.WORKSPACE_BATCH_PROJECTS_REGISTERED);
            case PROJECT_ADDED -> {
                // PathToRootCache handles invalidation; no WM action needed here
            }
        }
    }

    // =========================================================================
    // Event Subscription Handlers
    // =========================================================================

    private void onDocumentOpened(DomainEvent event) {
        Path path = parsePath(event.coalesceScope());
        pathToRootCache.get(path).flatMap(registry::get).ifPresent(project -> {
            ProjectTier before = project.openDocumentCount().tier();
            project.openDocumentCount().increment();
            ProjectTier after = project.openDocumentCount().tier();
            if (before != after) {
                publishWm(EventKind.WORKSPACE_PROJECT_TIER_CHANGED, project.sourceRoot());
            }
        });
    }

    private void onDocumentClosed(DomainEvent event) {
        Path path = parsePath(event.coalesceScope());
        pathToRootCache.get(path).flatMap(registry::get).ifPresent(project -> {
            ProjectTier before = project.openDocumentCount().tier();
            project.openDocumentCount().decrement();
            ProjectTier after = project.openDocumentCount().tier();
            if (before != after) {
                publishWm(EventKind.WORKSPACE_PROJECT_TIER_CHANGED, project.sourceRoot());
            }
        });
    }

    private void onCompilationFailed(DomainEvent event) {
        Path root = parsePath(event.coalesceScope());
        registry.get(new SourceRoot(root)).ifPresent(project -> {
            try {
                project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
                publishWm(EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED, project.sourceRoot());
            } catch (IllegalStateException ignored) {
                // Already in that state or invalid arc — skip (ADR-033)
            }
        });
    }

    private void onDiagnosticsReady(DomainEvent event) {
        Path root = parsePath(event.coalesceScope());
        registry.get(new SourceRoot(root)).ifPresent(project -> {
            if (project.healthState() == ProjectHealthState.RECOVERING) {
                try {
                    project.transitionTo(ProjectHealthState.HEALTHY);
                    publishWm(EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED, project.sourceRoot());
                } catch (IllegalStateException ignored) {
                    // Invalid state transition — skip (ADR-033)
                }
            }
        });
    }

    // =========================================================================
    // Service Methods (not in interface but used by tests/clients)
    // =========================================================================

    /**
     * Transitions a project's kind and publishes the kind-transition event.
     *
     * @param root the project source root; must not be null
     * @param target the target project kind; must not be null
     * @throws IllegalStateException if the kind transition is invalid
     */
    public void transitionKind(SourceRoot root, ProjectKind target) {
        Objects.requireNonNull(root, "root must not be null");
        Objects.requireNonNull(target, "target must not be null");

        registry.get(root).ifPresent(project -> {
            project.transitionKind(target);
            publishWm(EventKind.WORKSPACE_PROJECT_KIND_TRANSITIONED, root);
        });
    }

    /**
     * Test-only hook: simulates heap pressure by invoking the eviction callback.
     */
    public void simulateHeapPressure() {
        heapListener.simulateThresholdExceeded();
    }

    /**
     * Shuts down the service and releases resources.
     */
    public void shutdown() {
        heapListener.stop();
        registry.shutdown();
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    /**
     * Resolves the source root for a given path.
     * If the path is a file, check the parent directory.
     * Walks up to find Ballerina.toml; if found, uses that directory as root.
     * If not found, uses the path itself (for single-file projects).
     *
     * @param normalized absolute, normalized path
     * @return source root
     */
    private SourceRoot resolveSourceRoot(Path normalized) {
        // Check if normalized path itself or its parent directory contains Ballerina.toml
        Path currentCheck = normalized;
        if (normalized.toFile().isFile()) {
            currentCheck = normalized.getParent();
        }

        // Walk up to find Ballerina.toml
        Path current = currentCheck;
        while (current != null) {
            if (current.resolve("Ballerina.toml").toFile().exists()) {
                return new SourceRoot(current);
            }
            current = current.getParent();
        }

        // Not found; use the current directory as root (for single-file projects)
        return new SourceRoot(currentCheck != null ? currentCheck : normalized);
    }

    /**
     * Detects the project kind based on whether Ballerina.toml exists at the root.
     *
     * @param root the source root
     * @return BUILD if Ballerina.toml exists, SINGLE_FILE otherwise
     */
    private ProjectKind detectKind(SourceRoot root) {
        if (root.path().resolve("Ballerina.toml").toFile().exists()) {
            return ProjectKind.BUILD;
        }
        return ProjectKind.SINGLE_FILE;
    }

    /**
     * Parses a path string safely.
     *
     * @param pathStr the path string
     * @return parsed path
     */
    private Path parsePath(String pathStr) {
        try {
            return Path.of(pathStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid path: " + pathStr, e);
        }
    }

    /**
     * Publishes a workspace-manager event with a root.
     *
     * @param kind event kind
     * @param root affected source root
     */
    private void publishWm(EventKind kind, SourceRoot root) {
        eventBus.publish(new DomainEvent(Instant.now(), "workspace-manager", kind,
                root.path().toString()));
    }

    /**
     * Publishes a workspace-manager event without a specific root.
     *
     * @param kind event kind
     */
    private void publishWmNoRoot(EventKind kind) {
        eventBus.publish(new DomainEvent(Instant.now(), "workspace-manager", kind,
                "workspace-manager"));
    }
}
