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

package org.ballerinalang.langserver.workspace.documentstore;

import io.ballerina.projects.Document;
import org.ballerinalang.langserver.workspace.eventbus.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileChangeType;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.Range;
import org.eclipse.lsp4j.TextDocumentContentChangeEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.net.URI;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

/**
 * Document Store service implementation that wires VFS operations with event bus publishing.
 *
 * @since 1.7.0
 */
public final class DocumentServiceImpl implements DocumentService {

    private static final String SOURCE_CONTEXT = "documentstore";
    private static final int MAX_CONFIG_FILES = 512;
    private static final int MAX_SELF_WRITE_TOKENS = 256;

    private final VirtualFileSystem virtualFileSystem;
    private final EventSyncPubSubHolder eventBus;
    private final Function<Path, Path> projectRootResolver;
    private final FileWatcherProcessor fileWatcherProcessor;
    private final SandboxModule.Registry sandboxRegistry;
    private final Map<Path, Set<DocumentUri>> trackedDocumentsByRoot;
    private final Map<Path, Set<DocumentUri>> trackedSandboxesByRoot;
    private final Map<Path, ConfigurationFile> trackedConfigFiles;
    private final Map<Path, Integer> dependenciesSelfWriteTokens;

    /**
     * Creates a service with the default 150ms watcher debounce.
     *
     * @param virtualFileSystem virtual file system authority
     * @param eventBus shared event bus
     * @param projectRootResolver source-root resolver
     */
    public DocumentServiceImpl(VirtualFileSystem virtualFileSystem, EventSyncPubSubHolder eventBus,
                               Function<Path, Path> projectRootResolver) {
        this(virtualFileSystem, eventBus, projectRootResolver, FileWatcherProcessor.DEFAULT_DEBOUNCE_MILLIS);
    }

