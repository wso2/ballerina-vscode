# Workspace Baseline Results

Baseline branch: `feat14`

## Commands

### `./gradlew xsd-service:xsd-service-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-061605-xsd-service-ls-extension-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-061605-xsd-service-ls-extension-test.time`
- Exit status: 0
- Elapsed time: 6.83s
- Peak RSS: 108920832 bytes
- Result: module test task exists on `feat14` and passed; no `TEST-*.xml` reports were generated.

### `./gradlew wsdl-service:wsdl-service-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-061157-wsdl-service-ls-extension-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-061157-wsdl-service-ls-extension-test.time`
- Exit status: 0
- Elapsed time: 10.69s
- Peak RSS: 108429312 bytes
- Result: module test task exists on `feat14` and passed; XML reports record 1 test, 0 failures, 0 errors, 0 skipped.

### `./gradlew test-manager-service:test-manager-service-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-060215-test-manager-service-ls-extension-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-060215-test-manager-service-ls-extension-test.time`
- Exit status: 0
- Elapsed time: 10.36s
- Peak RSS: 107610112 bytes
- Result: module test task exists on `feat14` and passed; XML reports record 9 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew sequence-model-generator:sequence-model-generator-core:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-053738-sequence-model-generator-core-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-053738-sequence-model-generator-core-test.time`
- Exit status: 0
- Elapsed time: 1.94s
- Peak RSS: 108036096 bytes
- Result: module test task exists on `feat14` and passed as `NO-SOURCE`; no `TEST-*.xml` reports were generated.

### `./gradlew sequence-model-generator:sequence-model-generator-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-054236-sequence-model-generator-ls-extension-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-054236-sequence-model-generator-ls-extension-test.time`
- Exit status: 0
- Elapsed time: 16.57s
- Peak RSS: 108871680 bytes
- Result: module test task exists on `feat14` and passed; XML reports record 18 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew service-model-generator:service-model-generator-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-054742-service-model-generator-ls-extension-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-054742-service-model-generator-ls-extension-test.time`
- Exit status: 0
- Elapsed time: 138.22s
- Peak RSS: 108511232 bytes
- Result: module test task exists on `feat14` and passed; XML reports record 202 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew service-model-generator:service-model-index-generator:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-055614-service-model-index-generator-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-055614-service-model-index-generator-test.time`
- Exit status: 0
- Elapsed time: 3.16s
- Peak RSS: 108412928 bytes
- Result: module test task exists on `feat14` and passed as `NO-SOURCE`; no `TEST-*.xml` reports were generated.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.WorkspaceContextContractsTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/WorkspaceContextContractsTest-20260427-231048.log`
- Exit status: 1
- Elapsed time: 23.69s
- Peak RSS: 103366656 bytes
- Result: baseline branch does not contain this test class; Gradle reported no tests found for the filter.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.compilerengine.CompilationServiceImplTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/CompilationServiceImplTest-20260427-232517.log`
- Exit status: 1
- Elapsed time: 12.77s
- Peak RSS: 104284160 bytes
- Result: baseline branch does not contain this test class; Gradle reported no tests found for the filter.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.*'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/workspace-wildcard-20260427-232550.log`
- Exit status: 0
- Elapsed time: 29.09s
- Peak RSS: 107380736 bytes
- Result: scoped workspace test selection passed on the baseline branch.
- Note: this exact filter selects only `TestWorkspaceManager` on `feat14` (40 tests), but selects the expanded workspace
  suite on the target branch (545 tests across 42 XML reports), so elapsed time is not a like-for-like suite-size
  comparison. Memory remains comparable.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.TestWorkspaceManager'`

