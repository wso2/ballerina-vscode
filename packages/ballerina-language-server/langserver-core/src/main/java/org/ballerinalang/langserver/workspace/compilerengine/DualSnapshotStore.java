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

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;

import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Thread-safe per-source-root store for stable and in-progress snapshots.
 *
 * @since 1.7.0
 */
public class DualSnapshotStore {

    private static final ContentVersion INITIAL_CONTENT_VERSION = new ContentVersion(0);

    private final ConcurrentHashMap<SourceRoot, SnapshotPair> snapshots;

    /**
     * Creates an empty dual snapshot store.
     */
    public DualSnapshotStore() {
        this.snapshots = new ConcurrentHashMap<>();
    }

    /**
     * Returns the current stable snapshot for the source root.
     *
     * @param sourceRoot the source root identity
     * @return the latest stable snapshot, or {@code null} when none has been published
     */
    public StableSnapshot getStable(SourceRoot sourceRoot) {
        Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        SnapshotPair snapshotPair = snapshots.get(sourceRoot);
        return snapshotPair == null ? null : snapshotPair.stableSnapshot();
    }

    /**
     * Returns the current in-progress snapshot for the source root.
     *
     * @param sourceRoot the source root identity
     * @return the active in-progress snapshot, or {@code null} when none is running
     */
    public InProgressSnapshot getInProgress(SourceRoot sourceRoot) {
        Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        SnapshotPair snapshotPair = snapshots.get(sourceRoot);
        return snapshotPair == null ? null : snapshotPair.inProgressSnapshot();
    }

    /**
     * Starts a new compilation cycle for the source root.
     *
     * @param sourceRoot the source root identity
     * @return the newly created in-progress snapshot
     */
    public InProgressSnapshot startCompilation(SourceRoot sourceRoot) {
        Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        SnapshotPair snapshotPair = snapshots.computeIfAbsent(sourceRoot, ignored -> new SnapshotPair());
        return snapshotPair.startCompilation();
    }

    /**
     * Publishes the latest stable snapshot for the source root.
     *
     * @param sourceRoot the source root identity
     * @param stableSnapshot the stable snapshot to publish
     */
    public void publishStable(SourceRoot sourceRoot, StableSnapshot stableSnapshot) {
        Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        Objects.requireNonNull(stableSnapshot, "stableSnapshot must not be null");
        SnapshotPair snapshotPair = snapshots.computeIfAbsent(sourceRoot, ignored -> new SnapshotPair());
        snapshotPair.publishStable(stableSnapshot);
    }

    /**
     * Cancels the current in-progress compilation for the source root.
     *
     * @param sourceRoot the source root identity
     */
    public void cancelInProgress(SourceRoot sourceRoot) {
        Objects.requireNonNull(sourceRoot, "sourceRoot must not be null");
        SnapshotPair snapshotPair = snapshots.get(sourceRoot);
        if (snapshotPair != null) {
            snapshotPair.cancelInProgress();
        }
    }

    static final class StoreInProgressSnapshot implements InProgressSnapshot {

        private final StableSnapshot fallbackStableSnapshot;
        private final ContentVersion contentVersion;
        private final CompletableFuture<StableSnapshot> publishedStableSnapshot;
        private final CompletableFuture<PackageCompilation> compilationFuture;

        StoreInProgressSnapshot(StableSnapshot fallbackStableSnapshot) {
            this.fallbackStableSnapshot = fallbackStableSnapshot;
            this.contentVersion = fallbackStableSnapshot == null ? INITIAL_CONTENT_VERSION
                    : fallbackStableSnapshot.contentVersion();
            this.publishedStableSnapshot = new CompletableFuture<>();
            this.compilationFuture = new CompletableFuture<>();
        }

        @Override
        public SyntaxTree syntaxTree(DocumentId docId) {
            Objects.requireNonNull(docId, "docId must not be null");
            if (fallbackStableSnapshot == null) {
                return null;
            }
            return fallbackStableSnapshot.syntaxTree(docId);
        }

        @Override
        public ContentVersion contentVersion() {
            return contentVersion;
        }

        @Override
        public CompletableFuture<SemanticModel> semanticModel(ModuleId moduleId, CancelChecker checker) {
            Objects.requireNonNull(moduleId, "moduleId must not be null");
            Objects.requireNonNull(checker, "checker must not be null");
            checker.checkCanceled();
            CompletableFuture<SemanticModel> semanticFuture = new CompletableFuture<>();
            publishedStableSnapshot.whenComplete((snapshot, error) -> {
                if (error != null) {
                    propagate(error, semanticFuture);
                    return;
                }
                try {
                    checker.checkCanceled();
                    semanticFuture.complete(snapshot.semanticModel(moduleId));
                } catch (Throwable throwable) {
                    semanticFuture.completeExceptionally(throwable);
                }
            });
            return semanticFuture;
        }

        @Override
        public CompletableFuture<PackageCompilation> compilation(CancelChecker checker) {
            Objects.requireNonNull(checker, "checker must not be null");
            checker.checkCanceled();
            return compilationFuture;
        }

        void complete(StableSnapshot stableSnapshot) {
            publishedStableSnapshot.complete(stableSnapshot);
            compilationFuture.complete(stableSnapshot.compilation());
        }

        void cancel() {
            publishedStableSnapshot.cancel(false);
            compilationFuture.cancel(false);
        }

        private static <T> void propagate(Throwable error, CompletableFuture<T> targetFuture) {
            Throwable cause = error.getCause() == null ? error : error.getCause();
            if (cause instanceof java.util.concurrent.CancellationException) {
                targetFuture.cancel(false);
                return;
            }
            targetFuture.completeExceptionally(cause);
        }
    }
}
