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

package org.ballerinalang.langserver.workspace.lspgateway;

import org.ballerinalang.langserver.workspace.eventbus.event.DomainEvent;
import org.ballerinalang.langserver.workspace.eventbus.EventKind;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;

import java.io.IOException;
import java.nio.file.FileVisitOption;
import java.nio.file.Files;
import java.nio.file.NoSuchFileException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import javax.annotation.Nonnull;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Stream;

/**
 * Orchestrates the Initial Workspace Load (IWL) sequence when a client connects.
 * Scans workspace folders, registers projects, and coordinates readiness progression.
 *
 * <p>Implements the LG-C1 → WM-C2 → WM-E6 event chain from ADR-020.
 * Subscribes to CE-E1 (compiler snapshot published) to mark semantic readiness.
 *
 * <p>Thread-safe via internal state guards and single-threaded executor.
 *
 * @since 1.7.0
 */
public final class InitialWorkspaceLoader {

    /**
     * LSP `$/progress` token for initial workspace indexing.
     */
    public static final String IWL_PROGRESS_TOKEN = "BallerinaLS/indexing";

    /**
     * Default retry-after delay when returning content-modified error (milliseconds).
     */
    public static final long DEFAULT_RETRY_AFTER_MS = 2000L;

    /**
     * Maximum directory depth when scanning for Ballerina projects.
     */
    private static final int MAX_SCAN_DEPTH = 10;

    private final ProjectService projectService;
    private final EventSyncPubSubHolder eventBus;
    private final ProgressTracker progressTracker;
    private final TwoTierReadinessController readinessController;
    private final ExecutorService iwlExecutor;
    private final AtomicBoolean started;
    private final AtomicBoolean progressEndSent;

    /**
     * Public constructor for production use.
     * Creates a single-threaded executor internally.
     *
     * @param projectService project service for workspace registration; must not be null
     * @param eventBus event bus for subscription; must not be null
     * @param progressTracker progress reporter; must not be null
     * @throws NullPointerException if any argument is null
     */
    public InitialWorkspaceLoader(ProjectService projectService,
                                  EventSyncPubSubHolder eventBus,
                                  ProgressTracker progressTracker) {
        this(projectService, eventBus, progressTracker,
                Executors.newSingleThreadExecutor(r -> {
                    Thread t = new Thread(r, "IWL-Executor");
                    t.setDaemon(true);
                    return t;
                }));
    }

    /**
     * Package-private constructor for testing with injectable executor.
     *
     * @param projectService project service for workspace registration; must not be null
     * @param eventBus event bus for subscription; must not be null
     * @param progressTracker progress reporter; must not be null
     * @param iwlExecutor executor service for IWL background tasks; must not be null
     * @throws NullPointerException if any argument is null
     */
    InitialWorkspaceLoader(@Nonnull ProjectService projectService,
                          @Nonnull EventSyncPubSubHolder eventBus,
                          @Nonnull ProgressTracker progressTracker,
                          @Nonnull ExecutorService iwlExecutor) {
        this.projectService = projectService;
        this.eventBus = eventBus;
        this.progressTracker = progressTracker;
        this.iwlExecutor = iwlExecutor;
        this.readinessController = new TwoTierReadinessController();
        this.started = new AtomicBoolean(false);
        this.progressEndSent = new AtomicBoolean(false);

        // Subscribe to compiler snapshot published event before starting IWL
        subscribeToSnapshotPublished();
    }

    /**
     * Starts the Initial Workspace Load sequence for the given client session.
     * Idempotent: subsequent calls have no effect.
     *
     * <p>Orchestrates:
     * <ol>
     *   <li>Subscribe to CE-E1 (compiler snapshot published) in constructor</li>
     *   <li>Report progress begin</li>
     *   <li>Scan workspace folders for Ballerina projects in background thread</li>
     *   <li>Call projectService.registerWorkspace() (WM-C2 → WM-E6)</li>
     *   <li>Mark syntax tier ready</li>
     *   <li>Report progress end (unless CE-E1 fires first)</li>
     *   <li>Listen for CE-E1 to mark semantic ready and progress final end</li>
     * </ol>
     * </p>
     *
     * @param session client session with workspace folder URIs; must not be null
     * @throws NullPointerException if session is null
     */
    public void startIwl(@Nonnull ClientSession session) {
        // Guard: ensure IWL runs only once
        if (!started.compareAndSet(false, true)) {
            return;
        }

        // Report progress begin
        progressTracker.begin(IWL_PROGRESS_TOKEN, "Indexing", "Scanning workspace...", 0);

        // Submit background task
        iwlExecutor.submit(() -> executeIwl(session));
    }