- Invalid cached output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/TestWorkspaceManager-feat14-20260428115639.log`
- Invalid cached metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/TestWorkspaceManager-feat14-20260428115639.metrics`
- Invalid cached result: exit status 0, but `:langserver-core:test FROM-CACHE`, so timing is not comparable.
- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/TestWorkspaceManager-feat14-nocache-20260428115732.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/TestWorkspaceManager-feat14-nocache-20260428115732.metrics`
- Exit status: 0
- Elapsed time: 28.73s
- Peak RSS: 106774528 bytes
- Result: scoped legacy workspace-manager behavior tests passed on the baseline branch.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.compilerengine.CompilationPipelineTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/CompilationPipelineTest-20260427-233606.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/CompilationPipelineTest-20260427-233606.metrics`
- Exit status: 1
- Elapsed time: 14.98s
- Peak RSS: 106119168 bytes
- Result: baseline branch does not contain this test class; Gradle reported no tests found for the filter.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.TestDidChangeWatchedFiles'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/TestDidChangeWatchedFiles-20260427-234323.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/TestDidChangeWatchedFiles-20260427-234323.metrics`
- Exit status: 0
- Elapsed time: 32.65s
- Peak RSS: 106217472 bytes
- Result: scoped watched-file test passed on the baseline branch.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.lspgateway.WorkspaceManagerFacadeImplTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/WorkspaceManagerFacadeImplTest-20260427.log`
- Exit status: 1
- Elapsed time: 6.35s
- Peak RSS: 106299392 bytes
- Result: baseline branch does not contain this test class; Gradle reported no tests found for the filter.

### `./gradlew :langserver-core:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/langserver-core-test-20260428-150909.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/langserver-core-test-20260428-150909.time.txt`
- Exit status: 0
- Elapsed time: 436.40s
- Peak RSS: 115474432 bytes
- Result: full `langserver-core` module passed on the baseline branch.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.references.BalaSchemeReferencesTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/BalaSchemeReferencesTest-20260428-151940.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/BalaSchemeReferencesTest-20260428-151940.metrics`
- Exit status: 0
- Elapsed time: 42.65s
- Peak RSS: 105480192 bytes
- Result: scoped bala references test passed on the baseline branch.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.diagnostics.WorkspaceDiagnosticsTest.testWorkspaceDiagnosticsAfterFunctionSignatureChange'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/WorkspaceDiagnosticsTest-testWorkspaceDiagnosticsAfterFunctionSignatureChange-20260428-152432.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/WorkspaceDiagnosticsTest-testWorkspaceDiagnosticsAfterFunctionSignatureChange-20260428-152432.metrics`
- Exit status: 0 for the Gradle test run
- Elapsed time: 23.62s
- Peak RSS: 108740608 bytes
- Result: focused workspace diagnostics signature-change test passed on the baseline branch.
- Note: the wrapper hit a zsh reserved-variable error after Gradle finished, so the metrics file is empty; time output is present at the end of the log.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.diagnostics.WorkspaceDiagnosticsTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/WorkspaceDiagnosticsTest-20260428-160809.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/WorkspaceDiagnosticsTest-20260428-160809.metrics`
- Exit status: 0 for the Gradle test run
- Elapsed time: 29.06s
- Peak RSS: 124157952 bytes
- Result: scoped workspace diagnostics class passed on the baseline branch.
- Note: the wrapper hit a zsh reserved-variable error after Gradle finished, but the Gradle log shows `BUILD SUCCESSFUL`.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.UriResolverTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/UriResolverTest-20260428-160805.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/UriResolverTest-20260428-160805.metrics`
- Exit status: 1
- Elapsed time: 6.93s
- Peak RSS: 106659840 bytes
- Result: baseline branch does not contain this test class; Gradle reported no tests found for the filter.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.exprscheme.TestExpressionFileScheme'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-162340-TestExpressionFileScheme.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-162340-TestExpressionFileScheme.time.txt`
- Exit status: 0
- Elapsed time: 37.88s
- Peak RSS: 104759296 bytes
- Result: scoped expression-scheme test passed on the baseline branch.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.hover.HoverProviderTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-162438-HoverProviderTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-162438-HoverProviderTest.time.txt`
- Exit status: 0
- Elapsed time: 52.54s
- Peak RSS: 106070016 bytes
- Result: scoped hover-provider test passed on the baseline branch.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.diagnostics.CyclicDependenciesTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-183220-CyclicDependenciesTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-183220-CyclicDependenciesTest.time`
- Exit status: 1
- Elapsed time: 43.24s
- Peak RSS: 104218624 bytes
- Result: baseline branch contains the test class file, but Gradle reported no tests found for this filter.

### `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.completion.FieldAccessExpressionContextTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-183316-FieldAccessExpressionContextTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-183316-FieldAccessExpressionContextTest.time`
- Exit status: 0
- Elapsed time: 74.11s
- Peak RSS: 108019712 bytes
- Result: scoped field-access completion test passed on the baseline branch.

### `./gradlew architecture-model-generator:architecture-model-generator-core:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-185730-01.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-185730-01.time`
- Exit status: 0
- Elapsed time: 16.22s
- Peak RSS: 119635968 bytes
- Result: module test task exists on `feat14` and passed.

### `./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-185747-02.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-185747-02.time`
- Exit status: 1
- Elapsed time: 89.23s
- Peak RSS: 108544000 bytes
- Result: module test task exists on `feat14`; `50 tests completed, 4 failed` due to `ArtifactsTest` JSON icon-version mismatches for `rabbitmq` and `tcp`.

### `./gradlew bal-shell-service:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-185916-03.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-185916-03.time`
- Exit status: 0
- Elapsed time: 66.40s
- Peak RSS: 105922560 bytes
- Result: module test task exists on `feat14` and passed.

### `./gradlew edi-service:edi-service-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-190023-04.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-190023-04.time`
- Exit status: 0
- Elapsed time: 9.42s
- Peak RSS: 111050752 bytes
- Result: module test task exists on `feat14` and passed.

