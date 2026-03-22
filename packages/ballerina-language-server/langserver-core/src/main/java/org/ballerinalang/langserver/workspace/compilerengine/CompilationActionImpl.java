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
import org.ballerinalang.langserver.workspace.compilerengine.revovery.FailureType;
import org.ballerinalang.langserver.workspace.compilerengine.revovery.RecoveryLadder;
import org.ballerinalang.langserver.workspace.compilerengine.revovery.ResolutionResult;
import org.ballerinalang.langserver.workspace.compilerengine.snapshot.StableSnapshot;
import org.ballerinalang.langserver.workspace.workspacemanager.change.ContentVersion;
import org.ballerinalang.langserver.workspace.workspacemanager.LockingMode;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceImpl;

import javax.annotation.Nonnull;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Concrete implementation of {@link CompilationPipeline.CompilationAction} that delegates
 * to ProjectService for project loading and snapshot building.
 *
 * @since 1.7.0
 */
public final class CompilationActionImpl implements CompilationPipeline.CompilationAction {

    private final ProjectServiceImpl projectService;

    public CompilationActionImpl(@Nonnull ProjectServiceImpl projectService) {
        this.projectService = projectService;
    }

    @Override
    public PackageDescriptor describe(String sourceRootIdentifier) {
        Project project = projectService.loadOrCreateFromIdentifier(sourceRootIdentifier, null);
        return project.currentPackage().descriptor();
    }

    @Override
    public ResolutionResult resolve(CompileTask task) {
        LockingMode lockingMode = currentLockingMode(task);
        String sourceRootIdentifier = task.sourceRootIdentifier();
        try {
            Project project = projectService.loadOrCreateFromIdentifier(sourceRootIdentifier, null);
            project.currentPackage().getResolution(compilationOptions(lockingMode));
            return new ResolutionResult(task.descriptor(), List.of(), true);
        } catch (RuntimeException e) {
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            return new ResolutionResult(task.descriptor(), List.of(
                    new ResolutionResult.ResolutionDiagnostic(ResolutionResult.Severity.ERROR,
                            message, sourceRootIdentifier)), false);
        }
    }

    @Override
    public StableSnapshot compile(CompileTask task) {
        return snapshot(projectService.loadOrCreateFromIdentifier(task.sourceRootIdentifier(), null),
                task.contentVersion());
    }

    @Override
    public LockingMode currentLockingMode(CompileTask task) {
        Project project = projectService.loadOrCreateFromIdentifier(task.sourceRootIdentifier(), null);
        return projectService.getLockingMode(project);
    }

    @Override
    public CompilationPipeline.RecoveryResult recover(CompileTask task, LockingMode initialMode, Throwable cause) {
        LockingMode recoveryMode = nextMorePermissiveMode(initialMode);
        while (recoveryMode != initialMode) {
            try {
                Project transientProject = BallerinaCompilerApi.getInstance()
                        .loadProject(projectService.resolvePathFromIdentifier(task.sourceRootIdentifier()),
                                buildOptions(recoveryMode));
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

    private StableSnapshot snapshot(Project project,
                                    ContentVersion version) {
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
}
