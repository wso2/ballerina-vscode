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

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheStats;
import com.google.common.cache.RemovalCause;
import com.google.common.cache.RemovalListeners;
import com.google.common.cache.RemovalNotification;

import javax.annotation.Nonnull;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.locks.Lock;

/**
 * Bounded weighted LRU registry for {@link Project} instances.
 *
 * <p>The weight unit is megabytes; the total weight is bounded by the supplied
 * {@link MemoryBudget}. Eviction is LRU by access order. The removal listener
 * runs asynchronously so eviction callbacks never block write threads (ADR-013).
 * Statistics are always recorded ({@code recordStats()}) for observability.</p>
 *
 * <p>Listeners registered via {@link #addListener} receive:
 * <ul>
 *   <li>{@code PROJECT_ADDED} — on {@link #register}</li>
 *   <li>{@code BATCH_UPDATE} — on {@link #putAll}</li>
 *   <li>{@code PROJECT_REMOVED} — on {@link #remove}</li>
 * </ul>
 * Listeners are external integrations; do not wire cache implementations here.</p>
 *
 * @since 1.7.0
 */
public final class ProjectRegistry {

    // Weight unit = MB; heterogeneous entry sizes require maximumWeight (not maximumSize).
    private final Cache<DocumentUri, Project> cache;
    private final List<CacheInvalidationListener> listeners = new CopyOnWriteArrayList<>();
    private final ExecutorService evictionExecutor;

    /**
     * Constructs a registry bounded by the given memory budget.
     *
     * @param budget maximum total heap weight in MB; must not be null
     */
    public ProjectRegistry(@Nonnull MemoryBudget budget) {
        this.evictionExecutor = Executors.newSingleThreadExecutor(
                r -> new Thread(r, "project-registry-eviction"));
        this.cache = buildCache(budget);
    }

    // -------------------------------------------------------------------------
    // Cache construction
    // -------------------------------------------------------------------------

    private Cache<DocumentUri, Project> buildCache(MemoryBudget budget) {
        return CacheBuilder.newBuilder()
                .maximumWeight(budget.toMb())
                // Weigher: weight unit is MB; returns estimatedHeapMb() for each project.
                .weigher((DocumentUri k, Project v) -> v.heapEstimate().estimatedHeapMb())
                .removalListener(RemovalListeners.asynchronous(this::onEviction, evictionExecutor))
                .recordStats()
                .build();
    }

    // -------------------------------------------------------------------------
    // Mutating operations
    // -------------------------------------------------------------------------

    /**
     * Atomically returns the existing project for {@code root}, or creates one
     * via {@code factory} and caches it (ADR-019 mandate 2).
     *
     * @param root    project identity; must not be null
     * @param factory callable producing a new Project if absent; must not be null
     * @return existing or newly created project
     * @throws ExecutionException if the factory throws
     */
    public Project computeIfAbsent(@Nonnull DocumentUri root, @Nonnull java.util.concurrent.Callable<Project> factory)
            throws ExecutionException {
        return cache.get(root, factory);
    }

    /**
     * Registers a single project and fires {@code PROJECT_ADDED}.
     *
     * @param root    project identity; must not be null
     * @param project the project to store; must not be null
     */
    public void register(@Nonnull DocumentUri root, @Nonnull Project project) {
        cache.put(root, project);
        fireEvent(new CacheInvalidationEvent(root, CacheInvalidationEvent.InvalidationType.PROJECT_ADDED));
    }

    /**
     * Batch-inserts all entries and fires a single {@code BATCH_UPDATE} event (ADR-019 mandate 1).
     *
     * @param projects map of source roots to projects; must not be null
     */
    public void putAll(@Nonnull Map<DocumentUri, Project> projects) {
        cache.putAll(projects);
        fireEvent(new CacheInvalidationEvent(null, CacheInvalidationEvent.InvalidationType.BATCH_UPDATE));
    }

    /**
     * Removes the project for {@code root} and fires {@code PROJECT_REMOVED}.
     *
     * @param root project identity; must not be null
     */
    public void remove(@Nonnull DocumentUri root) {
        cache.invalidate(root);
        fireEvent(new CacheInvalidationEvent(root, CacheInvalidationEvent.InvalidationType.PROJECT_REMOVED));
    }

    /**
     * Evicts all BACKGROUND-tier projects (those with no open documents).
     * Used by heap pressure handling when old-generation pressure becomes critical.
     */
    public void evictBackgroundProjects() {
        cache.asMap().forEach((root, project) -> {
            if (project.openDocumentCount().tier() == ProjectTier.BACKGROUND) {
                remove(root);
            }
        });
    }

    // -------------------------------------------------------------------------
    // Queries
    // -------------------------------------------------------------------------

    /**
     * Returns the project for the given source root, or empty if not present.
     *
     * @param root project identity; must not be null
     * @return project wrapped in Optional, or empty
     */
    public Optional<Project> get(@Nonnull DocumentUri root) {
        return Optional.ofNullable(cache.getIfPresent(root));
    }

    /**
     * Returns the approximate number of projects in the registry.
     *
     * @return entry count
     */
    public long size() {
        return cache.size();
    }

    /**
     * Returns cache statistics (hit rate, eviction count, etc.).
     *
     * @return cache stats snapshot
     */
    public CacheStats stats() {
        return cache.stats();
    }

    // -------------------------------------------------------------------------
    // Listener management
    // -------------------------------------------------------------------------

    /**
     * Registers a listener to receive cache invalidation events.
     * Uses {@link CopyOnWriteArrayList}: safe for concurrent registration and iteration.
     *
     * @param listener the listener to add; must not be null
     */
    public void addListener(@Nonnull CacheInvalidationListener listener) {
        listeners.add(listener);
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Shuts down the async eviction executor. Should be called on workspace close.
     */
    public void shutdown() {
        evictionExecutor.shutdown();
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Asynchronous removal callback (ADR-013). Probes the project write lock
     * to detect active mutations, then logs the eviction.
     */
    private void onEviction(RemovalNotification<DocumentUri, Project> notification) {
        Project project = notification.getValue();
        if (project == null) {
            return;
        }
        Lock writeLock = project.projectLock().writeLock();
        boolean acquired = writeLock.tryLock();
        if (acquired) {
            writeLock.unlock();
        }
        // Fire PROJECT_REMOVED only for automatic evictions (LRU/size-based).
        // Explicit remove() already fires the event synchronously, so skip EXPLICIT cause
        // to avoid double-firing.
        if (notification.getCause() != RemovalCause.EXPLICIT) {
            fireEvent(new CacheInvalidationEvent(notification.getKey(),
                    CacheInvalidationEvent.InvalidationType.PROJECT_REMOVED));
        }
    }

    private void fireEvent(CacheInvalidationEvent event) {
        listeners.forEach(l -> l.onCacheInvalidation(event));
    }
}
