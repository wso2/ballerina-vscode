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
import io.ballerina.projects.CompilationOptions;
import io.ballerina.projects.DocumentId;
import io.ballerina.projects.Module;
import io.ballerina.projects.ModuleId;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.PackageDescriptor;
import io.ballerina.projects.Project;
import io.ballerina.projects.environment.PackageLockingMode;
import org.ballerinalang.langserver.common.utils.CommonUtil;
import org.ballerinalang.langserver.commons.BallerinaCompilerApi;
import org.ballerinalang.langserver.commons.LanguageServerContext;
import org.ballerinalang.langserver.commons.workspace.WorkspaceManager;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationPipeline;
import org.ballerinalang.langserver.workspace.compilerengine.CompileTask;
import org.ballerinalang.langserver.workspace.compilerengine.FailureType;
import org.ballerinalang.langserver.workspace.compilerengine.DualSnapshotStore;
import org.ballerinalang.langserver.workspace.compilerengine.RecoveryLadder;
import org.ballerinalang.langserver.workspace.compilerengine.ResolutionResult;
import org.ballerinalang.langserver.workspace.compilerengine.StableSnapshot;
import org.ballerinalang.langserver.workspace.documentstore.DocumentUri;
import org.ballerinalang.langserver.workspace.eventbus.EventSyncPubSubHolder;
import org.ballerinalang.langserver.workspace.execution.GracePeriod;
import org.ballerinalang.langserver.workspace.lspgateway.ClientSession;
import org.ballerinalang.langserver.workspace.lspgateway.WorkspaceManagerFacadeImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.LockingMode;
import org.ballerinalang.langserver.workspace.workspacemanager.MemoryBudget;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectRegistry;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;
import org.ballerinalang.langserver.workspace.workspacemanager.UriResolver;
import org.eclipse.lsp4j.ClientCapabilities;

import java.nio.file.Path;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
     * @return a fully-wired workspace manager facade
     */
    public static WorkspaceManager create(LanguageServerContext serverContext) {
        BuildOptions buildOptions = BuildOptions.builder()
                .setOffline(CommonUtil.COMPILE_OFFLINE)
                .build();

        EventSyncPubSubHolder eventBus = new EventSyncPubSubHolder();
        DualSnapshotStore snapshotStore = new DualSnapshotStore();
        ProjectRegistry projectRegistry = new ProjectRegistry(MemoryBudget.ofMb(512));
        UriResolver uriResolver = new UriResolver();
        GracePeriod gracePeriod = GracePeriod.ofMillis(2000);

        WiringConfiguration config = WiringConfiguration.builder()
                .eventBus(eventBus)
                .snapshotStore(snapshotStore)
                .projectRegistry(projectRegistry)
                .uriResolver(uriResolver)
                .projectLoader((root, kind) ->
                        BallerinaCompilerApi.getInstance().loadProject(Path.of(root.uri()), buildOptions))
                .gracePeriod(gracePeriod)
                .build();

        ClientSession session = new ClientSession(
                new ClientCapabilities(),
                Collections.emptyList(),
                "ls-file-session");

        return new WorkspaceManagerFacadeImpl(
                config.projectService(),
                config.compilationService(),
                config.executionService()
        );
    }
}
