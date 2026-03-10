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

package org.ballerinalang.langserver.workspace;

import io.ballerina.compiler.api.SemanticModel;
import io.ballerina.compiler.syntax.tree.SyntaxTree;
import io.ballerina.projects.BuildOptions;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.PackageCompilation;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.commons.BallerinaCompilerApi;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationPipeline;
import org.ballerinalang.langserver.workspace.compilerengine.ProjectSnapshot;
import org.ballerinalang.langserver.workspace.compilerengine.SnapshotStore;
import org.ballerinalang.langserver.workspace.documentstore.VirtualFileSystem;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.execution.GracePeriod;
import org.ballerinalang.langserver.workspace.lspgateway.ClientSession;
import org.ballerinalang.langserver.workspace.lspgateway.WorkspaceManagerFacadeImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.MemoryBudget;
import org.ballerinalang.langserver.workspace.workspacemanager.PathToRootCache;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;
import org.eclipse.lsp4j.ClientCapabilities;

import java.util.Collections;

/**
 * Factory that assembles a fully-wired {@link WorkspaceManagerFacadeImpl} from a
 * {@link LanguageServerContext}.
 *
 * @since 1.7.0
 */
public final class WorkspaceManagerFacadeFactory {

    private WorkspaceManagerFacadeFactory() {
    }

    /**
     * Creates a new {@link WorkspaceManagerFacadeImpl} backed by a {@link WiringConfiguration}.
     *
     * @param serverContext the language server context
     * @return a fully-wired workspace manager
     */
    public static WorkspaceManager create(LanguageServerContext serverContext) {
        BuildOptions buildOptions = BuildOptions.builder()
                .setOffline(CommonUtil.COMPILE_OFFLINE)
                .setSticky(false)
                .build();

        EventSyncPubSubHolder eventBus = new EventSyncPubSubHolder();
        VirtualFileSystem vfs = new VirtualFileSystem();
        SnapshotStore snapshotStore = new SnapshotStore(100);
        ProjectRegistry projectRegistry = new ProjectRegistry(MemoryBudget.ofMb(512));
        PathToRootCache pathToRootCache = new PathToRootCache();
        GracePeriod gracePeriod = GracePeriod.ofMillis(2000);

        // Holder to break the circular reference: compilationAction -> projectService
        ProjectServiceImpl[] projectServiceHolder = {null};

        CompilationPipeline.CompilationAction compilationAction = task -> {
            ProjectServiceImpl ps = projectServiceHolder[0];
            if (ps == null) {
                throw new IllegalStateException("ProjectService not yet initialized");
            }
            io.ballerina.projects.Project project =
                    ps.loadOrCreate(task.sourceRoot().path(), () -> { });
            PackageCompilation compilation = project.currentPackage().getCompilation();
            Module module = project.currentPackage().getDefaultModule();
            SemanticModel semanticModel = compilation.getSemanticModel(module.moduleId());
            SyntaxTree syntaxTree = null;
            for (DocumentId docId : module.documentIds()) {
                syntaxTree = module.document(docId).syntaxTree();
                break;
            }
            if (syntaxTree == null) {
                throw new RuntimeException("No source documents in project: " + task.sourceRoot());
            }
            return new ProjectSnapshot(compilation, semanticModel, syntaxTree, task.contentVersion());
        };

        WiringConfiguration config = WiringConfiguration.builder()
                .eventBus(eventBus)
                .virtualFileSystem(vfs)
                .projectRootResolver(path -> {
                    try {
                        return io.ballerina.projects.util.ProjectPaths.packageRoot(path);
                    } catch (Exception e) {
                        return path;
                    }
                })
                .snapshotStore(snapshotStore)
                .compilationAction(compilationAction)
                .projectRegistry(projectRegistry)
                .pathToRootCache(pathToRootCache)
                .projectLoader((root, kind) ->
                        BallerinaCompilerApi.getInstance().loadProject(root.path(), buildOptions))
                .gracePeriod(gracePeriod)
                .build();

        projectServiceHolder[0] = config.projectService();

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                Collections.emptyList(),
                "ls-file-session");

        return new WorkspaceManagerFacadeImpl(
                config.projectService(),
                config.compilationService(),
                config.documentService(),
                config.executionService(),
                session);
    }
}
