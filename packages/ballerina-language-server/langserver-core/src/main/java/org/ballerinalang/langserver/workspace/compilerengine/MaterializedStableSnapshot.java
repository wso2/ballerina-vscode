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

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.workspace.documentstore.ContentVersion;

import java.nio.file.Path;
import java.util.Map;

/**
 * Materialized stable snapshot used by the active compiler-engine implementation.
 *
 * @since 1.7.0
 */
public final class MaterializedStableSnapshot implements StableSnapshot {

    private final Map<DocumentId, SyntaxTree> syntaxTrees;
    private final Map<Path, DocumentId> pathToDocumentIds;
    private final Map<ModuleId, SemanticModel> semanticModels;
    private final PackageCompilation compilation;
    private final ContentVersion contentVersion;

    /**
     * Creates a fully materialized stable snapshot.
     *
     * @param syntaxTrees syntax trees keyed by document id
     * @param pathToDocumentIds document ids keyed by normalized path
     * @param semanticModels semantic models keyed by module id
     * @param compilation package compilation for the snapshot
     * @param contentVersion content version represented by the snapshot
     */
    public MaterializedStableSnapshot(@Nonnull Map<DocumentId, SyntaxTree> syntaxTrees,
                                      @Nonnull Map<Path, DocumentId> pathToDocumentIds,
                                      @Nonnull Map<ModuleId, SemanticModel> semanticModels,
                                      @Nonnull PackageCompilation compilation,
                                      @Nonnull ContentVersion contentVersion) {
        this.syntaxTrees = Map.copyOf(syntaxTrees);
        this.pathToDocumentIds = Map.copyOf(pathToDocumentIds);
        this.semanticModels = Map.copyOf(semanticModels);
        this.compilation = compilation;
        this.contentVersion = contentVersion;
    }

    @Override
    public SyntaxTree syntaxTree(DocumentId docId) {
        return syntaxTrees.get(docId);
    }

    @Override
    public ContentVersion contentVersion() {
        return contentVersion;
    }

    @Override
    public SemanticModel semanticModel(ModuleId moduleId) {
        return semanticModels.get(moduleId);
    }

    @Override
    public PackageCompilation compilation() {
        return compilation;
    }

    public SyntaxTree syntaxTree(Path filePath) {
        DocumentId documentId = pathToDocumentIds.get(normalize(filePath));
        return documentId == null ? null : syntaxTrees.get(documentId);
    }

    public SemanticModel semanticModel(Path filePath) {
        DocumentId documentId = pathToDocumentIds.get(normalize(filePath));
        return documentId == null ? null : semanticModels.get(documentId.moduleId());
    }

    private static Path normalize(@Nonnull Path filePath) {
        return filePath.toAbsolutePath().normalize();
    }
}
