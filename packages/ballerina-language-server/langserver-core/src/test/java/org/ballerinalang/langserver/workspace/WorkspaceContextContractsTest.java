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
import io.ballerina.projects.Document;
import io.ballerina.projects.Module;
import io.ballerina.projects.PackageCompilation;
import io.ballerina.projects.Project;
import org.ballerinalang.langserver.commons.workspace.RunContext;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationPhase;
import org.ballerinalang.langserver.workspace.compilerengine.CompilationService;
import org.ballerinalang.langserver.workspace.documentstore.DocumentService;
import org.ballerinalang.langserver.workspace.documentstore.DocumentState;
import org.ballerinalang.langserver.workspace.documentstore.ReactivityTier;
import org.ballerinalang.langserver.workspace.eventbus.SubscriberTier;
import org.ballerinalang.langserver.workspace.executionmanager.ExecutionMode;
import org.ballerinalang.langserver.workspace.executionmanager.ExecutionService;
import org.ballerinalang.langserver.workspace.executionmanager.GracePeriod;
import org.ballerinalang.langserver.workspace.executionmanager.ProcessId;
import org.ballerinalang.langserver.workspace.executionmanager.ProcessState;
import org.ballerinalang.langserver.workspace.workspacemanager.EvictionReason;
import org.ballerinalang.langserver.workspace.workspacemanager.LockingMode;
import org.ballerinalang.langserver.workspace.workspacemanager.LockingModeAuthority;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectHealthState;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectKind;
import org.ballerinalang.langserver.workspace.workspacemanager.ProjectService;
import org.ballerinalang.langserver.workspace.workspacemanager.SourceRoot;
import org.eclipse.lsp4j.DidChangeTextDocumentParams;
import org.eclipse.lsp4j.DidChangeWatchedFilesParams;
import org.eclipse.lsp4j.DidCloseTextDocumentParams;
import org.eclipse.lsp4j.DidOpenTextDocumentParams;
import org.eclipse.lsp4j.FileEvent;
import org.eclipse.lsp4j.jsonrpc.CancelChecker;
import org.testng.Assert;
import org.testng.annotations.Test;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Collection;
import java.util.List;

/**
 * Verifies bounded-context API contracts and value objects.
 *
 * @since 1.7.0
 */
public class WorkspaceContextContractsTest {

    /**
     * Verifies workspace-manager enums expose the expected variants.
     */
    // RED: this test should fail - T-002 contracts are not implemented yet
    @Test
    public void workspaceManagerEnums_haveExpectedVariants() {
        assertEnumValues(ProjectKind.class, "SINGLE_FILE", "BUILD", "BALA", "WORKSPACE");
        assertEnumValues(ProjectHealthState.class, "HEALTHY", "COMPILATION_CRASHED", "PROJECT_CRASHED",
                "CANCELLED", "RECOVERING", "CIRCUIT_OPEN");
        assertEnumValues(LockingMode.class, "SOFT", "MEDIUM", "HARD", "LOCKED");
        assertEnumValues(LockingModeAuthority.class, "EXTERNAL_ENTITY", "CONFIG", "EVENT_DRIVEN");
        assertEnumValues(EvictionReason.class, "LRU", "HEAP_PRESSURE", "EXPLICIT");
    }

    /**
     * Verifies compiler, document, execution, and eventbus enums expose expected variants.
     */
    @Test
    public void otherContextEnums_haveExpectedVariants() {
        assertEnumValues(CompilationPhase.class, "PRE_PARSE", "POST_PARSE", "POST_TYPE_CHECK", "POST_DIAGNOSTICS");
        assertEnumValues(ProcessState.class, "STARTING", "RUNNING", "TERMINATING", "TERMINATED");
        assertEnumValues(ExecutionMode.class, "RUN", "DEBUG");
        assertEnumValues(ReactivityTier.class, "STRUCTURAL", "DEPENDENCY_GRAPH", "CONFIGURATION");
        assertEnumValues(DocumentState.class, "OPEN", "CLOSED");
        assertEnumValues(SubscriberTier.class, "CRITICAL", "COALESCEABLE", "BEST_EFFORT");
    }

    /**
     * Verifies ProjectService matches the contract signatures.
     *
     * @throws ReflectiveOperationException when a method is missing
     */
    @Test
    public void projectService_matchesContractSignatures() throws ReflectiveOperationException {
        Assert.assertTrue(ProjectService.class.isInterface());
        Assert.assertEquals(ProjectService.class.getMethods().length, 9);

        Method loadOrCreate = ProjectService.class.getMethod("loadOrCreate", Path.class, CancelChecker.class);
        Assert.assertEquals(loadOrCreate.getReturnType(), Project.class);

        Method allProjects = ProjectService.class.getMethod("allProjects");
        Assert.assertEquals(allProjects.getReturnType(), Collection.class);

        Method module = ProjectService.class.getMethod("module", Path.class, CancelChecker.class);
        Assert.assertEquals(module.getReturnType(), Module.class);

        Method setLockingMode = ProjectService.class.getMethod("setLockingMode", LockingMode.class,
                LockingModeAuthority.class);
        Assert.assertEquals(setLockingMode.getReturnType(), Void.TYPE);

        Method getLockingMode = ProjectService.class.getMethod("getLockingMode");
        Assert.assertEquals(getLockingMode.getReturnType(), LockingMode.class);

        Method registerWorkspace = ProjectService.class.getMethod("registerWorkspace", java.util.List.class);
        Assert.assertEquals(registerWorkspace.getReturnType(), Void.TYPE);
    }

