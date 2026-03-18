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

import java.time.Duration;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeoutException;

/**
 * Wrapper for an in-progress compilation that will produce a StableSnapshot (ADR-042).
 *
 * <p>Provides asynchronous access to the compilation result with timeout and cancellation support.
 * The underlying {@link CompletableFuture} is created by the compilation pipeline and completed
 * when the compilation finishes.
 *
 * <p>Used by correctness-critical LSP features (hover, go-to-definition, find references, diagnostics)
 * where consistency beats latency.
 *
 * @param future the completable future that will yield a StableSnapshot
 * @since 1.7.0
 */
public record InProgressSnapshot(CompletableFuture<StableSnapshot> future) {

    /**
     * Validates the future is non-null.
     */
    public InProgressSnapshot {
        Objects.requireNonNull(future, "future must not be null");
    }

    /**
     * Awaits the completion of the underlying compilation, blocking until the
     * StableSnapshot is available or the timeout expires.
     *
     * @param timeout maximum time to wait
     * @return the stable snapshot when compilation completes successfully
     * @throws TimeoutException if the timeout expires before completion
     * @throws InterruptedException if the current thread is interrupted while waiting
     * @throws ExecutionException if the compilation failed with an exception
     */
    public StableSnapshot await(Duration timeout) throws TimeoutException, InterruptedException, ExecutionException {
        Objects.requireNonNull(timeout, "timeout must not be null");
        return future.get(timeout.toMillis(), java.util.concurrent.TimeUnit.MILLISECONDS);
    }

    /**
     * Cancels the underlying compilation future.
     *
     * <p>If the compilation has already completed, this has no effect.
     * Any threads waiting on {@link #await(Duration)} will receive a
     * {@link java.util.concurrent.CancellationException}.
     *
     * @return {@code true} if the future was cancelled (was not already completed)
     */
    public boolean cancel() {
        return future.cancel(true);
    }
}
