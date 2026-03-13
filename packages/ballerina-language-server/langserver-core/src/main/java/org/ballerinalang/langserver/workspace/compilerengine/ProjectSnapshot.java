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
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;

import java.nio.file.Path;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable snapshot of a compiled project, per ADR-006.
 *
 * <p>Holds the compilation output together with the content version that produced it,
 * enabling staleness checks by LSP handlers.
 *
 * @param compilation    the package compilation result
 * @param semanticModel  the semantic model derived from the compilation
 * @param syntaxTree     the primary syntax tree of the compiled project snapshot
 * @param syntaxTrees    syntax trees keyed by normalized document path
 * @param contentVersion the content version that produced this snapshot
 * @since 1.7.0
 */
public record ProjectSnapshot(PackageCompilation compilation,
                               SemanticModel semanticModel,
                               SyntaxTree syntaxTree,
                               Map<Path, SyntaxTree> syntaxTrees,
                               ContentVersion contentVersion) {

    /**
     * Validates all fields are non-null.
     */
    public ProjectSnapshot {
        Objects.requireNonNull(compilation, "compilation must not be null");
        Objects.requireNonNull(semanticModel, "semanticModel must not be null");
        Objects.requireNonNull(syntaxTree, "syntaxTree must not be null");
        Objects.requireNonNull(syntaxTrees, "syntaxTrees must not be null");
        Objects.requireNonNull(contentVersion, "contentVersion must not be null");
        syntaxTrees = Map.copyOf(syntaxTrees);
    }

    /**
     * Creates a snapshot with only a primary syntax tree.
     *
     * @param compilation the package compilation result
     * @param semanticModel the semantic model derived from the compilation
     * @param syntaxTree the primary syntax tree of the compiled project snapshot
     * @param contentVersion the content version that produced this snapshot
     */
    public ProjectSnapshot(PackageCompilation compilation,
                           SemanticModel semanticModel,
                           SyntaxTree syntaxTree,
                           ContentVersion contentVersion) {
        this(compilation, semanticModel, syntaxTree, Map.of(), contentVersion);
    }

    /**
     * Returns the cached syntax tree for the given file path, if present.
     *
     * @param filePath normalized or non-normalized document path
     * @return cached syntax tree, or {@code null} when not available
     */
    public SyntaxTree syntaxTree(Path filePath) {
        Objects.requireNonNull(filePath, "filePath must not be null");
        return syntaxTrees.getOrDefault(filePath.normalize(), syntaxTree);
    }
}
