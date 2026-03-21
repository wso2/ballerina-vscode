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

import io.ballerina.projects.Document;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.Project;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.eventbus.BatchEvent;
import org.ballerinalang.langserver.workspace.eventbus.CompilerEvent;
import org.ballerinalang.langserver.workspace.eventbus.DocumentEvent;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.FileWatchedChangedEvent;
import org.ballerinalang.langserver.workspace.eventbus.HeapPressureEvent;
import org.ballerinalang.langserver.workspace.eventbus.ProjectEvent;
import org.ballerinalang.langserver.workspace.eventbus.ProjectEvictedEvent;
import org.ballerinalang.langserver.workspace.eventbus.ProjectKindTransitionedEvent;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureLevel;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.net.URI;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service layer implementation managing workspace projects.
 *
 * <p>Implements {@link ProjectService} and coordinates:
 * <ul>
 *   <li>Project lifecycle via {@link ProjectRegistry}</li>
 *   <li>Ballerina project caching via internal {@link ConcurrentHashMap}</li>
 *   <li>URI resolution via {@link UriResolver} (lock-free trie cache per ADR-048)</li>
 *   <li>Heap pressure monitoring via {@link HeapPressureLevel} event subscriptions</li>
 *   <li>Domain event publishing and subscription via {@link EventSyncPubSubHolder}</li>
 * </ul>
 * </p>
 *
 * <p>Wiring order is critical (ADR-009):
 * <ol>
 *   <li>Register self as ProjectRegistry listener for eviction/batch events</li>
 *   <li>Subscribe to incoming domain events</li>
 *   <li>Subscribe to RM-E1 heap pressure events</li>
 * </ol>
 * </p>
 *
 * @since 1.7.0
 */
public final class ProjectServiceImpl implements ProjectService, CacheInvalidationListener {

    private static final int DEFAULT_HEAP_MB = 64;
    private static final String BALLERINA_TOML = "Ballerina.toml";
    private static final String DEPENDENCIES_TOML = "Dependencies.toml";
    private static final Set<String> BUFFERED_TOML_FILES = Set.of(BALLERINA_TOML, DEPENDENCIES_TOML, "Cloud.toml");

    private final ProjectRegistry registry;
    private final UriResolver uriResolver;
    private final EventSyncPubSubHolder eventBus;
    private final ProjectLoader loader;
    private final ChangeBuffer changeBuffer;
    private final ConcurrentHashMap<DocumentUri, Project> ballerinaProjects;
    /** Per-URI monotonically increasing version counter for EDITOR-layer buffered changes. */
    private final ConcurrentHashMap<DocumentUri, AtomicInteger> versionCounters;
    private final ConcurrentHashMap<Path, AtomicInteger> dependenciesSelfWriteTokens;
    private final ConcurrentHashMap<DocumentUri, Set<EventKind>> observedCompilerSignals;

