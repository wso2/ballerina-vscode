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

/**
 * Immutable snapshot of a successfully compiled project (ADR-042).
 *
 * <p>Provides synchronous access to syntax trees and semantic models.
 * As a record, it is inherently thread-safe and safely publishable across threads
 * without additional synchronization.
 *
 * <p>Used by latency-sensitive LSP features (completion, signature help, code lens)
 * where availability beats freshness.
 *
 * @param compilation    the package compilation result
 * @param semanticModel  the semantic model derived from the compilation
 * @param syntaxTrees    syntax trees keyed by module ID
 * @param contentVersion the content version that produced this snapshot
 * @since 1.7.0
 */
public record StableSnapshot(PackageCompilation compilation,
                             SemanticModel semanticModel,
                             Map<ModuleId, SyntaxTree> syntaxTrees,
                             ContentVersion contentVersion) implements SyntaxSnapshot {

    /**
     * Validates all fields are non-null and creates defensive copy of syntaxTrees.
     */
    public StableSnapshot {
        Objects.requireNonNull(compilation, "compilation must not be null");
        Objects.requireNonNull(semanticModel, "semanticModel must not be null");
        Objects.requireNonNull(syntaxTrees, "syntaxTrees must not be null");
        Objects.requireNonNull(contentVersion, "contentVersion must not be null");
        syntaxTrees = Map.copyOf(syntaxTrees);
    }

    /**
     * Returns the syntax tree for the given module.
     *
     * @param moduleId the module identifier
     * @return the syntax tree, or {@code null} if not available for this module
     */
    @Override
    public SyntaxTree syntaxTree(ModuleId moduleId) {
        Objects.requireNonNull(moduleId, "moduleId must not be null");
        return syntaxTrees.get(moduleId);
    }
}