### `./gradlew flow-model-generator:flow-model-central-client:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-190033-05.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260428-190033-05.time`
- Exit status: 0
- Elapsed time: 1.72s
- Peak RSS: 106315776 bytes
- Result: module test task exists on `feat14` and passed.

### `./gradlew flow-model-generator:flow-model-generator-core:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-150613-flow-model-generator-core-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-150613-flow-model-generator-core-test.time`
- Exit status: 0
- Elapsed time: 9.54s
- Peak RSS: 111050752 bytes
- Result: module test task exists on `feat14` and passed with 21 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ModelGeneratorTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-155003-flow-model-generator-ls-extension-ModelGeneratorTest.log`
- Exit status: 1
- Elapsed time: 185.08s
- Peak RSS: 110870528 bytes
- Result: focused model generator test exists on `feat14`; 173 tests ran with 1 stale fixture failure.
- Reuse note: this baseline was reused for the 2026-05-16 workflow fixture worker; it was not rerun.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.SourceGeneratorTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-164331-flow-model-generator-ls-extension-SourceGeneratorTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-164331-flow-model-generator-ls-extension-SourceGeneratorTest.time`
- Exit status: 0
- Elapsed time: 35.60s
- Peak RSS: 110313472 bytes
- Result: focused source generator test exists on `feat14` and passed; XML report records 320 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.typesmanager.JsonToTypeTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-165453-flow-model-generator-ls-extension-JsonToTypeTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-165453-flow-model-generator-ls-extension-JsonToTypeTest.time`
- Exit status: 0
- Elapsed time: 7.02s
- Peak RSS: 109412352 bytes
- Result: focused JSON-to-type test exists on `feat14` and passed; XML report records 27 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.embeddingprovidermanager.EmbeddingProviderSearchTest' --tests 'io.ballerina.flowmodelgenerator.extension.modelprovidermanager.ModelProviderSearchTest' --tests 'io.ballerina.flowmodelgenerator.extension.vectorstoremanager.VectorStoreSearchTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-170218-flow-model-generator-ls-extension-provider-search-combined.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-170218-flow-model-generator-ls-extension-provider-search-combined.time`
- Exit status: 1
- Elapsed time: 55.40s
- Peak RSS: 110346240 bytes
- Result: focused provider/vector-store search tests exist on `feat14`; 9 tests ran and 6 failed due to stale Central icon-version fixture drift.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorDiagnosticsTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-171322-flow-model-generator-ls-extension-ExpressionEditorDiagnosticsTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-171322-flow-model-generator-ls-extension-ExpressionEditorDiagnosticsTest.time`
- Exit status: 0
- Elapsed time: 97.01s
- Peak RSS: 107741184 bytes
- Result: focused expression-editor diagnostics test exists on `feat14` and passed.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.DataMappingCompletionTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-172656-flow-model-generator-ls-extension-DataMappingCompletionTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-172656-flow-model-generator-ls-extension-DataMappingCompletionTest.time`
- Exit status: 0
- Elapsed time: 13.10s
- Peak RSS: 109182976 bytes
- Result: focused data-mapping completion test exists on `feat14` and passed; XML report records 3 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.agentsmanager.GetModelsTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-173046-flow-model-generator-ls-extension-GetModelsTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-173046-flow-model-generator-ls-extension-GetModelsTest.time`
- Exit status: 0
- Elapsed time: 9.81s
- Peak RSS: 111116288 bytes
- Result: focused agent-manager get-models test exists on `feat14` and passed; XML report records 1 test, 0 failures, 0 errors, 0 skipped.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.FlowModelDiagnosticsTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-174137-flow-model-generator-ls-extension-FlowModelDiagnosticsTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-174137-flow-model-generator-ls-extension-FlowModelDiagnosticsTest.time`
- Exit status: 1
- Elapsed time: 25.24s
- Peak RSS: 110919680 bytes
- Result: focused flow-model diagnostics test exists on `feat14`; XML report records 21 tests, 1 failure, 0 errors, 0 skipped. The failure is stale Central icon/version drift for `ballerinax/kafka` 4.6.4 -> 4.6.5. The target-only `wait_data.json` case is absent on `feat14`.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorSemanticTokensTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-174743-flow-model-generator-ls-extension-ExpressionEditorSemanticTokensTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-174743-flow-model-generator-ls-extension-ExpressionEditorSemanticTokensTest.time`
- Exit status: 0
- Elapsed time: 6.74s
- Peak RSS: 109723648 bytes
- Result: focused expression-editor semantic-tokens test exists on `feat14` and passed; XML report records 36 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorCompletionTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-183142-flow-model-generator-ls-extension-ExpressionEditorCompletionTest.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-183142-flow-model-generator-ls-extension-ExpressionEditorCompletionTest.time`
- Exit status: 0
- Elapsed time: 39.34s
- Peak RSS: 110755840 bytes
- Result: focused expression-editor completion test exists on `feat14` and passed; XML report records 26 tests, 0 failures, 0 errors, 0 skipped.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260516-151139-flow-model-generator-ls-extension-test.log`
- Exit status: 1
- Elapsed time: 1121.05s
- Peak RSS: 107429888 bytes
- Result: module test task exists on `feat14`; `1778 tests completed, 7 failed`, apparently stale dependency/version fixture failures.

### `./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.designmodelgenerator.extension.ArtifactsTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/artifacts-test-20260428-192429.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/artifacts-test-20260428-192429.time`
- Exit status: 1
- Elapsed time: 226.66s
- Peak RSS: 105906176 bytes
- Result: module/test command exists on `feat14`, but the focused `--tests` selector matched zero tests, so no test cases executed.

### `./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.designmodelgenerator.extension.PublishArtifactsSubscriberTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/publish-artifacts-subscriber-test-20260428-202600.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/publish-artifacts-subscriber-test-20260428-202600.time`
- Exit status: 0
- Elapsed time: 35.42s
- Peak RSS: 112246784 bytes
- Result: focused subscriber test exists on `feat14` and passed.

### `./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.designmodelgenerator.extension.DesignModelGeneratorTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/design-model-generator-test-20260428-204100.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/design-model-generator-test-20260428-204100.time`
- Exit status: 0
- Elapsed time: 30.26s
- Peak RSS: 120619008 bytes
- Result: focused design model generator test exists on `feat14` and passed.

### `./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.copilotagent.extension.SemanticDiffComputerTest'`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/semantic-diff-computer-test-20260428-205508.stdout.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/semantic-diff-computer-test-20260428-205508.time.log`
- Exit status: 0
- Elapsed time: 5.33s
- Peak RSS: 108347392 bytes
- Result: focused semantic diff test exists on `feat14` and passed. Gradle reported the task up-to-date, and the existing XML report recorded 11 tests with 0 failures.

