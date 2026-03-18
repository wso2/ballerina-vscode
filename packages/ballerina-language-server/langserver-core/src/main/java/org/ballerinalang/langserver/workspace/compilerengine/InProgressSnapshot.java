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
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;

import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;

/**
 * Snapshot of an in-progress compilation (ADR-042).
 *
 * <p>Provides immediate access to syntax trees while semantic analysis completes
 * asynchronously. This enables LSP features to work with parsed code immediately
 * while waiting for type information.
 *
 * <p>Used by correctness-critical LSP features (hover, go-to-definition, find references,
 * diagnostics) where consistency beats latency.
 *
 * @param syntaxTrees    syntax trees keyed by module ID (available immediately)
 * @param semanticFuture  future that will yield the semantic model for a given module
 * @param compilationFuture future that will yield the full package compilation
 * @param contentVersion the content version that produced this snapshot
 * @since 1.7.0
 */
public record InProgressSnapshot(Map<ModuleId, SyntaxTree> syntaxTrees,
                                 CompletableFuture<SemanticModel> semanticFuture,
                                 CompletableFuture<PackageCompilation> compilationFuture,
                                 ContentVersion contentVersion) implements SyntaxSnapshot {

    /**
     * Validates all fields are non-null and creates defensive copy of syntaxTrees.
     */
    public InProgressSnapshot {
        Objects.requireNonNull(syntaxTrees, "syntaxTrees must not be null");
        Objects.requireNonNull(semanticFuture, "semanticFuture must not be null");
        Objects.requireNonNull(compilationFuture, "compilationFuture must not be null");
        Objects.requireNonNull(contentVersion, "contentVersion must not be null");
        syntaxTrees = Map.copyOf(syntaxTrees);
    }

    /**
     * Returns the syntax tree for the given module (immediate, non-blocking).
     *
     * @param moduleId the module identifier
     * @return the syntax tree, or {@code null} if not available for this module
     */
    @Override
    public SyntaxTree syntaxTree(ModuleId moduleId) {
        Objects.requireNonNull(moduleId, "moduleId must not be null");
        return syntaxTrees.get(moduleId);
    }

    /**
     * Returns a future that will yield the semantic model when compilation completes.
     *
     * @return the semantic model future
     */
    public CompletableFuture<SemanticModel> semanticModel() {
        return semanticFuture;
    }

    /**
     * Returns a future that will yield the package compilation when complete.
     *
     * @return the compilation future
     */
    public CompletableFuture<PackageCompilation> compilation() {
        return compilationFuture;
    }

    /**
     * Cancels the underlying compilation futures.
     *
     * <p>If compilation has already completed, this has no effect.
     * Any threads waiting on the futures will receive a
     * {@link java.util.concurrent.CancellationException}.
     *
     * @return {@code true} if either future was cancelled (was not already completed)
     */
    public boolean cancel() {
        boolean semanticCancelled = semanticFuture.cancel(true);
        boolean compilationCancelled = compilationFuture.cancel(true);
        return semanticCancelled || compilationCancelled;
    }
}