    /**
     * Creates a service with a custom watcher debounce.
     *
     * @param virtualFileSystem virtual file system authority
     * @param eventBus shared event bus
     * @param projectRootResolver source-root resolver
     * @param watcherDebounceMillis watcher debounce window in milliseconds
     */
    public DocumentServiceImpl(VirtualFileSystem virtualFileSystem, EventSyncPubSubHolder eventBus,
                               Function<Path, Path> projectRootResolver, long watcherDebounceMillis) {
        this.virtualFileSystem = Objects.requireNonNull(virtualFileSystem, "virtualFileSystem must not be null");
        this.eventBus = Objects.requireNonNull(eventBus, "eventBus must not be null");
        this.projectRootResolver = Objects.requireNonNull(projectRootResolver, "projectRootResolver must not be null");
        this.sandboxRegistry = new SandboxModule.Registry();
        this.trackedDocumentsByRoot = new ConcurrentHashMap<>();
        this.trackedSandboxesByRoot = new ConcurrentHashMap<>();
        this.trackedConfigFiles = Collections.synchronizedMap(newLruMap(MAX_CONFIG_FILES));
        this.dependenciesSelfWriteTokens = Collections.synchronizedMap(newLruMap(MAX_SELF_WRITE_TOKENS));
        this.fileWatcherProcessor = new FileWatcherProcessor(virtualFileSystem, projectRootResolver,
                this::handleWatcherEvent, watcherDebounceMillis);

        String subscriberPrefix = "documentstore-" + System.identityHashCode(this);
        this.eventBus.subscribe(subscriberPrefix + "-snapshot", SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_SNAPSHOT_PUBLISHED), this::onSnapshotPublished);
        this.eventBus.subscribe(subscriberPrefix + "-evicted", SubscriberTier.CRITICAL,
                Set.of(EventKind.WORKSPACE_PROJECT_EVICTED), this::onProjectEvicted);
    }

    /**
     * Returns a compiler document when available.
     *
     * @param path source path
     * @param cancelChecker cancel checker
     * @return compiler document when available; otherwise {@code null}
     */
    @Override
    public Document document(Path path, CancelChecker cancelChecker) {
        Objects.requireNonNull(path, "path must not be null");
        checkCanceled(cancelChecker);
        virtualFileSystem.content(fileUri(path));
        return null;
    }

    /**
     * Returns source-root relative path.
     *
     * @param path source path
     * @param cancelChecker cancel checker
     * @return relative path string
     */
    @Override
    public String relativePath(Path path, CancelChecker cancelChecker) {
        Objects.requireNonNull(path, "path must not be null");
        checkCanceled(cancelChecker);

        Path normalized = normalize(path);
        Path sourceRoot = resolveSourceRoot(normalized);
        if (sourceRoot.equals(normalized)) {
            return normalized.getFileName() == null ? "" : normalized.getFileName().toString();
        }
        return sourceRoot.relativize(normalized).toString();
    }

    /**
     * Returns the accepted URI scheme.
     *
     * @return {@code null} to accept all schemes
     */
    @Override
    public String uriScheme() {
        return null;
    }

    /**
     * Handles didOpen command.
     *
     * @param path source path
     * @param params open event
     */
    @Override
    public void didOpen(Path path, DidOpenTextDocumentParams params) {
        Objects.requireNonNull(params, "params must not be null");
        Objects.requireNonNull(params.getTextDocument(), "textDocument must not be null");

        DocumentUri uri = parseDocumentUri(params.getTextDocument().getUri());
        String content = params.getTextDocument().getText();
        if (content == null) {
            content = "";
        }

        Path sourceRoot = resolveSourceRoot(resolveCommandPath(path, uri));
        if (uri instanceof DocumentUri.ExprUri || uri instanceof DocumentUri.AiUri) {
            sandboxRegistry.create(uri, sourceRoot, content);
            trackByRoot(trackedSandboxesByRoot, sourceRoot, uri);
            return;
        }

        virtualFileSystem.openDocument(uri, content);
        trackByRoot(trackedDocumentsByRoot, sourceRoot, uri);
        publish(EventKind.DOCUMENT_OPENED, sourceRoot.toString(), uri.toString());
    }

    /**
     * Handles didChange command.
     *
     * @param path source path
     * @param params change event
     */
    @Override
    public void didChange(Path path, DidChangeTextDocumentParams params) {
        Objects.requireNonNull(params, "params must not be null");
        Objects.requireNonNull(params.getTextDocument(), "textDocument must not be null");

        DocumentUri uri = parseDocumentUri(params.getTextDocument().getUri());
        Path commandPath = resolveCommandPath(path, uri);
        Path sourceRoot = resolveSourceRoot(commandPath);

        if (uri instanceof DocumentUri.ExprUri || uri instanceof DocumentUri.AiUri) {
            String latest = latestChangeText(params);
            sandboxRegistry.remove(uri);
            sandboxRegistry.create(uri, sourceRoot, latest);
            trackByRoot(trackedSandboxesByRoot, sourceRoot, uri);
            return;
        }

        for (TextDocumentContentChangeEvent changeEvent : params.getContentChanges()) {
            applyContentChange(uri, changeEvent);
        }

        publish(EventKind.DOCUMENT_CHANGED, sourceRoot.toString(), uri.toString());
        updateConfigFile(commandPath, FileChangeType.Changed, virtualFileSystem.content(uri));
    }

    /**
     * Handles didClose command.
     *
     * @param path source path
     * @param params close event
     */
    @Override
    public void didClose(Path path, DidCloseTextDocumentParams params) {
        Objects.requireNonNull(params, "params must not be null");
        Objects.requireNonNull(params.getTextDocument(), "textDocument must not be null");

        DocumentUri uri = parseDocumentUri(params.getTextDocument().getUri());
        Path commandPath = resolveCommandPath(path, uri);
        Path sourceRoot = resolveSourceRoot(commandPath);

        if (uri instanceof DocumentUri.ExprUri || uri instanceof DocumentUri.AiUri) {
            sandboxRegistry.remove(uri);
            untrackByRoot(trackedSandboxesByRoot, sourceRoot, uri);
            return;
        }

        virtualFileSystem.closeDocument(uri);
        untrackByRoot(trackedDocumentsByRoot, sourceRoot, uri);
        publish(EventKind.DOCUMENT_CLOSED, sourceRoot.toString(), uri.toString());
    }

    /**
     * Handles a single watched file event.
     *
     * @param path source path
     * @param event file event
     */
    @Override
    public void didChangeWatched(Path path, FileEvent event) {
        if (event == null) {
            return;
        }
        fileWatcherProcessor.submit(event);
    }

    /**
     * Handles a watched file event batch.
     *
     * @param params watched file batch event
     */
    @Override
    public void didChangeWatched(DidChangeWatchedFilesParams params) {
        if (params == null || params.getChanges() == null) {
            return;
        }
        for (FileEvent event : params.getChanges()) {
            didChangeWatched(null, event);
        }
    }

    /**
     * Returns the current VFS content for a file that is open in the editor,
     * or {@code null} if the file is not overlaid.
     *
     * @param path file path
     * @return in-memory editor content, or {@code null} if not open
     */
    @Override
    public String openFileContent(Path path) {
        Objects.requireNonNull(path, "path must not be null");
        DocumentUri.FileUri uri = fileUri(path);
        return virtualFileSystem.isOverlaid(uri) ? virtualFileSystem.content(uri) : null;
    }

    /**
     * Closes the VFS overlay for a deleted file without writing to disk,
     * so subsequent {@code openFileContent} calls return {@code null} for this file.
     *
     * @param path file path to close in the VFS
     */
    @Override
    public void closeDeletedDocument(Path path) {
        if (path == null) {
            return;
        }
        try {
            virtualFileSystem.removeOverlay(fileUri(path));
        } catch (Exception ignored) {
            // File may not be in VFS — no-op.
        }
    }

    /**
     * Registers a self-write token for Dependencies.toml suppression.
     *
     * @param dependenciesTomlPath dependencies file path
     */
    public void registerDependenciesTomlSelfWrite(Path dependenciesTomlPath) {
        Objects.requireNonNull(dependenciesTomlPath, "dependenciesTomlPath must not be null");
        Path normalized = normalize(dependenciesTomlPath);
        if (classifyConfigFileType(normalized) != ConfigFileType.DEPENDENCIES_TOML) {
            return;
        }

        synchronized (dependenciesSelfWriteTokens) {
            int count = dependenciesSelfWriteTokens.getOrDefault(normalized, 0);
            dependenciesSelfWriteTokens.put(normalized, count + 1);
        }
    }

    private void onSnapshotPublished(DomainEvent event) {
        Path sourceRoot = parseSourceRoot(event.sourceContext());
        invalidateSandboxes(sourceRoot);
    }

    private void onProjectEvicted(DomainEvent event) {
        Path sourceRoot = parseSourceRoot(event.sourceContext());
        cleanupTrackedDocuments(sourceRoot);
        cleanupTrackedSandboxes(sourceRoot);
        cleanupTrackedConfigFiles(sourceRoot);
    }

    private void handleWatcherEvent(Path sourceRoot, Path filePath, FileChangeType changeType) {
        try {
            updateConfigFile(filePath, changeType, null);
            if (!isConfigFile(filePath) && changeType == FileChangeType.Changed) {
                virtualFileSystem.refreshFromDisk(fileUri(filePath));
                publish(EventKind.DOCUMENT_CHANGED, sourceRoot.toString(), filePath.toString());
            }
        } finally {
            publish(EventKind.DOCUMENT_FILE_WATCHER_EVENTS_PROCESSED, sourceRoot.toString(), filePath.toString());
        }
    }

    private void updateConfigFile(Path path, FileChangeType changeType, String explicitContent) {
        Path normalized = normalize(path);
        ConfigFileType configFileType = classifyConfigFileType(normalized);
        if (configFileType == null) {
            return;
        }

        if (configFileType == ConfigFileType.DEPENDENCIES_TOML && consumeSelfWriteToken(normalized)) {
            return;
        }

        String content = resolveConfigContent(normalized, changeType, explicitContent);
        ConfigurationFile existing;
        synchronized (trackedConfigFiles) {
            existing = trackedConfigFiles.get(normalized);
        }

        ConfigurationFile configurationFile = existing == null
                ? new ConfigurationFile(fileUri(normalized), configFileType, content)
                : existing.withContent(content);

        synchronized (trackedConfigFiles) {
            trackedConfigFiles.put(normalized, configurationFile);
        }

        ReactivityTier tier = configurationFile.classify(changeType);
        Path sourceRoot = resolveSourceRoot(normalized);
        publish(EventKind.DOCUMENT_CONFIG_FILE_CHANGED, sourceRoot.toString(),
                normalized + "|" + tier.name() + "|" + changeType.name());
    }

    private String resolveConfigContent(Path path, FileChangeType changeType, String explicitContent) {
        if (changeType == FileChangeType.Deleted) {
            return "";
        }
        if (explicitContent != null) {
            return explicitContent;
        }

        DocumentUri fileUri = fileUri(path);
        if (!virtualFileSystem.isOverlaid(fileUri)) {
            virtualFileSystem.refreshFromDisk(fileUri);
        }
        return virtualFileSystem.content(fileUri);
    }

    private boolean consumeSelfWriteToken(Path dependenciesTomlPath) {
        synchronized (dependenciesSelfWriteTokens) {
            Integer count = dependenciesSelfWriteTokens.get(dependenciesTomlPath);
            if (count == null || count == 0) {
                return false;
            }
            if (count == 1) {
                dependenciesSelfWriteTokens.remove(dependenciesTomlPath);
            } else {
                dependenciesSelfWriteTokens.put(dependenciesTomlPath, count - 1);
            }
            return true;
        }
    }

    private void invalidateSandboxes(Path sourceRoot) {
        Set<DocumentUri> sandboxUris = trackedSandboxesByRoot.remove(sourceRoot);
        if (sandboxUris == null || sandboxUris.isEmpty()) {
            return;
        }

        for (DocumentUri sandboxUri : sandboxUris) {
            sandboxRegistry.remove(sandboxUri);
            publish(EventKind.DOCUMENT_SANDBOX_INVALIDATED, sourceRoot.toString(), sandboxUri.toString());
        }
    }

    private void cleanupTrackedDocuments(Path sourceRoot) {
        Set<DocumentUri> tracked = trackedDocumentsByRoot.remove(sourceRoot);
        if (tracked == null || tracked.isEmpty()) {
            return;
        }

        for (DocumentUri uri : tracked) {
            if (uri instanceof DocumentUri.FileUri) {
                virtualFileSystem.closeDocument(uri);
            }
        }
    }

    private void cleanupTrackedSandboxes(Path sourceRoot) {
        Set<DocumentUri> tracked = trackedSandboxesByRoot.remove(sourceRoot);
        if (tracked == null || tracked.isEmpty()) {
            return;
        }

        for (DocumentUri uri : tracked) {
            sandboxRegistry.remove(uri);
        }
    }

    private void cleanupTrackedConfigFiles(Path sourceRoot) {
        synchronized (trackedConfigFiles) {
            trackedConfigFiles.entrySet().removeIf(entry -> entry.getKey().startsWith(sourceRoot));
        }
    }

    private void applyContentChange(DocumentUri uri, TextDocumentContentChangeEvent changeEvent) {
        Objects.requireNonNull(changeEvent, "changeEvent must not be null");
        if (changeEvent.getRange() == null) {
            virtualFileSystem.updateDocument(uri, changeEvent.getText());
            return;
        }

        virtualFileSystem.applyIncrementalEdit(uri, toTextRange(changeEvent.getRange()), changeEvent.getText());
    }

    private static TextRange toTextRange(Range range) {
        return new TextRange(range.getStart().getLine(), range.getStart().getCharacter(),
                range.getEnd().getLine(), range.getEnd().getCharacter());
    }

    private static String latestChangeText(DidChangeTextDocumentParams params) {
        if (params.getContentChanges() == null || params.getContentChanges().isEmpty()) {
            return "";
        }

        TextDocumentContentChangeEvent last = params.getContentChanges().get(params.getContentChanges().size() - 1);
        return last.getText() == null ? "" : last.getText();
    }

    private static Path resolveCommandPath(Path path, DocumentUri uri) {
        if (uri instanceof DocumentUri.FileUri fileUri) {
            return normalize(Path.of(fileUri.uri()));
        }
        if (path == null) {
            throw new IllegalArgumentException("path must be provided for non-file URI operations");
        }
        return normalize(path);
    }

    private static Path normalize(Path path) {
        return path.toAbsolutePath().normalize();
    }

    private Path resolveSourceRoot(Path path) {
        Path resolved = projectRootResolver.apply(path);
        if (resolved == null) {
            return path;
        }
        return normalize(resolved);
    }

    private static DocumentUri parseDocumentUri(String uriValue) {
        Objects.requireNonNull(uriValue, "uriValue must not be null");
        URI uri = URI.create(uriValue);
        String scheme = uri.getScheme();
        if (scheme == null) {
            throw new IllegalArgumentException("URI scheme must not be null: " + uriValue);
        }

        return switch (scheme) {
            case "file" -> new DocumentUri.FileUri(uri);
            case "expr" -> new DocumentUri.ExprUri(uri);
            case "ai" -> new DocumentUri.AiUri(uri);
            case "untitled" -> new DocumentUri.UntitledUri(uri);
            default -> throw new IllegalArgumentException("Unsupported URI scheme: " + scheme);
        };
    }

    private static DocumentUri.FileUri fileUri(Path path) {
        return new DocumentUri.FileUri(normalize(path).toUri());
    }

    private static ConfigFileType classifyConfigFileType(Path path) {
        String fileName = path.getFileName() == null ? "" : path.getFileName().toString().toLowerCase();
        return switch (fileName) {
            case "ballerina.toml" -> ConfigFileType.BALLERINA_TOML;
            case "dependencies.toml" -> ConfigFileType.DEPENDENCIES_TOML;
            case "cloud.toml" -> ConfigFileType.CLOUD_TOML;
            case "compiler-plugin.toml" -> ConfigFileType.COMPILER_PLUGIN_TOML;
            case "baltool.toml" -> ConfigFileType.BAL_TOOL_TOML;
            default -> null;
        };
    }

    private static boolean isConfigFile(Path path) {
        return classifyConfigFileType(path) != null;
    }

    private static void checkCanceled(CancelChecker cancelChecker) {
        if (cancelChecker != null) {
            cancelChecker.checkCanceled();
        }
    }

    private void publish(EventKind eventKind, String sourceContext, String coalesceScope) {
        String eventSourceContext = sourceContext == null || sourceContext.isBlank() ? SOURCE_CONTEXT : sourceContext;
        String eventCoalesceScope = coalesceScope == null || coalesceScope.isBlank() ? SOURCE_CONTEXT : coalesceScope;
        eventBus.publish(new DomainEvent(Instant.now(), eventSourceContext, eventKind, eventCoalesceScope));
    }

    private static Path parseSourceRoot(String sourceContext) {
        if (sourceContext == null || sourceContext.isBlank()) {
            return Path.of(".").toAbsolutePath().normalize();
        }

        try {
            URI uri = URI.create(sourceContext);
            if ("file".equals(uri.getScheme())) {
                return normalize(Path.of(uri));
            }
        } catch (IllegalArgumentException ignored) {
            // Fallback to plain path parsing.
        }

        return normalize(Path.of(sourceContext));
    }

    private static <K, V> LinkedHashMap<K, V> newLruMap(int maxSize) {
        return new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > maxSize;
            }
        };
    }

    private static void trackByRoot(Map<Path, Set<DocumentUri>> rootMap, Path root, DocumentUri uri) {
        rootMap.computeIfAbsent(root, ignored -> ConcurrentHashMap.newKeySet()).add(uri);
    }

    private static void untrackByRoot(Map<Path, Set<DocumentUri>> rootMap, Path root, DocumentUri uri) {
        Set<DocumentUri> uris = rootMap.get(root);
        if (uris == null) {
            return;
        }
        uris.remove(uri);
        if (uris.isEmpty()) {
            rootMap.remove(root, uris);
        }
    }
}