    /**
     * Constructs a project service with full wiring of dependencies.
     *
     * <p>Critical wiring order per ADR-009:
     * <ol>
     *   <li>Wire self as registry listener</li>
     *   <li>Subscribe to domain events</li>
     *   <li>Subscribe to RM-E1 heap pressure events</li>
     * </ol>
     * </p>
     *
     * @param registry project registry; must not be null
     * @param uriResolver URI resolver for lock-free path resolution; must not be null
     * @param eventBus event bus; must not be null
     * @param loader Ballerina project loader; must not be null
     * @param changeBuffer per-URI, per-layer change buffer; must not be null
     * @throws NullPointerException if any argument is null
     */
    public ProjectServiceImpl(@Nonnull ProjectRegistry registry, @Nonnull UriResolver uriResolver,
                              @Nonnull EventSyncPubSubHolder eventBus, @Nonnull ProjectLoader loader,
                              @Nonnull ChangeBuffer changeBuffer) {
        this.registry = registry;
        this.uriResolver = uriResolver;
        this.eventBus = eventBus;
        this.loader = loader;
        this.changeBuffer = changeBuffer;
        this.ballerinaProjects = new ConcurrentHashMap<>();
        this.versionCounters = new ConcurrentHashMap<>();
        this.dependenciesSelfWriteTokens = new ConcurrentHashMap<>();
        this.observedCompilerSignals = new ConcurrentHashMap<>();

        // 1. Wire self as registry listener for eviction and batch events
        registry.addListener(this);

        // 2. Subscribe to incoming domain events
        eventBus.subscribe("wm-document-opened", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_OPENED), this::onDocumentOpened);
        eventBus.subscribe("wm-document-closed", SubscriberTier.CRITICAL,
                Set.of(EventKind.WM_DOCUMENT_CLOSED), this::onDocumentClosed);
        eventBus.subscribe("wm-compilation-failed", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_COMPILATION_FAILED), this::onCompilationFailed);
        eventBus.subscribe("wm-diagnostics-ready", SubscriberTier.CRITICAL,
                Set.of(EventKind.CE_E5B_COMPILATION_DIAGNOSTICS_READY), this::onDiagnosticsReady);
        eventBus.subscribe("wm-resolution-diagnostics-ready", SubscriberTier.CRITICAL,
                Set.of(EventKind.CE_E5A_RESOLUTION_DIAGNOSTICS_READY), this::onResolutionDiagnosticsReady);
        eventBus.subscribe("wm-resolution-recovered", SubscriberTier.CRITICAL,
                Set.of(EventKind.CE_RESOLUTION_RECOVERED), this::onResolutionRecovered);
        eventBus.subscribe("wm-resolution-exhausted", SubscriberTier.CRITICAL,
                Set.of(EventKind.CE_RESOLUTION_EXHAUSTED), this::onResolutionExhausted);
        eventBus.subscribe("rm-heap-pressure", SubscriberTier.CRITICAL,
                Set.of(EventKind.RM_E1_HEAP_PRESSURE_DETECTED), this::onHeapPressureDetected);

    }

    // =========================================================================
    // ProjectService Interface Implementation
    // =========================================================================

    @Override
    public Project loadOrCreate(@Nonnull Path path, CancelChecker cancelChecker) {
        Path normalized = path.toAbsolutePath().normalize();

        // Fast path: check if already cached in UriResolver
        DocumentUri docUri = toFileUri(normalized);
        Optional<Project> cached = uriResolver.project(docUri);
        if (cached.isPresent()) {
            return cached.get();
        }

        // Slow path: resolve root, get-or-create WM project (ADR-019 mandate 2)
        DocumentUri root = resolveSourceRoot(normalized);
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

            // Register in UriResolver for fast-path resolution
            uriResolver.register(docUri, new ResolvedEntry.ProjectEntry(prev != null ? prev : bp));
            return prev != null ? prev : bp;
        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to load project for " + root, e);
        }
    }

    /**
     * Resolves a source-root identifier through the project service and loads the project.
     *
     * @param sourceRootIdentifier URI or path-like source root identifier
     * @param cancelChecker cancel checker
     * @return loaded project
     */
    public Project loadOrCreateFromIdentifier(@Nonnull String sourceRootIdentifier, CancelChecker cancelChecker) {
        return loadOrCreate(resolvePathFromIdentifier(sourceRootIdentifier), cancelChecker);
    }

    /**
     * Resolves a source-root identifier through the project service.
     *
     * @param sourceRootIdentifier URI or path-like source root identifier
     * @return normalized source root path
     */
    public Path resolvePathFromIdentifier(@Nonnull String sourceRootIdentifier) {
        return parsePath(sourceRootIdentifier).toAbsolutePath().normalize();
    }

    @Override
    public Collection<Project> allProjects() {
        return ballerinaProjects.values();
    }

    @Override
    public io.ballerina.projects.Module module(@Nonnull Path path, CancelChecker cancelChecker) {
        Project project = loadOrCreate(path, cancelChecker);
        try {
            io.ballerina.projects.DocumentId documentId = project.documentId(path);
            return project.currentPackage().module(documentId.moduleId());
        } catch (Exception e) {
            throw new RuntimeException("Failed to resolve module for path: " + path, e);
        }
    }

    @Override
    public LockingMode getLockingMode(@Nonnull Project project) {
        return LockingMode.valueOf(project.buildOptions().lockingMode().name());
    }

    @Override
    public void registerWorkspace(@Nonnull List<Path> workspaceFolders) {
        if (workspaceFolders.isEmpty()) {
            return; // No-op for empty list
        }

        // Scan all workspace folders and collect projects to register
        Map<DocumentUri, org.ballerinalang.langserver.workspace.workspacemanager.Project> toRegister =
                new HashMap<>();

        for (Path folder : workspaceFolders) {
            Path normalized = folder.toAbsolutePath().normalize();

            // Resolve the source root and detect kind
            DocumentUri root = resolveSourceRoot(normalized);
            ProjectKind kind = detectKind(root);

            // Check if already registered
            if (ballerinaProjects.containsKey(root)) {
                continue; // Skip already-registered projects
            }

            // Load Ballerina project
            try {
                Project bp = loader.load(root, kind);
                ballerinaProjects.putIfAbsent(root, bp);

                // Collect for batch registration in registry
                toRegister.putIfAbsent(root,
                        new org.ballerinalang.langserver.workspace.workspacemanager.Project(
                                root, kind, HeapEstimate.ofMb(DEFAULT_HEAP_MB)));

                // Register in UriResolver for fast-path resolution
                DocumentUri docUri = toFileUri(normalized);
                uriResolver.register(docUri, new ResolvedEntry.ProjectEntry(bp));
            } catch (Exception e) {
                // Log and continue with next folder
                System.err.println("Warning: Failed to register workspace project at " + root + ": " + e);
            }
        }

        // Batch-register all collected projects in the registry
        // This triggers BATCH_UPDATE → onCacheInvalidation → publishWmNoRoot(WM-E6)
        if (!toRegister.isEmpty()) {
            registry.putAll(toRegister);
        }
    }

    // =========================================================================
    // CacheInvalidationListener Implementation
    // =========================================================================

    @Override
    public void onCacheInvalidation(@Nonnull CacheInvalidationEvent event) {
        switch (event.type()) {
            case PROJECT_REMOVED -> {
                if (event.affectedRoot() != null) {
                    ballerinaProjects.remove(event.affectedRoot());
                    uriResolver.evictSubtree(event.affectedRoot());
                    purgeEntriesForRoot(event.affectedRoot());
                    EvictionReason reason = event.evictionReason() != null
                            ? event.evictionReason() : EvictionReason.DOCUMENT_CLOSED;
                    eventBus.publish(new ProjectEvictedEvent(event.affectedRoot().uri(), reason));
                }
            }
            case BATCH_UPDATE -> eventBus.publish(new BatchEvent());
            case PROJECT_ADDED -> {
                // UriResolver updates happen during loadOrCreate; no action needed here
            }
        }
    }

    // =========================================================================
    // Event Subscription Handlers
    // =========================================================================

    private void onDocumentOpened(DomainEvent event) {
        if (!(event instanceof DocumentEvent docEvent)) {
            return;
        }
        Path path = parsePath(docEvent.documentUri().toString());
        DocumentUri docUri = toFileUri(path);
        uriResolver.project(docUri).ifPresent(project -> {
                    // Find the WM project for tier tracking
                    DocumentUri rootUri = toFileUri(path.toAbsolutePath().normalize());
                    registry.get(rootUri).ifPresent(wmProject -> {
                        ProjectTier before = wmProject.openDocumentCount().tier();
                        wmProject.openDocumentCount().increment();
                        ProjectTier after = wmProject.openDocumentCount().tier();
                        if (before != after) {
                            publishWm(EventKind.WORKSPACE_PROJECT_TIER_CHANGED, wmProject.sourceRoot());
                        }
                    });
                });
    }

    private void onDocumentClosed(DomainEvent event) {
        if (!(event instanceof DocumentEvent docEvent)) {
            return;
        }
        Path path = parsePath(docEvent.documentUri().toString());
        DocumentUri docUri = toFileUri(path);
        uriResolver.project(docUri).ifPresent(project -> {
                    // Find the WM project for tier tracking
                    DocumentUri rootUri = toFileUri(path.toAbsolutePath().normalize());
                    registry.get(rootUri).ifPresent(wmProject -> {
                        ProjectTier before = wmProject.openDocumentCount().tier();
                        wmProject.openDocumentCount().decrement();
                        ProjectTier after = wmProject.openDocumentCount().tier();
                        if (wmProject.kind() == ProjectKind.SINGLE_FILE) {
                            evictProject(path);
                        }
                        if (before != after) {
                            publishWm(EventKind.WORKSPACE_PROJECT_TIER_CHANGED, wmProject.sourceRoot());
                        }
                    });
                });
    }

    private void onCompilationFailed(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        DocumentUri root = new DocumentUri.FileUri(ce.sourceRoot());
        registry.get(root).ifPresent(project -> {
            try {
                project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
                publishWm(EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED, project.sourceRoot());
            } catch (IllegalStateException ignored) {
                // Already in that state or invalid arc — skip (ADR-033)
            }
        });
    }

    private void onDiagnosticsReady(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        DocumentUri root = new DocumentUri.FileUri(ce.sourceRoot());
        recordCompilerSignal(root, event.eventKind());
        registry.get(root).ifPresent(project -> {
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

    private void onResolutionDiagnosticsReady(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        recordCompilerSignal(new DocumentUri.FileUri(ce.sourceRoot()), event.eventKind());
    }

    private void onResolutionRecovered(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        DocumentUri root = new DocumentUri.FileUri(ce.sourceRoot());
        recordCompilerSignal(root, event.eventKind());
        registry.get(root).ifPresent(project -> transitionProject(project, ProjectHealthState.RECOVERING));
    }

    private void onResolutionExhausted(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        DocumentUri root = new DocumentUri.FileUri(ce.sourceRoot());
        recordCompilerSignal(root, event.eventKind());
        registry.get(root).ifPresent(project -> transitionProject(project, ProjectHealthState.CIRCUIT_OPEN));
    }

    private void onHeapPressureDetected(DomainEvent event) {
        if (!(event instanceof HeapPressureEvent hpe)) {
            return;
        }
        switch (hpe.pressureLevel()) {
            case WARNING, CRITICAL, EMERGENCY -> registry.evictBackgroundProjects();
            case NORMAL -> { }
        }
    }

    boolean hasObservedCompilerSignal(@Nonnull DocumentUri root, @Nonnull EventKind signal) {
        return observedCompilerSignals.getOrDefault(root, Collections.emptySet()).contains(signal);
    }

    // =========================================================================
    // Service Methods (not in interface but used by tests/clients)
    // =========================================================================

    /**
     * Transitions a project's kind and publishes the kind-transition event.
     *
     * @param root the project source root URI; must not be null
     * @param target the target project kind; must not be null
     * @throws IllegalStateException if the kind transition is invalid
     */
    public void transitionKind(@Nonnull DocumentUri root, @Nonnull ProjectKind target) {
        registry.get(root).ifPresent(project -> {
            project.transitionKind(target);
            eventBus.publish(new ProjectKindTransitionedEvent(root.uri(), target));
        });
    }

    /**
     * Evicts the cached project for the given file path, forcing a fresh reload from
     * disk on the next loadOrCreate call.
     *
     * @param filePath a file path within the project to evict
     */
    public void evictProject(Path filePath) {
        Path normalized = filePath.toAbsolutePath().normalize();
        try {
            DocumentUri docUri = toFileUri(normalized);
            DocumentUri root = uriResolver.project(docUri)
                    .map(this::findSourceRoot)
                    .orElseGet(() -> resolveSourceRoot(normalized));
            registry.remove(root);
        } catch (Exception ignored) {
            // Path not resolvable — no-op.
        }
    }

    /**
     * Removes a document from the cached project when its file is deleted.
     * After removal, syntaxTree() fallback will find no document and return empty.
     *
     * @param filePath absolute path of the deleted file
     */
    public void removeDocumentFromProject(Path filePath) {
        Path normalized = filePath.toAbsolutePath().normalize();
        try {
            DocumentUri docUri = toFileUri(normalized);
            Optional<Project> cached = uriResolver.project(docUri);
            if (cached.isEmpty()) {
                return;
            }
            Project project = cached.get();
            DocumentId docId = project.documentId(normalized);
            Document document = project.currentPackage().module(docId.moduleId()).document(docId);
            Project updated = document.module().modify().removeDocument(docId).apply().project();
            // Update the resolver with the new project
            uriResolver.register(docUri, new ResolvedEntry.ProjectEntry(updated));
        } catch (Exception ignored) {
            // Document may not be in project or project not loaded — skip.
        }
    }

    /**
     * Applies in-memory content to a document in the cached project.
     * Called by WiringConfiguration when DS-E2 fires, so the synchronous
     * syntaxTree() fallback returns the latest editor content.
     *
     * @param filePath absolute, normalized path of the changed file
     * @param content  the current content to apply
     */
    public void applyDocumentContent(Path filePath, String content) {
        Path normalized = filePath.toAbsolutePath().normalize();
        try {
            // loadOrCreate is idempotent: returns cached project if already loaded.
            Project project = loadOrCreate(normalized, null);
            DocumentId docId = project.documentId(normalized);
            Module module = project.currentPackage().module(docId.moduleId());
            Document document = module.document(docId);
            // Ballerina project API is immutable: apply() returns a new Document in a new Project.
            Document updated = document.modify().withContent(content).apply();
            DocumentUri root = resolveSourceRoot(normalized);
            ballerinaProjects.put(root, updated.module().project());
        } catch (Exception ignored) {
            // File not yet in project or project not supporting this op — skip.
        }
    }

    // =========================================================================
    // Document Lifecycle Methods (T-044: absorb DocumentService into ProjectService)
    // =========================================================================

    @Override
    public void didOpen(@Nonnull DocumentUri uri, @Nonnull String content) {
        TextDocumentContentChangeEvent fullText = new TextDocumentContentChangeEvent(content);
        int version = versionCounters.computeIfAbsent(uri, k -> new AtomicInteger(0)).incrementAndGet();
        changeBuffer.append(uri, new BufferedChange(fullText, ChangeLayer.EDITOR, new ContentVersion(version)));

        publishDoc(EventKind.WM_DOCUMENT_OPENED, uri);
    }

    @Override
    public void didChange(@Nonnull DocumentUri uri, @Nonnull List<TextDocumentContentChangeEvent> changes) {
        AtomicInteger counter = versionCounters.computeIfAbsent(uri, k -> new AtomicInteger(0));
        for (TextDocumentContentChangeEvent change : changes) {
            int version = counter.incrementAndGet();
            changeBuffer.append(uri, new BufferedChange(change, ChangeLayer.EDITOR, new ContentVersion(version)));
        }

        publishDoc(EventKind.WM_DOCUMENT_CHANGED, uri);
    }

    @Override
    public void didClose(@Nonnull DocumentUri uri) {
        changeBuffer.clear(uri);
        versionCounters.remove(uri);

        publishDoc(EventKind.WM_DOCUMENT_CLOSED, uri);
    }

    @Override
    public void didChangeWatchedFiles(@Nonnull List<FileEvent> events) {
        for (FileEvent event : events) {
            try {
                URI uri = URI.create(event.getUri());
                DocumentUri docUri = new DocumentUri.FileUri(uri);
                Path filePath = Path.of(uri).toAbsolutePath().normalize();
                String changeScope;
                if (isBufferedTomlFile(filePath)) {
                    if (isDependenciesToml(filePath) && consumeDependenciesTomlSelfWrite(filePath)) {
                        continue;
                    }
                    appendWatchedTomlChange(docUri, event.getType());
                    transitionProjectKindIfNeeded(filePath, event.getType());
                    changeScope = "DEPENDENCY_GRAPH";
                } else {
                    changeBuffer.routeWatcherEvent(docUri, event);
                    changeScope = "SOURCE";
                }
                URI sourceRootUri = resolveSourceRootUri(docUri);
                eventBus.publish(new FileWatchedChangedEvent(sourceRootUri, uri, changeScope));
            } catch (Exception ignored) {
                // Malformed or non-file URI — skip this event
            }
        }
    }

    /**
     * Registers a self-write token for {@code Dependencies.toml} watcher suppression.
     *
     * @param dependenciesTomlPath dependencies file path
     */
    public void registerDependenciesTomlSelfWrite(@Nonnull Path dependenciesTomlPath) {
        Path normalized = dependenciesTomlPath.toAbsolutePath().normalize();
        if (!isDependenciesToml(normalized)) {
            return;
        }

        dependenciesSelfWriteTokens.compute(normalized, (path, counter) -> {
            if (counter == null) {
                return new AtomicInteger(1);
            }
            counter.incrementAndGet();
            return counter;
        });
    }

    /**
     * Test-only hook: simulates heap pressure by invoking the eviction callback.
     */
    public void simulateHeapPressure() {
        eventBus.publish(new HeapPressureEvent(HeapPressureLevel.WARNING));
    }

    /**
     * Shuts down the service and releases resources.
     */
    public void shutdown() {
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
     * @return source root URI
     */
    private DocumentUri resolveSourceRoot(Path normalized) {
        // Check if normalized path itself or its parent directory contains Ballerina.toml
        Path currentCheck = normalized;
        if (normalized.toFile().isFile()) {
            currentCheck = normalized.getParent();
        }

        // Walk up to find Ballerina.toml
        Path current = currentCheck;
        while (current != null) {
            if (current.resolve("Ballerina.toml").toFile().exists()) {
                return new DocumentUri.FileUri(current.toUri());
            }
            current = current.getParent();
        }

        // No Ballerina.toml found. For standalone .bal files, use the file path itself
        // as the source root so the projectLoader receives a file path that
        // BallerinaCompilerApi can recognise as a SingleFileProject.
        if (normalized.toFile().isFile()) {
            return new DocumentUri.FileUri(normalized.toUri());
        }
        return new DocumentUri.FileUri((currentCheck != null ? currentCheck : normalized).toUri());
    }

    /**
     * Resolves the source root URI for a document URI. Returns null if not resolvable.
     *
     * @param docUri the document URI
     * @return source root URI or null
     */
    @Nullable
    private URI resolveSourceRootUri(DocumentUri docUri) {
        try {
            return uriResolver.project(docUri)
                    .map(this::findSourceRoot)
                    .filter(root -> root != null)
                    .map(DocumentUri::uri)
                    .orElse(null);
        } catch (Exception ignored) {
            return null;
        }
    }

    /**
     * Detects the project kind based on whether Ballerina.toml exists at the root.
     *
     * @param root the source root URI
     * @return BUILD if Ballerina.toml exists, SINGLE_FILE otherwise
     */
    private ProjectKind detectKind(DocumentUri root) {
        Path rootPath = Path.of(root.uri().getPath());
        // A file-as-root means it's a standalone .bal file (single-file project).
        if (rootPath.toFile().isFile()) {
            return ProjectKind.SINGLE_FILE;
        }
        if (rootPath.resolve("Ballerina.toml").toFile().exists()) {
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
            java.net.URI uri = java.net.URI.create(pathStr);
            if (uri.getScheme() != null) {
                return Path.of(uri);
            }
        } catch (Exception ignored) {
            // Fall through to path-based parsing
        }
        try {
            return Path.of(pathStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid path: " + pathStr, e);
        }
    }

    private void appendWatchedTomlChange(DocumentUri uri, FileChangeType changeType) {
        AtomicInteger counter = versionCounters.computeIfAbsent(uri, key -> new AtomicInteger(0));
        int version = counter.incrementAndGet();
        TextDocumentContentChangeEvent change = new TextDocumentContentChangeEvent(changeType.name());
        changeBuffer.append(uri, new BufferedChange(change, ChangeLayer.EDITOR, new ContentVersion(version)));
    }

    private void transitionProjectKindIfNeeded(Path filePath, FileChangeType changeType) {
        if (!isBallerinaToml(filePath)
                || (changeType != FileChangeType.Created && changeType != FileChangeType.Deleted)) {
            return;
        }

        Path rootPath = filePath.getParent();
        if (rootPath == null) {
            return;
        }

        ProjectKind targetKind = changeType == FileChangeType.Created ? ProjectKind.BUILD : ProjectKind.SINGLE_FILE;
        try {
            transitionKind(new DocumentUri.FileUri(rootPath.toAbsolutePath().normalize().toUri()), targetKind);
        } catch (IllegalStateException ignored) {
            // Ignore duplicate or otherwise invalid transitions from watcher replays.
        }
    }

    private boolean consumeDependenciesTomlSelfWrite(Path dependenciesTomlPath) {
        AtomicInteger counter = dependenciesSelfWriteTokens.get(dependenciesTomlPath);
        if (counter == null) {
            return false;
        }

        while (true) {
            int current = counter.get();
            if (current <= 0) {
                dependenciesSelfWriteTokens.remove(dependenciesTomlPath, counter);
                return false;
            }
            if (!counter.compareAndSet(current, current - 1)) {
                continue;
            }
            if (current == 1) {
                dependenciesSelfWriteTokens.remove(dependenciesTomlPath, counter);
            }
            return true;
        }
    }

    private boolean isBufferedTomlFile(Path path) {
        Path fileName = path.getFileName();
        return fileName != null && BUFFERED_TOML_FILES.contains(fileName.toString());
    }

    private boolean isBallerinaToml(Path path) {
        Path fileName = path.getFileName();
        return fileName != null && BALLERINA_TOML.equals(fileName.toString());
    }

    private boolean isDependenciesToml(Path path) {
        Path fileName = path.getFileName();
        return fileName != null && DEPENDENCIES_TOML.equals(fileName.toString());
    }

    /**
     * Publishes a workspace-manager event with a root.
     *
     * @param kind event kind
     * @param root affected source root URI
     */
    private void publishWm(EventKind kind, DocumentUri root) {
        eventBus.publish(new ProjectEvent(kind, root.uri()));
    }

    private void recordCompilerSignal(DocumentUri root, EventKind signal) {
        if (registry.get(root).isEmpty()) {
            return;
        }
        observedCompilerSignals.computeIfAbsent(root, ignored -> ConcurrentHashMap.newKeySet()).add(signal);
    }

    private void transitionProject(org.ballerinalang.langserver.workspace.workspacemanager.Project project,
                                   ProjectHealthState target) {
        try {
            if (project.healthState() != target) {
                project.transitionTo(target);
                publishWm(EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED, project.sourceRoot());
            }
        } catch (IllegalStateException ignored) {
            // Ignore compiler lifecycle signals that do not map to a valid arc for the current state.
        }
    }

    /**
     * Publishes a workspace-manager document event with the document URI as the coalesce scope.
     * The URI string is used so consumers can reconstruct the path via {@link URI} or {@link Path#of(URI)}.
     *
     * @param kind event kind
     * @param uri  document URI
     */
    private void publishDoc(EventKind kind, DocumentUri uri) {
        URI sourceRootUri = resolveSourceRootUri(uri);
        eventBus.publish(new DocumentEvent(kind, sourceRootUri, uri.uri()));
    }

    /**
     * Converts a Path to a DocumentUri.FileUri.
     *
     * @param path the file path
     * @return a DocumentUri for the path
     */
    private static DocumentUri toFileUri(Path path) {
        URI uri = path.toUri();
        return new DocumentUri.FileUri(uri);
    }

    /**
     * Finds the DocumentUri (source root) for a Ballerina project by searching in ballerinaProjects.
     * This is used when we have a Project but need to find its corresponding source root URI.
     *
     * @param project the Ballerina project
     * @return the source root URI if found, or null if not found
     */
    @Nullable
    private DocumentUri findSourceRoot(Project project) {
        for (Map.Entry<DocumentUri, Project> entry : ballerinaProjects.entrySet()) {
            if (entry.getValue() == project) {
                return entry.getKey();
            }
        }
        return null;
    }

    /**
     * Removes all secondary map entries associated with the given source root.
     *
     * <p>Cleans up per-document entries ({@code versionCounters}, {@code changeBuffer}) whose
     * URI path falls under the source root, the per-root {@code observedCompilerSignals} entry,
     * and any {@code dependenciesSelfWriteTokens} whose path is within the source root directory.</p>
     *
     * @param root the evicted source root
     */
    private void purgeEntriesForRoot(DocumentUri root) {
        String rootPath = root.uri().getPath();

        // Per-document entries: version counters and change buffer
        versionCounters.keySet().removeIf(uri -> uri.uri().getPath().startsWith(rootPath));
        changeBuffer.clearSubtree(rootPath);

        // Per-root compiler signals
        observedCompilerSignals.remove(root);

        // Dependencies.toml self-write tokens
        Path rootDir = Path.of(root.uri()).toAbsolutePath().normalize();
        dependenciesSelfWriteTokens.keySet().removeIf(path ->
                path.toAbsolutePath().normalize().startsWith(rootDir));
    }
}
