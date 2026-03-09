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

package org.ballerinalang.langserver.workspace.compilerengine;

import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Lock-free, bounded store for per-project compilation snapshots (ADR-007).
 *
 * <p>Uses {@link AtomicReference} per project so readers never block on writers.
 *
 * @since 1.7.0
 */
public class SnapshotStore {

    private final ConcurrentHashMap<SourceRoot, AtomicReference<ProjectSnapshot>> snapshots;
    private final int maxProjects;

    /**
     * Creates a snapshot store with the given capacity.
     *
     * @param maxProjects maximum number of projects to hold
     */
    public SnapshotStore(int maxProjects) {
        if (maxProjects <= 0) {
            throw new IllegalArgumentException("maxProjects must be positive");
        }
        this.maxProjects = maxProjects;
        this.snapshots = new ConcurrentHashMap<>(maxProjects);
    }

    /**
     * Retrieves the latest snapshot for a project, if one exists.
     *
     * @param sourceRoot the project identity
     * @return the snapshot, or empty if none has been published
     */
    public Optional<ProjectSnapshot> get(SourceRoot sourceRoot) {
        AtomicReference<ProjectSnapshot> ref = snapshots.get(sourceRoot);
        if (ref == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(ref.get());
    }

    /**
     * Atomically publishes a snapshot for the given project.
     *
     * <p>If the project already has a snapshot, it is replaced. If the store is at capacity
     * and the project is new, the publish is rejected.
     *
     * @param sourceRoot the project identity
     * @param snapshot   the snapshot to publish
     * @return {@code true} if published, {@code false} if rejected due to capacity
     */
    public boolean publish(SourceRoot sourceRoot, ProjectSnapshot snapshot) {
        AtomicReference<ProjectSnapshot> existing = snapshots.get(sourceRoot);
        if (existing != null) {
            existing.set(snapshot);
            return true;
        }
        if (snapshots.size() >= maxProjects) {
            return false;
        }
        snapshots.computeIfAbsent(sourceRoot, k -> new AtomicReference<>()).set(snapshot);
        return true;
    }

    /**
     * Removes the snapshot for a project.
     *
     * @param sourceRoot the project identity
     */
    public void remove(SourceRoot sourceRoot) {
        snapshots.remove(sourceRoot);
    }
}