    /**
     * Background task: scan workspace folders and register projects.
     * Only sends progress end on error paths; CE-E1 handles the success path.
     */
    private void executeIwl(ClientSession session) {
        boolean scanSucceeded = false;
        try {
            List<Path> allRoots = new ArrayList<>();
            int folderCount = session.workspaceFolderUris().size();

            for (int i = 0; i < folderCount; i++) {
                String uri = session.workspaceFolderUris().get(i);
                try {
                    Path folder = Path.of(java.net.URI.create(uri));
                    List<Path> roots = scanForBallerinaRoots(folder);
                    allRoots.addAll(roots);

                    // Report per-folder progress (0-80% reserved for scanning)
                    int percentage = (int) (((double) (i + 1) / folderCount) * 80);
                    progressTracker.report(IWL_PROGRESS_TOKEN,
                            "Scanned " + folder.getFileName(), percentage);
                } catch (Exception e) {
                    System.err.println("Warning: Failed to scan workspace folder " + uri + ": " + e);
                }
            }

            // Register all discovered projects (WM-C2 → WM-E6)
            if (!allRoots.isEmpty()) {
                projectService.registerWorkspace(allRoots);
            }

            // Mark syntax tier ready (WM-E6 signals syntax readiness)
            readinessController.markSyntaxReady();
            scanSucceeded = true;

        } catch (Exception e) {
            System.err.println("Error during initial workspace load: " + e);
        } finally {
            // Only send fallback progress end if scan failed; CE-E1 handles the success path
            if (!scanSucceeded && progressEndSent.compareAndSet(false, true)) {
                progressTracker.end(IWL_PROGRESS_TOKEN, "Workspace indexed");
            }
        }
    }

    /**
     * Scans a folder recursively for Ballerina projects (folders with Ballerina.toml).
     * Skips hidden directories and follows symlinks.
     * Max depth: 10 levels.
     *
     * @param folder root folder to scan; must not be null
     * @return list of discovered Ballerina project roots (empty if folder doesn't exist or is empty)
     */
    private List<Path> scanForBallerinaRoots(Path folder) {
        try (Stream<Path> stream = Files.walk(folder, MAX_SCAN_DEPTH, FileVisitOption.FOLLOW_LINKS)) {
            return stream
                    .filter(p -> !isHidden(p))
                    .filter(p -> p.resolve("Ballerina.toml").toFile().exists())
                    .filter(Files::isDirectory)
                    .toList();
        } catch (NoSuchFileException e) {
            System.err.println("Warning: Workspace folder does not exist: " + folder);
            return List.of();
        } catch (IOException e) {
            System.err.println("Warning: Failed to scan folder " + folder + ": " + e);
            return List.of();
        }
    }

    /**
     * Checks if a path is hidden (starts with '.').
     *
     * @param path path to check; must not be null
     * @return true if path is hidden, false otherwise
     */
    private boolean isHidden(Path path) {
        return path.getFileName().toString().startsWith(".");
    }

    /**
     * Subscribes to CE-E1 (compiler snapshot published) event.
     * Marks semantic ready and ends progress report when CE-E1 fires.
     */
    private void subscribeToSnapshotPublished() {
        // Unique subscriber ID to avoid collision in tests
        String subId = "iwl-snapshot-" + UUID.randomUUID().toString().substring(0, 8);
        eventBus.subscribe(subId, SubscriberTier.CRITICAL,
                Set.of(EventKind.COMPILER_SNAPSHOT_PUBLISHED), this::onSnapshotPublished);
    }

    /**
     * Handles COMPILER_SNAPSHOT_PUBLISHED event (CE-E1).
     * Marks semantic tier ready and ends progress if not already ended.
     *
     * @param event domain event; must not be null
     */
    private void onSnapshotPublished(DomainEvent event) {
        // Ignore CE-E1 if IWL hasn't started yet
        if (!started.get()) {
            return;
        }

        // Mark semantic tier ready
        readinessController.markSemanticReady();

        // End progress report if not already sent
        if (progressEndSent.compareAndSet(false, true)) {
            progressTracker.end(IWL_PROGRESS_TOKEN, "Workspace ready");
        }
    }

    /**
     * Returns the readiness controller for T-016 facade layer.
     *
     * @return readiness controller
     */
    public TwoTierReadinessController readinessController() {
        return readinessController;
    }

    /**
     * Shuts down the executor service.
     * Called during language server shutdown.
     */
    public void shutdown() {
        iwlExecutor.shutdownNow();
    }
}
