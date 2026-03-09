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

import java.nio.file.Path;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Bounded cache mapping individual file paths to their owning project {@link SourceRoot}.
 *
 * <p>Bounded by {@code maximumSize(10_000)} to avoid unbounded growth (ADR-026).
 * Entries expire after 30 minutes of inactivity to prevent stale paths lingering.
 * Implements {@link CacheInvalidationListener} so T-009 can wire it to {@link ProjectRegistry}.</p>
 *
 * @since 1.7.0
 */
public final class PathToRootCache implements CacheInvalidationListener {

    private final Cache<Path, SourceRoot> cache = CacheBuilder.newBuilder()
            .maximumSize(10_000)
            .expireAfterAccess(30, TimeUnit.MINUTES)
            .recordStats()
            .build();

    /**
     * Associates a file path with its owning source root.
     *
     * @param filePath   the file path to cache; must not be null
     * @param sourceRoot the owning project source root; must not be null
     */
    public void put(Path filePath, SourceRoot sourceRoot) {
        cache.put(filePath, sourceRoot);
    }

    /**
     * Returns the source root for the given file path, or empty if not cached.
     *
     * @param filePath the file path to look up; must not be null
     * @return source root wrapped in Optional, or empty
     */
    public Optional<SourceRoot> get(Path filePath) {
        return Optional.ofNullable(cache.getIfPresent(filePath));
    }

    /**
     * Handles a cache invalidation event from {@link ProjectRegistry}.
     *
     * <ul>
     *   <li>{@code PROJECT_ADDED} / {@code PROJECT_REMOVED}: invalidates the single entry
     *       keyed by the affected source root's path.</li>
     *   <li>{@code BATCH_UPDATE}: invalidates all entries.</li>
     * </ul>
     *
     * @param event the invalidation event; must not be null
     */
    @Override
    public void onCacheInvalidation(CacheInvalidationEvent event) {
        switch (event.type()) {
            case PROJECT_ADDED, PROJECT_REMOVED -> {
                if (event.affectedRoot() != null) {
                    cache.invalidate(event.affectedRoot().path());
                }
            }
            case BATCH_UPDATE -> cache.invalidateAll();
        }
    }
}
