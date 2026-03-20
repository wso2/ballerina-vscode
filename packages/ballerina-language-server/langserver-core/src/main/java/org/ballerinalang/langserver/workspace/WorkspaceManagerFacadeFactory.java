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

        // Holder to break the circular reference: compilationAction -> projectService
        ProjectServiceImpl[] projectServiceHolder = {null};

        CompilationPipeline.CompilationAction compilationAction = new CompilationPipeline.CompilationAction() {
            @Override
            public PackageDescriptor describe(DocumentUri sourceRootUri) {
                Project project = projectService().loadOrCreate(Path.of(sourceRootUri.uri()), null);
                return project.currentPackage().descriptor();
            }

            @Override
            public ResolutionResult resolve(CompileTask task) {
                ProjectServiceImpl ps = projectService();
                LockingMode lockingMode = currentLockingMode(task);
                Path sourceRoot = Path.of(task.sourceRootUri().uri());
                try {
                    Project project = ps.loadOrCreate(sourceRoot, null);
                    project.currentPackage().getResolution(compilationOptions(lockingMode));
                    return new ResolutionResult(task.sourceRootUri(), List.of(), true);
                } catch (RuntimeException e) {
                    String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
                    return new ResolutionResult(task.sourceRootUri(), List.of(
                            new ResolutionResult.ResolutionDiagnostic(ResolutionResult.Severity.ERROR,
                                    message, sourceRoot.toString())), false);
                }
            }

            @Override
            public StableSnapshot compile(CompileTask task) {
                return snapshot(projectService().loadOrCreate(Path.of(task.sourceRootUri().uri()), null),
                        task.contentVersion());
            }

            @Override
            public LockingMode currentLockingMode(CompileTask task) {
                ProjectServiceImpl ps = projectService();
                Project project = ps.loadOrCreate(Path.of(task.sourceRootUri().uri()), null);
                return ps.getLockingMode(project);
            }

            @Override
            public CompilationPipeline.RecoveryResult recover(CompileTask task, LockingMode initialMode, Throwable cause) {
                LockingMode recoveryMode = nextMorePermissiveMode(initialMode);
                while (recoveryMode != initialMode) {
                    try {
                        Project transientProject = BallerinaCompilerApi.getInstance()
                                .loadProject(Path.of(task.sourceRootUri().uri()), buildOptions(recoveryMode));
                        transientProject.currentPackage().getResolution(compilationOptions(recoveryMode));
                        transientProject.currentPackage().getCompilation();
                        return CompilationPipeline.RecoveryResult.success();
                    } catch (RuntimeException ignored) {
                        initialMode = recoveryMode;
                        recoveryMode = nextMorePermissiveMode(recoveryMode);
                    }
                }
                return CompilationPipeline.RecoveryResult.exhausted();
            }

            private ProjectServiceImpl projectService() {
                ProjectServiceImpl ps = projectServiceHolder[0];
                if (ps == null) {
                    throw new IllegalStateException("ProjectService not yet initialized");
                }
                return ps;
            }

            private StableSnapshot snapshot(Project project,
                                            org.ballerinalang.langserver.workspace.documentstore.ContentVersion version) {
                PackageCompilation compilation = project.currentPackage().getCompilation();
                Map<DocumentId, SyntaxTree> syntaxTrees = new HashMap<>();
                Map<Path, DocumentId> pathToDocumentIds = new HashMap<>();
                Map<ModuleId, SemanticModel> semanticModels = new HashMap<>();
                project.currentPackage().moduleIds().forEach(moduleId -> {
                    Module packageModule = project.currentPackage().module(moduleId);
                    semanticModels.put(moduleId, compilation.getSemanticModel(moduleId));
                    packageModule.documentIds().forEach(docId -> project.documentPath(docId).ifPresent(path ->
                            {
                                syntaxTrees.put(docId, packageModule.document(docId).syntaxTree());
                                pathToDocumentIds.put(path.normalize(), docId);
                            }));
                    packageModule.testDocumentIds().forEach(docId -> project.documentPath(docId).ifPresent(path ->
                            {
                                syntaxTrees.put(docId, packageModule.document(docId).syntaxTree());
                                pathToDocumentIds.put(path.normalize(), docId);
                            }));
                });
                if (syntaxTrees.isEmpty() || semanticModels.isEmpty()) {
                    throw new RuntimeException("No source documents in project: " + project.sourceRoot());
                }
                return new StableSnapshot(syntaxTrees, pathToDocumentIds, semanticModels,
                        compilation, version);
            }

            private CompilationOptions compilationOptions(LockingMode lockingMode) {
                return CompilationOptions.builder()
                        .setOffline(CommonUtil.COMPILE_OFFLINE)
                        .setLockingMode(PackageLockingMode.valueOf(lockingMode.name()))
                        .build();
            }

            private BuildOptions buildOptions(LockingMode lockingMode) {
                return BuildOptions.builder()
                        .setOffline(CommonUtil.COMPILE_OFFLINE)
                        .setLockingMode(PackageLockingMode.valueOf(lockingMode.name()))
                        .build();
            }

            private LockingMode nextMorePermissiveMode(LockingMode mode) {
                return RecoveryLadder.nextMode(mode, FailureType.RESOLUTION_SUCCEEDED);
            }
        };

        WiringConfiguration config = WiringConfiguration.builder()
                .eventBus(eventBus)
                .snapshotStore(snapshotStore)
                .compilationAction(compilationAction)
                .projectRegistry(projectRegistry)
                .uriResolver(uriResolver)
                .projectLoader((root, kind) ->
                        BallerinaCompilerApi.getInstance().loadProject(Path.of(root.uri()), buildOptions))
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
                config.executionService()
        );
    }
}
