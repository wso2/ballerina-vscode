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

import java.util.concurrent.AtomicBoolean;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * Controls two-tier readiness for the workspace: syntax-ready and semantic-ready.
 * Implements ADR-020: gates early requests (syntax-only) until WM-E6 fires,
 * gates semantic requests until CE-E1 fires and compilation completes.
 *
 * <p>Thread-safe; uses atomic flags and latches for coordination.
 *
 * @since 1.7.0
 */
public final class TwoTierReadinessController {

    private final AtomicBoolean syntaxReady;
    private final AtomicBoolean semanticReady;
    private final CountDownLatch syntaxLatch;
    private final CountDownLatch semanticLatch;

    /**
     * Creates a new two-tier readiness controller with both tiers marked as not ready.
     */
    public TwoTierReadinessController() {
        this.syntaxReady = new AtomicBoolean(false);
        this.semanticReady = new AtomicBoolean(false);
        this.syntaxLatch = new CountDownLatch(1);
        this.semanticLatch = new CountDownLatch(1);
    }

    /**
     * Marks the syntax tier as ready.
     * Idempotent: subsequent calls have no effect.
     */
    public void markSyntaxReady() {
        if (syntaxReady.compareAndSet(false, true)) {
            syntaxLatch.countDown();
        }
    }

    /**
     * Marks the semantic tier as ready.
     * Idempotent: subsequent calls have no effect.
     */
    public void markSemanticReady() {
        if (semanticReady.compareAndSet(false, true)) {
            semanticLatch.countDown();
        }
    }

    /**
     * Checks if the syntax tier is ready without blocking.
     *
     * @return true if syntax tier is ready, false otherwise
     */
    public boolean isSyntaxReady() {
        return syntaxReady.get();
    }

    /**
     * Checks if the semantic tier is ready without blocking.
     *
     * @return true if semantic tier is ready, false otherwise
     */
    public boolean isSemanticReady() {
        return semanticReady.get();
    }

    /**
     * Waits up to the given timeout for the syntax tier to become ready.
     *
     * @param timeout maximum time to wait
     * @param unit time unit for timeout
     * @return true if syntax tier became ready within the timeout, false if timeout expired
     * @throws InterruptedException if the waiting thread is interrupted
     */
    public boolean awaitSyntaxReady(long timeout, TimeUnit unit) throws InterruptedException {
        return syntaxLatch.await(timeout, unit);
    }

    /**
     * Waits up to the given timeout for the semantic tier to become ready.
     *
     * @param timeout maximum time to wait
     * @param unit time unit for timeout
     * @return true if semantic tier became ready within the timeout, false if timeout expired
     * @throws InterruptedException if the waiting thread is interrupted
     */
    public boolean awaitSemanticReady(long timeout, TimeUnit unit) throws InterruptedException {
        return semanticLatch.await(timeout, unit);
    }

    /**
     * Returns a ContentModifiedError to be sent to the client when a request
     * arrives before semantic readiness (stale request, retry after delay).
     *
     * @param retryAfterMs milliseconds the client should wait before retrying
     * @return content-modified error record
     */
    public ContentModifiedError contentModifiedHint(long retryAfterMs) {
        return new ContentModifiedError(
                ContentModifiedError.CONTENT_MODIFIED_CODE,
                "Workspace compilation not yet complete; content may be stale",
                retryAfterMs
        );
    }

    /**
     * Represents a content-modified error response to return to the LSP client.
     * Used when a semantic request arrives before compilation is ready (ADR-020).
     *
     * @param errorCode LSP error code (-32801 for content modified)
     * @param message human-readable error message
     * @param retryAfterMs suggested milliseconds before client retries
     * @since 1.7.0
     */
    public record ContentModifiedError(int errorCode, String message, long retryAfterMs) {
        /**
         * Standard LSP error code for "content modified" (RFC 6902).
         */
        public static final int CONTENT_MODIFIED_CODE = -32801;
    }
}
