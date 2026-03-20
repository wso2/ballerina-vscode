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

import javax.annotation.Nonnull;

import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;

import java.time.Instant;
import java.util.Objects;
import java.util.concurrent.CancellationException;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Compilation unit of work binding a source root, content version, and cancellation token.
 *
 * <p>Each phase advance acts as a cooperative cancellation checkpoint (ADR-018).
 *
 * @since 1.7.0
 */
public final class CompileTask {

    private final DocumentUri sourceRootUri;
    private final ContentVersion contentVersion;
    private final CancellationToken cancellationToken;
    private final Instant createdAt;
    private final AtomicReference<CompilationPhase> currentPhase;

    /**
     * Creates a compile task starting at {@link CompilationPhase#PRE_PARSE}.
     *
     * @param sourceRootUri     the project source root URI
     * @param contentVersion    the content version triggering this compilation
     * @param cancellationToken cooperative cancellation flag
     */
    public CompileTask(@Nonnull DocumentUri sourceRootUri, @Nonnull ContentVersion contentVersion,
                       @Nonnull CancellationToken cancellationToken) {
        this.sourceRootUri = Objects.requireNonNull(sourceRootUri, "sourceRootUri must not be null");
        this.contentVersion = Objects.requireNonNull(contentVersion, "contentVersion must not be null");
        this.cancellationToken = Objects.requireNonNull(cancellationToken, "cancellationToken must not be null");
        this.createdAt = Instant.now();
        this.currentPhase = new AtomicReference<>(CompilationPhase.PRE_PARSE);
    }

    /**
     * Advances to the given phase and checks for cancellation.
     *
     * @param phase the phase to advance to
     * @throws CancellationException if the token has been cancelled
     */
    public void advancePhase(CompilationPhase phase) {
        currentPhase.set(phase);
        cancellationToken.checkCancelled();
    }

    /**
     * Requests cancellation of this task.
     */
    public void cancel() {
        cancellationToken.cancel();
    }

    /**
     * Returns whether this task has been cancelled.
     *
     * @return {@code true} if cancelled
     */
    public boolean isCancelled() {
        return cancellationToken.isCancelled();
    }

    public DocumentUri sourceRootUri() {
        return sourceRootUri;
    }

    public ContentVersion contentVersion() {
        return contentVersion;
    }

    public CancellationToken cancellationToken() {
        return cancellationToken;
    }

    public Instant createdAt() {
        return createdAt;
    }

    public CompilationPhase currentPhase() {
        return currentPhase.get();
    }
}