    /**
     * Verifies CompilationService matches the contract signatures.
     *
     * @throws ReflectiveOperationException when a method is missing
     */
    @Test
    public void compilationService_matchesContractSignatures() throws ReflectiveOperationException {
        Assert.assertTrue(CompilationService.class.isInterface());
        Assert.assertEquals(CompilationService.class.getMethods().length, 3);

        Method syntaxTree = CompilationService.class.getMethod("syntaxTree", Path.class, CancelChecker.class);
        Assert.assertEquals(syntaxTree.getReturnType(), SyntaxTree.class);

        Method semanticModel = CompilationService.class.getMethod("semanticModel", Path.class, CancelChecker.class);
        Assert.assertEquals(semanticModel.getReturnType(), SemanticModel.class);

        Method compilation = CompilationService.class.getMethod("compilation", Path.class, CancelChecker.class);
        Assert.assertEquals(compilation.getReturnType(), PackageCompilation.class);
    }

    /**
     * Verifies DocumentService matches the contract signatures.
     *
     * @throws ReflectiveOperationException when a method is missing
     */
    @Test
    public void documentService_matchesContractSignatures() throws ReflectiveOperationException {
        Assert.assertTrue(DocumentService.class.isInterface());
        Assert.assertEquals(DocumentService.class.getMethods().length, 10);

        Method document = DocumentService.class.getMethod("document", Path.class, CancelChecker.class);
        Assert.assertEquals(document.getReturnType(), Document.class);

        Method relativePath = DocumentService.class.getMethod("relativePath", Path.class, CancelChecker.class);
        Assert.assertEquals(relativePath.getReturnType(), String.class);

        Method uriScheme = DocumentService.class.getMethod("uriScheme");
        Assert.assertEquals(uriScheme.getReturnType(), String.class);

        Method didOpen = DocumentService.class.getMethod("didOpen", Path.class, DidOpenTextDocumentParams.class);
        Assert.assertEquals(didOpen.getReturnType(), Void.TYPE);

        Method didChange = DocumentService.class.getMethod("didChange", Path.class, DidChangeTextDocumentParams.class);
        Assert.assertEquals(didChange.getReturnType(), Void.TYPE);

        Method didClose = DocumentService.class.getMethod("didClose", Path.class, DidCloseTextDocumentParams.class);
        Assert.assertEquals(didClose.getReturnType(), Void.TYPE);

        Method didChangeWatchedSingle = DocumentService.class.getMethod("didChangeWatched", Path.class,
                FileEvent.class);
        Assert.assertEquals(didChangeWatchedSingle.getReturnType(), Void.TYPE);

        Method didChangeWatchedBatch = DocumentService.class.getMethod("didChangeWatched",
                DidChangeWatchedFilesParams.class);
        Assert.assertEquals(didChangeWatchedBatch.getReturnType(), Void.TYPE);
    }

    /**
     * Verifies ExecutionService matches the contract signatures.
     *
     * @throws ReflectiveOperationException when a method is missing
     */
    @Test
    public void executionService_matchesContractSignatures() throws ReflectiveOperationException {
        Assert.assertTrue(ExecutionService.class.isInterface());
        Assert.assertEquals(ExecutionService.class.getMethods().length, 2);

        Method run = ExecutionService.class.getMethod("run", RunContext.class);
        Assert.assertEquals(run.getReturnType(), ProcessId.class);

        Method stop = ExecutionService.class.getMethod("stop", SourceRoot.class);
        Assert.assertEquals(stop.getReturnType(), Void.TYPE);
    }

    /**
     * Verifies execution value objects are immutable public records.
     */
    @Test
    public void executionValueObjects_areImmutable() {
        Assert.assertTrue(GracePeriod.class.isRecord());
        Assert.assertTrue(ProcessId.class.isRecord());
        Assert.assertTrue(Modifier.isPublic(GracePeriod.class.getModifiers()));
        Assert.assertTrue(Modifier.isPublic(ProcessId.class.getModifiers()));

        List<String> processMethodNames = List.of(ProcessId.class.getMethods()).stream()
                .map(Method::getName)
                .toList();
        Assert.assertFalse(processMethodNames.stream().anyMatch(name -> name.startsWith("set")));

        List<String> graceMethodNames = List.of(GracePeriod.class.getMethods()).stream()
                .map(Method::getName)
                .toList();
        Assert.assertFalse(graceMethodNames.stream().anyMatch(name -> name.startsWith("set")));
    }

    /**
     * Verifies GracePeriod retains the duration value.
     */
    @Test
    public void gracePeriod_retainsDurationValue() {
        GracePeriod gracePeriod = new GracePeriod(Duration.ofSeconds(5));
        Assert.assertEquals(gracePeriod.duration(), Duration.ofSeconds(5));
    }

    /**
     * Verifies ProcessId retains identifier value.
     */
    @Test
    public void processId_retainsIdentifierValue() {
        ProcessId processId = new ProcessId("process-1");
        Assert.assertEquals(processId.value(), "process-1");
    }

    /**
     * Asserts exact enum value ordering and names.
     *
     * @param enumType enum class to inspect
     * @param expectedNames expected names in declaration order
     */
    private static void assertEnumValues(Class<? extends Enum<?>> enumType, String... expectedNames) {
        String[] actualNames = List.of(enumType.getEnumConstants()).stream()
                .map(Enum::name)
                .toArray(String[]::new);
        Assert.assertEquals(actualNames, expectedNames);
    }
}