### `./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorCompletionTest' --tests 'io.ballerina.flowmodelgenerator.extension.DataMappingCompletionTest' --rerun-tasks`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-completion-classes-shared-compilation-guard-baseline.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-completion-classes-shared-compilation-guard-baseline.time`
- Exit status: 0
- Elapsed time: 56.84s
- Peak RSS: 107118592 bytes
- Result: combined focused completion command exists on `feat14` and passed. XML reports `ExpressionEditorCompletionTest` 26 tests and `DataMappingCompletionTest` 3 tests, with 0 failures/errors/skips.

### `./gradlew langserver-commons:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-045102-langserver-commons-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-045102-langserver-commons-test.time`
- Exit status: 0
- Elapsed time: 1.72s
- Peak RSS: 111312896 bytes
- Result: module test task exists on `feat14` and passed. No `TEST-*.xml` reports were generated for this task.

### `./gradlew langserver-stdlib:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-045513-langserver-stdlib-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-045513-langserver-stdlib-test.time`
- Exit status: 0
- Elapsed time: 1.38s
- Peak RSS: 111362048 bytes
- Result: module test task exists on `feat14` and passed as `NO-SOURCE`. No `TEST-*.xml` reports were generated for this task.

### `./gradlew model-generator-commons:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-045949-model-generator-commons-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-045949-model-generator-commons-test.time`
- Exit status: 0
- Elapsed time: 1.63s
- Peak RSS: 109854720 bytes
- Result: module test task exists on `feat14` and passed as `NO-SOURCE`. No `TEST-*.xml` reports were generated for this task.

### `./gradlew openapi-service:openapi-service-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-050410-openapi-service-ls-extension-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-050410-openapi-service-ls-extension-test.time`
- Exit status: 0
- Elapsed time: 6.67s
- Peak RSS: 108953600 bytes
- Result: module test task exists on `feat14` and passed as `NO-SOURCE`. No `TEST-*.xml` reports were generated for this task.

### `./gradlew persist-service:persist-service-ls-extension:test`

- Output: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-050821-persist-service-ls-extension-test.log`
- Metrics: `/Users/wso2/projects/ballerina/ballerina-language-server/feat14/build/codex-workspace-baseline-logs/20260517-050821-persist-service-ls-extension-test.time`
- Exit status: 1
- Elapsed time: 723.38s
- Peak RSS: 111198208 bytes
- Result: module test task exists on `feat14`, but Gradle failed before executing tests because `:persist-service:persist-service-ls-extension:waitForServices` timed out after 300 seconds. MySQL and PostgreSQL became healthy; MSSQL stayed `starting` and then `unhealthy`. No `TEST-*.xml` reports were generated.
