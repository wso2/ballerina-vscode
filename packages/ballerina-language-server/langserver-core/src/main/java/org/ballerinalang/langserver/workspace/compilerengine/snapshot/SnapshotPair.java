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

import java.util.concurrent.atomic.AtomicReference;

/**
 * Internal atomic holder for per-source-root stable and in-progress snapshots.
 *
 * @since 1.7.0
 */
final class SnapshotPair {

    private final AtomicReference<State> state = new AtomicReference<>(new State(null, null));

    StableSnapshot stableSnapshot() {
        return state.get().stableSnapshot();
    }

    InProgressSnapshot inProgressSnapshot() {
        return state.get().inProgressSnapshot();
    }

    InProgressSnapshot startCompilation() {
        while (true) {
            State current = state.get();
            DualSnapshotStore.StoreInProgressSnapshot next =
                    new DualSnapshotStore.StoreInProgressSnapshot(current.stableSnapshot());
            State updated = new State(current.stableSnapshot(), next);
            if (state.compareAndSet(current, updated)) {
                DualSnapshotStore.StoreInProgressSnapshot previous = current.inProgressSnapshot();
                if (previous != null) {
                    previous.cancel();
                }
                return next;
            }
            Thread.onSpinWait();
        }
    }

    void publishStable(StableSnapshot stableSnapshot) {
        while (true) {
            State current = state.get();
            State updated = new State(stableSnapshot, null);
            if (state.compareAndSet(current, updated)) {
                DualSnapshotStore.StoreInProgressSnapshot inProgressSnapshot = current.inProgressSnapshot();
                if (inProgressSnapshot != null) {
                    inProgressSnapshot.complete(stableSnapshot);
                }
                return;
            }
            Thread.onSpinWait();
        }
    }

    void cancelInProgress() {
        while (true) {
            State current = state.get();
            DualSnapshotStore.StoreInProgressSnapshot inProgressSnapshot = current.inProgressSnapshot();
            if (inProgressSnapshot == null) {
                return;
            }
            State updated = new State(current.stableSnapshot(), null);
            if (state.compareAndSet(current, updated)) {
                inProgressSnapshot.cancel();
                return;
            }
            Thread.onSpinWait();
        }
    }

    private record State(StableSnapshot stableSnapshot,
                         DualSnapshotStore.StoreInProgressSnapshot inProgressSnapshot) {
    }
}
