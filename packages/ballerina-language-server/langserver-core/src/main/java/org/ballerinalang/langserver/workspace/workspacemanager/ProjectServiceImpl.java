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
import org.ballerinalang.langserver.workspace.eventbus.event.BatchEvent;
import org.ballerinalang.langserver.workspace.eventbus.event.CompilerEvent;
import org.ballerinalang.langserver.workspace.eventbus.event.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.event.HeapPressureEvent;
import org.ballerinalang.langserver.workspace.eventbus.event.ProjectEvent;
import org.ballerinalang.langserver.workspace.eventbus.ProjectEvictedEvent;
import org.ballerinalang.langserver.workspace.eventbus.ProjectKindTransitionedEvent;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.resourcemonitor.HeapPressureLevel;
import org.ballerinalang.langserver.workspace.workspacemanager.change.BufferedChange;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeApplier;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeBuffer;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ChangeLayer;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ContentVersion;
import org.ballerinalang.langserver.workspace.workspacemanager.project.EvictionReason;
import org.ballerinalang.langserver.workspace.workspacemanager.project.ProjectHealthState;
import org.ballerinalang.langserver.workspace.workspacemanager.project.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.project.ProjectTier;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.DocumentUri;
import org.ballerinalang.langserver.workspace.workspacemanager.uri.UriResolver;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.net.URI;
import java.nio.file.Path;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import javax.annotation.Nonnull;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Service layer implementation managing workspace projects.
 *
 * <p>Implements {@link ProjectService} and coordinates:
 * <ul>
 *   <li>Compiler project caching via {@link UriResolver}</li>
 *   <li>Workspace-only lifecycle metadata via internal state maps</li>
 *   <li>URI resolution via {@link UriResolver} (lock-free trie cache per ADR-048)</li>
 *   <li>Heap pressure monitoring via {@link HeapPressureLevel} event subscriptions</li>
 *   <li>Domain event publishing and subscription via {@link EventSyncPubSubHolder}</li>
 * </ul>
 * </p>
 *
 * @since 1.7.0
 */
public final class ProjectServiceImpl implements ProjectService {

    private static final int DEFAULT_MAX_PROJECTS = 32;
    private static final String BALLERINA_TOML = "Ballerina.toml";
    private static final String DEPENDENCIES_TOML = "Dependencies.toml";
    private static final Set<String> BUFFERED_TOML_FILES = Set.of(BALLERINA_TOML, DEPENDENCIES_TOML, "Cloud.toml");

    private final UriResolver uriResolver;
    private final EventSyncPubSubHolder eventBus;
    private final ProjectLoader loader;
    private final ChangeBuffer changeBuffer;
    private final ChangeApplier changeApplier;
    private final ConcurrentHashMap<DocumentUri,
            org.ballerinalang.langserver.workspace.workspacemanager.project.Project> workspaceProjects;
    /** Per-URI monotonically increasing version counter for EDITOR-layer buffered changes. */
    private final ConcurrentHashMap<DocumentUri, AtomicInteger> versionCounters;
    private final ConcurrentHashMap<Path, AtomicInteger> dependenciesSelfWriteTokens;
    private final ConcurrentHashMap<DocumentUri, Set<EventKind>> observedCompilerSignals;

    /**
     * Constructs a project service with full wiring of dependencies.
     *
     * @param eventBus event bus; must not be null
     * @param loader Ballerina project loader; must not be null
     * @param changeBuffer per-URI, per-layer change buffer; must not be null
     * @throws NullPointerException if any argument is null
     */
    public ProjectServiceImpl(@Nonnull EventSyncPubSubHolder eventBus, @Nonnull ProjectLoader loader,
                              @Nonnull ChangeBuffer changeBuffer) {
        this.eventBus = eventBus;
        this.loader = loader;
        this.changeBuffer = changeBuffer;
        this.workspaceProjects = new ConcurrentHashMap<>();
        this.versionCounters = new ConcurrentHashMap<>();
        this.dependenciesSelfWriteTokens = new ConcurrentHashMap<>();
        this.observedCompilerSignals = new ConcurrentHashMap<>();
        this.uriResolver = new UriResolver(DEFAULT_MAX_PROJECTS, this::onImplicitProjectEviction);
        this.changeApplier = new ChangeApplier(changeBuffer, this.uriResolver);
        subscribeToEvents();
    }

    /**
     * Constructs a project service with an injectable change applier.
     *
     * @param eventBus event bus
     * @param loader project loader
     * @param changeBuffer change buffer
     * @param changeApplier change applier
     */
    public ProjectServiceImpl(@Nonnull EventSyncPubSubHolder eventBus, @Nonnull ProjectLoader loader,
                              @Nonnull ChangeBuffer changeBuffer, @Nonnull ChangeApplier changeApplier) {
        this.eventBus = eventBus;
        this.loader = loader;
        this.changeBuffer = changeBuffer;
        this.workspaceProjects = new ConcurrentHashMap<>();
        this.versionCounters = new ConcurrentHashMap<>();
        this.dependenciesSelfWriteTokens = new ConcurrentHashMap<>();
        this.observedCompilerSignals = new ConcurrentHashMap<>();
        this.uriResolver = new UriResolver(DEFAULT_MAX_PROJECTS, this::onImplicitProjectEviction);
        this.changeApplier = changeApplier;
        subscribeToEvents();
    }

    // =========================================================================
    // ProjectService Interface Implementation
    // =========================================================================

    @Override
    public Project loadOrCreate(@Nonnull Path path, CancelChecker cancelChecker) {
        Path normalized = path.toAbsolutePath().normalize();
        DocumentUri root = resolveSourceRoot(normalized);
        Optional<Project> cached = uriResolver.getProject(root);
        if (cached.isPresent()) {
            return cached.get();
        }

        org.ballerinalang.langserver.workspace.workspacemanager.project.Project wmProject =
                workspaceProjects.computeIfAbsent(root,
                        ignored -> new org.ballerinalang.langserver.workspace.workspacemanager.project.Project(
                                root, detectKind(root)));
        try {
            Project loaded = loader.load(toFileUri(normalized), wmProject.kind());
            uriResolver.registerProject(root, loaded);
            publishWm(EventKind.WORKSPACE_PROJECT_REGISTERED, root);
            return loaded;
        } catch (Exception e) {
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
        return uriResolver.allProjects();
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
        boolean registeredAny = false;

        for (Path folder : workspaceFolders) {
            Path normalized = folder.toAbsolutePath().normalize();
            DocumentUri root = resolveSourceRoot(normalized);
            if (uriResolver.getProject(root).isPresent()) {
                continue;
            }
            try {
                org.ballerinalang.langserver.workspace.workspacemanager.project.Project wmProject =
                        workspaceProjects.computeIfAbsent(root,
                                ignored -> new org.ballerinalang.langserver.workspace.workspacemanager.project.Project(
                                        root, detectKind(root)));
                uriResolver.registerProject(root, loader.load(root, wmProject.kind()));
                registeredAny = true;
            } catch (Exception e) {
                System.err.println("Warning: Failed to register workspace project at " + root + ": " + e);
            }
        }
        if (registeredAny) {
            eventBus.publish(new BatchEvent());
        }
    }

    // =========================================================================
    // Event Subscription Handlers
    // =========================================================================

    private void onCompilationFailed(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        DocumentUri root = new DocumentUri.FileUri(ce.sourceRoot());
        workspaceProjects.computeIfPresent(root, (key, project) -> {
            try {
                project.transitionTo(ProjectHealthState.COMPILATION_CRASHED);
                publishWm(EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED, project.sourceRoot());
            } catch (IllegalStateException stateError) {
                // Already in that state or invalid arc — skip (ADR-033)
            }
            return project;
        });
    }

    private void onDiagnosticsReady(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        DocumentUri root = new DocumentUri.FileUri(ce.sourceRoot());
        recordCompilerSignal(root, event.eventKind());
        workspaceProjects.computeIfPresent(root, (key, project) -> {
            if (project.healthState() == ProjectHealthState.RECOVERING) {
                try {
                    project.transitionTo(ProjectHealthState.HEALTHY);
                    publishWm(EventKind.WORKSPACE_PROJECT_HEALTH_STATE_CHANGED, project.sourceRoot());
                } catch (IllegalStateException stateError) {
                    // Invalid state transition — skip (ADR-033)
                }
            }
            return project;
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
        workspaceProject(root).ifPresent(project -> transitionProject(project, ProjectHealthState.RECOVERING));
    }

    private void onResolutionExhausted(DomainEvent event) {
        if (!(event instanceof CompilerEvent ce)) {
            return;
        }
        DocumentUri root = new DocumentUri.FileUri(ce.sourceRoot());
        recordCompilerSignal(root, event.eventKind());
        workspaceProject(root).ifPresent(project -> transitionProject(project, ProjectHealthState.CIRCUIT_OPEN));
    }

    private void onHeapPressureDetected(DomainEvent event) {
        if (!(event instanceof HeapPressureEvent hpe)) {
            return;
        }
        switch (hpe.pressureLevel()) {
            case WARNING, CRITICAL, EMERGENCY -> workspaceProjects.forEach((root, project) -> {
                if (project.openDocumentCount().tier() == ProjectTier.BACKGROUND
                        && uriResolver.getProject(root).isPresent()) {
                    evictProject(root, EvictionReason.HEAP_PRESSURE);
                }
            });
            case NORMAL -> { }
        }
    }

    public boolean hasObservedCompilerSignal(@Nonnull DocumentUri root, @Nonnull EventKind signal) {
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
        workspaceProject(root).ifPresent(project -> {
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
            evictProject(resolveSourceRoot(normalized), EvictionReason.DOCUMENT_CLOSED);
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
            uriResolver.registerProject(resolveSourceRoot(normalized), updated);
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
            uriResolver.registerProject(resolveSourceRoot(normalized), updated.module().project());
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
        incrementOpenDocumentCount(uri);
        applyBufferedChanges();
    }

    @Override
    public void didChange(@Nonnull DocumentUri uri, @Nonnull List<TextDocumentContentChangeEvent> changes) {
        AtomicInteger counter = versionCounters.computeIfAbsent(uri, k -> new AtomicInteger(0));
        for (TextDocumentContentChangeEvent change : changes) {
            int version = counter.incrementAndGet();
            changeBuffer.append(uri, new BufferedChange(change, ChangeLayer.EDITOR, new ContentVersion(version)));
        }
        applyBufferedChanges();
    }

    @Override
    public void didClose(@Nonnull DocumentUri uri) {
        changeBuffer.clear(uri);
        versionCounters.remove(uri);
        decrementOpenDocumentCount(uri);
    }

    @Override
    public void didChangeWatchedFiles(@Nonnull List<FileEvent> events) {
        for (FileEvent event : events) {
            try {
                URI uri = URI.create(event.getUri());
                DocumentUri docUri = new DocumentUri.FileUri(uri);
                Path filePath = Path.of(uri).toAbsolutePath().normalize();
                if (isBufferedTomlFile(filePath)) {
                    if (isDependenciesToml(filePath) && consumeDependenciesTomlSelfWrite(filePath)) {
                        continue;
                    }
                    appendWatchedTomlChange(docUri, event.getType());
                    transitionProjectKindIfNeeded(filePath, event.getType());
                } else {
                    changeBuffer.routeWatcherEvent(docUri, event);
                }
                applyBufferedChanges();
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
     * Returns the resolver-backed compiler project cache.
     *
     * @return URI resolver instance
     */
    public @Nonnull UriResolver uriResolver() {
        return uriResolver;
    }

    /**
     * Returns the change applier bound to this service's resolver.
     *
     * @return change applier
     */
    public @Nonnull ChangeApplier changeApplier() {
        return changeApplier;
    }

    /**
     * Returns workspace lifecycle metadata for the given source root.
     *
     * @param root source root URI
     * @return workspace project metadata, if present
     */
    public @Nonnull Optional<org.ballerinalang.langserver.workspace.workspacemanager.project.Project> workspaceProject(
            @Nonnull DocumentUri root) {
        return Optional.ofNullable(workspaceProjects.get(root));
    }

    /**
     * Shuts down the service and releases resources.
     */
    public void shutdown() {
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
        if (!workspaceProjects.containsKey(root)) {
            return;
        }
        observedCompilerSignals.computeIfAbsent(root, ignored -> ConcurrentHashMap.newKeySet()).add(signal);
    }

    private void transitionProject(org.ballerinalang.langserver.workspace.workspacemanager.project.Project project,
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

    private void incrementOpenDocumentCount(DocumentUri uri) {
        resolveProjectRoot(uri).flatMap(this::workspaceProject).ifPresent(project -> {
            ProjectTier before = project.openDocumentCount().tier();
            project.openDocumentCount().increment();
            ProjectTier after = project.openDocumentCount().tier();
            if (before != after) {
                publishWm(EventKind.WORKSPACE_PROJECT_TIER_CHANGED, project.sourceRoot());
            }
        });
    }

    private void decrementOpenDocumentCount(DocumentUri uri) {
        resolveProjectRoot(uri).flatMap(this::workspaceProject).ifPresent(project -> {
            ProjectTier before = project.openDocumentCount().tier();
            project.openDocumentCount().decrement();
            ProjectTier after = project.openDocumentCount().tier();
            if (project.kind() == ProjectKind.SINGLE_FILE) {
                evictProject(pathOf(uri));
            }
            if (before != after) {
                publishWm(EventKind.WORKSPACE_PROJECT_TIER_CHANGED, project.sourceRoot());
            }
        });
    }

    private void applyBufferedChanges() {
        Set<DocumentUri> affectedRoots = changeApplier.applyAll();
        for (DocumentUri root : affectedRoots) {
            eventBus.publish(new ProjectEvent(EventKind.WORKSPACE_PROJECT_UPDATED, root.uri()));
        }
    }

    private Optional<DocumentUri> resolveProjectRoot(DocumentUri uri) {
        try {
            Optional<Project> project = uriResolver.project(uri);
            if (project.isPresent()) {
                return Optional.of(sourceRootLike(uri, project.get().sourceRoot()));
            }
        } catch (Exception ignored) {
            // Fall back to path-based root resolution below.
        }

        try {
            Path path = pathOf(uri);
            DocumentUri root = resolveSourceRoot(path);
            return Optional.of(sourceRootLike(uri, Path.of(root.uri())));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private DocumentUri sourceRootLike(DocumentUri uri, Path rootPath) {
        Path normalized = rootPath.toAbsolutePath().normalize();
        return switch (uri) {
            case DocumentUri.FileUri ignored -> new DocumentUri.FileUri(normalized.toUri());
            case DocumentUri.ExprUri ignored -> new DocumentUri.ExprUri(URI.create("expr://" + normalized.toUri().getPath()));
            case DocumentUri.AiUri ignored -> new DocumentUri.AiUri(URI.create("ai://" + normalized.toUri().getPath()));
        };
    }

    private Path pathOf(DocumentUri uri) {
        return Path.of(uri.uri().getPath()).toAbsolutePath().normalize();
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

    private void subscribeToEvents() {
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

    private void evictProject(@Nonnull DocumentUri root, @Nonnull EvictionReason reason) {
        if (uriResolver.getProject(root).isEmpty()) {
            return;
        }
        uriResolver.removeProject(root);
        workspaceProjects.remove(root);
        purgeEntriesForRoot(root);
        eventBus.publish(new ProjectEvictedEvent(root.uri(), reason));
    }

    private void onImplicitProjectEviction(@Nonnull DocumentUri root) {
        workspaceProjects.remove(root);
        purgeEntriesForRoot(root);
        eventBus.publish(new ProjectEvictedEvent(root.uri(), EvictionReason.LRU_EVICTION));
    }
}
