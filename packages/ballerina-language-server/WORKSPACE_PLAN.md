# Workspace Fix Plan

## Current Objective

Complete every module-level command listed in `module_tasks.md`, recording current-branch results and matching
`feat14` baselines where the module exists.

## Test Order

1. Run focused workspace class-level tests until the first failure is isolated.
2. Record the same command once on `feat14` in `WORKSPACE_BASELINE.md`.
3. Fix the smallest implicated workspace area.
4. Rerun the class-level command.
5. Expand to the related scoped workspace package only after the class-level command is clean.

## Active Scope

- Latest loop note (2026-05-17): exact current-branch `./gradlew :langserver-core:test` now passes. Evidence:
  `build/codex-workspace-test-logs/20260517-151100-langserver-core-test-after-codeaction-harness-fix.log`,
  exit 0, 3479 tests, no failing/error XML reports, elapsed 163.70s, peak RSS 111968256 bytes. Existing `feat14`
  baseline for the same command passed in 436.40s / 115474432-byte RSS, so target time improved and memory is
  comparable.
- Completed command: latest accepted module is `./gradlew :langserver-core:test`.
- Next scope: no unchecked local module tasks remain; `persist-service:persist-service-ls-extension:test` remains the
  only CI/environment follow-up and needs amd64 Docker/CI because local arm64 Docker segfaults the pinned MSSQL image.
- Latest loop note (2026-05-17): exact current-branch `./gradlew :langserver-core:test` failed during
  `:langserver-core:compileTestJava`, before TestNG execution. Evidence:
  `build/codex-workspace-test-logs/20260517-124930-langserver-core-test.log`, metrics
  `build/codex-workspace-test-logs/20260517-124930-langserver-core-test.time`, exit status 1, elapsed 4.66s,
  peak RSS 114294784 bytes. Failure location:
  `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/TestWorkspaceManager.java:924`, inside
  `testDocumentLifecycleWithLastCloseEviction`, calling missing interface method
  `WorkspaceManager.setEvictProjectOnLastClose(boolean)`. No XML test reports identify a failing TestNG method because
  compilation failed before tests ran. Baseline already exists for exact `./gradlew :langserver-core:test`; no `feat14`
  rerun was performed.
- Status: `persist-service:persist-service-ls-extension:test` is classified as locally blocked; direct Docker evidence
  shows the pinned `linux/amd64` MSSQL image segfaulting under QEMU on the local `arm64` Docker server before Java tests
  run. This is not accepted as a passing module and must be rerun on amd64 Docker/CI, but it is no longer the local next
  scope.
- Completed command: latest accepted module is `./gradlew xsd-service:xsd-service-ls-extension:test`.
- Next scope: no unchecked local module tasks remain; orchestrator should do final review and schedule
  `persist-service:persist-service-ls-extension:test` on amd64 Docker/CI.
- Focus: continue module-level validation after the shared compiler compilation guard and URI-scoped workspace changes.
- Latest loop note (2026-05-17): a shared guard around direct `Package.getCompilation()` calls was retained in
  `langserver-commons` and routed through CE snapshot creation, facade direct semantic reads, model-generator
  `PackageUtil`, and active flow-model direct package-compilation reads. Full forced rerun had no
  `ctxData is null` / `CompilerPluginManager` matches but still failed one data-mapping completion assertion.
- Latest loop note (2026-05-17): making `TestUtil.shutdownLanguageServer(...)` wait for the JSON-RPC `shutdown`
  response fixed a smaller cross-class reproducer (`AvailableNodesTest` + `ExpressionEditorCompletionTest`), but the
  full module still fails `DataMappingCompletionTest.test[2](proj3.json)`. A reduced ordered slice from
  `ExpressionEditorCompletionTest` through `DataMappingCompletionTest` reproduces the same data-mapping zero
  completions in 377.37s / 108478464-byte RSS, while the data-mapping-only block passes in 148.45s /
  108707840-byte RSS. A setup slice through `ImportModuleTest` plus `DataMappingCompletionTest` instead failed earlier
  in `ExpressionEditorCompletionTest.test[14](proj12.json)` and then let `DataMappingCompletionTest` pass, so the
  remaining issue is an ordering-sensitive completion-path race rather than a stale data-mapping fixture.
- Latest loop note (2026-05-17): the ordered expression/config/import/data-mapping block passed after making
  model-generator fixture paths/loggers instance-scoped, preventing the expression-editor debouncer from interrupting
  already-running requests, guarding `LSPackageLoader` against an absent current project, and making URI-scoped
  `project(Path)` load through the preserved `expr://` URI. Evidence:
  `build/codex-workspace-test-logs/20260517-worker-expression-through-datamapping-completion-after-scoped-project-load.log`
  passed in 371.19s / 110903296-byte RSS; data-mapping-only block
  `20260517-worker-datamapping-block-through-completion-after-scoped-project-load.log` passed in 152.32s /
  109051904-byte RSS; full module `20260517-flow-model-generator-ls-extension-full-after-scoped-project-load.log`
  passed 1839 tests in 949.50s / 111706112-byte RSS.
- Latest loop note (2026-05-17): direct compose investigation for `persist-service:persist-service-ls-extension:test`
  captured Docker facts and MSSQL logs before cleanup. Host/client are `arm64`, Docker server is `aarch64`, compose is
  v5.0.1, and `mcr.microsoft.com/mssql/server:2019-latest` is `linux/amd64`. The MSSQL container runs through
  `/usr/bin/qemu-x86_64` and `/opt/mssql/bin/sqlservr` exits with `qemu: uncaught target signal 11 (Segmentation fault)`;
  `/tmp/db-initialized` is never created. Evidence prefix:
  `build/codex-workspace-test-logs/20260517-053203-*`. The stack was cleaned up after logs were preserved.
- Latest loop note (2026-05-17): `service-model-generator:service-model-generator-ls-extension:test` passed as-is on
  the target branch: 207 tests, 0 failures/errors/skips, 82.58s / 106921984-byte RSS. A new matching `feat14`
  baseline was recorded: 202 tests, 0 failures/errors/skips, 138.22s / 108511232-byte RSS. No architecture docs were
  consulted and no source changes were made because the module passed as-is.
- Latest loop note (2026-05-17): `service-model-generator:service-model-index-generator:test` passed as-is on the
  target branch as `NO-SOURCE` with no XML reports, 1.46s / 111869952-byte RSS. A new matching `feat14` baseline was
  recorded: `NO-SOURCE` with no XML reports, 3.16s / 108412928-byte RSS. No architecture docs were consulted and no
  source changes were made because the module passed as-is.
- Latest loop note (2026-05-17): `test-manager-service:test-manager-service-ls-extension:test` passed without source
  changes. The exact target command succeeded from Gradle cache/up-to-date in 4.29s / 110198784-byte RSS and 4.16s /
  110395392-byte RSS. For fresh execution comparison, `cleanTest` plus `--no-build-cache` was used; one fresh run
  transiently failed `GetFunctionModelTest` with `NoSuchElementException`, but the focused class passed and a fresh
  full-module rerun passed 9 tests in 8.67s / 110657536-byte RSS. The new matching `feat14` baseline passed 9 tests in
  10.36s / 107610112-byte RSS. No architecture docs were consulted because no behavior change was made.
- Latest loop note (2026-05-17): `wsdl-service:wsdl-service-ls-extension:test` passed on the target branch without
  source changes: 1 test, 0 failures/errors/skips, 9.11s / 108101632-byte RSS. The new matching `feat14` baseline
  passed 1 test in 10.69s / 108429312-byte RSS, so target time is faster and memory is slightly lower. No architecture
  docs were consulted because no behavior change was made.
- Latest loop note (2026-05-17): `xsd-service:xsd-service-ls-extension:test` passed on the target branch without
  source changes: exact command succeeded in 6.28s / 110804992-byte RSS with no `TEST-*.xml` reports generated. The new
  matching `feat14` baseline passed in 6.83s / 108920832-byte RSS with no XML reports, so target time is faster and
  memory remains comparable. No architecture docs were consulted because no behavior change was made.

## Verified Target-Branch Commands

- FAIL: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-124930-langserver-core-test.time ./gradlew :langserver-core:test`
  - Output: `build/codex-workspace-test-logs/20260517-124930-langserver-core-test.log`
  - Exit status: 1
  - Elapsed time: 4.66s
  - Peak RSS: 114294784 bytes
  - Failure: `:langserver-core:compileTestJava` fails before TestNG execution at
    `TestWorkspaceManager.java:924` in `testDocumentLifecycleWithLastCloseEviction`; the test calls missing
    `WorkspaceManager.setEvictProjectOnLastClose(boolean)`.
  - Baseline: exact `feat14` baseline already recorded as passing in 436.40s with 115474432-byte RSS; not rerun.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260428-185730-architecture-model-generator-core-test.time ./gradlew architecture-model-generator:architecture-model-generator-core:test`
  - Output: `build/codex-workspace-test-logs/20260428-185730-architecture-model-generator-core-test.log`
  - Elapsed time: 17.18s
  - Peak RSS: 106708992 bytes
  - Baseline: `feat14` passed in 16.22s with 119635968-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/artifacts-test-after-fixture-update-20260428-202333.time ./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.designmodelgenerator.extension.ArtifactsTest'`
  - Output: `build/codex-workspace-test-logs/artifacts-test-after-fixture-update-20260428-202333.log`
  - Tests: 14, failures: 0, skipped: 0
  - Elapsed time: 39.89s
  - Peak RSS: 106479616 bytes
  - Baseline: focused selector exists on `feat14` but matched zero tests; full module baseline only failed on stale icon fixtures.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/publish-artifacts-subscriber-after-fixtures-20260428-203215.time ./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.designmodelgenerator.extension.PublishArtifactsSubscriberTest'`
  - Output: `build/codex-workspace-test-logs/publish-artifacts-subscriber-after-fixtures-20260428-203215.log`
  - Elapsed time: 20.25s
  - Peak RSS: 106758144 bytes
  - Baseline: `feat14` focused subscriber test passed in 35.42s with 112246784-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/design-model-generator-test-after-duplicate-20260428-205116.time.log ./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.designmodelgenerator.extension.DesignModelGeneratorTest'`
  - Output: `build/codex-workspace-test-logs/design-model-generator-test-after-duplicate-20260428-205116.stdout.log`
  - Tests: 8, failures: 0, skipped: 0
  - Elapsed time: 13.26s
  - Peak RSS: 105906176 bytes
  - Baseline: `feat14` focused design-model test passed in 30.26s with 120619008-byte RSS.
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.ChangeLayerTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.ChangeBufferTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.TrieNodeTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.UriResolverTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.ProjectTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.RegistryTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.ChangeApplierTest'`
- INVALID FILTER: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.ProjectServiceTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.ProjectServiceDocumentTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.WorkspaceContextContractsTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.compilerengine.CompilationServiceImplTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.compilerengine.CompilationPipelineTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.TestDidChangeWatchedFiles'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.lspgateway.WorkspaceManagerFacadeImplTest'`
- PASS: `./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.observability.TraceLogSinkTest'`
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/TestWorkspaceManager-current-20260428123052.metrics ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.TestWorkspaceManager'`
  - Output: `build/codex-workspace-test-logs/TestWorkspaceManager-current-20260428123052.log`
  - Elapsed time: 25.49s
  - Peak RSS: 103022592 bytes
  - Baseline: `feat14` no-cache run 28.73s, peak RSS 106774528 bytes
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/workspace-wildcard-current-20260428123150.metrics ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.*'`
  - Output: `build/codex-workspace-test-logs/workspace-wildcard-current-20260428123150.log`
  - Elapsed time: 53.82s
  - Peak RSS: 108789760 bytes
  - Note: `feat14` wildcard selects 40 tests; target branch wildcard selects 545 tests, so elapsed time is not comparable by suite size.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/BalaSchemeReferencesTest-after-bala-20260428-152301.time ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.references.BalaSchemeReferencesTest'`
  - Output: `build/codex-workspace-test-logs/BalaSchemeReferencesTest-after-bala-20260428-152301.log`
  - Baseline: `feat14` scoped run passed in 42.65s with 105480192-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/workspace-diagnostics-signature-change-after-dependent-refresh-20260428-160634.metrics ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.diagnostics.WorkspaceDiagnosticsTest.testWorkspaceDiagnosticsAfterFunctionSignatureChange'`
  - Output: `build/codex-workspace-test-logs/workspace-diagnostics-signature-change-after-dependent-refresh-20260428-160634.log`
  - Elapsed time: 5.41s
  - Peak RSS: 108724224 bytes
  - Baseline: `feat14` scoped run passed in 23.62s with 108740608-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/UriResolverTest-after-remove-fix-20260428-161104.metrics ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.workspacemanager.UriResolverTest'`
  - Output: `build/codex-workspace-test-logs/UriResolverTest-after-remove-fix-20260428-161104.log`
  - Elapsed time: 23.33s
  - Peak RSS: 106872832 bytes
  - Note: Gradle passed; the test agent wrapper reported nonzero only because it used zsh reserved variable `status` after the run.
  - Baseline: `feat14` does not contain this test class.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/CompilationServiceImplTest-after-dependent-refresh-20260428-161245.metrics ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.workspace.compilerengine.CompilationServiceImplTest'`
  - Output: `build/codex-workspace-test-logs/CompilationServiceImplTest-after-dependent-refresh-20260428-161245.log`
  - Elapsed time: 25.71s
  - Peak RSS: 107118592 bytes
  - Baseline: `feat14` does not contain this test class.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/WorkspaceDiagnosticsTest-after-dependent-refresh-20260428-161403.metrics ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.diagnostics.WorkspaceDiagnosticsTest'`
  - Output: `build/codex-workspace-test-logs/WorkspaceDiagnosticsTest-after-dependent-refresh-20260428-161403.log`
  - Elapsed time: 24.13s
  - Peak RSS: 106217472 bytes
  - Baseline: `feat14` scoped class run passed in 29.06s with 124157952-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/langserver-core-test-20260428-181245.time ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.exprscheme.TestExpressionFileScheme'`
  - Output: `build/codex-workspace-test-logs/langserver-core-test-20260428-181245.log`
  - Elapsed time: 28.65s
  - Peak RSS: 106758144 bytes
  - Baseline: `feat14` scoped class run passed in 37.88s with 104759296-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/hover-provider-test-20260428-182115.time.txt ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.hover.HoverProviderTest'`
  - Output: `build/codex-workspace-test-logs/hover-provider-test-20260428-182115.log`
  - Elapsed time: 31.51s
  - Peak RSS: 106201088 bytes
  - Baseline: `feat14` scoped class run passed in 52.54s with 106070016-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/cyclic-dependencies-test-20260428-184838.time ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.diagnostics.CyclicDependenciesTest'`
  - Output: `build/codex-workspace-test-logs/cyclic-dependencies-test-20260428-184838.log`
  - Elapsed time: 24.95s
  - Peak RSS: 105562112 bytes
  - Baseline: `feat14` contains the test class file, but the scoped filter reports no tests found.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260428-183709-FieldAccessExpressionContextTest.time ./gradlew :langserver-core:test --tests 'org.ballerinalang.langserver.completion.FieldAccessExpressionContextTest'`
  - Output: `build/codex-workspace-test-logs/20260428-183709-FieldAccessExpressionContextTest.log`
  - Elapsed time: 41.36s
  - Peak RSS: 106020864 bytes
  - Baseline: `feat14` scoped class run passed in 74.11s with 108019712-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/langserver-core-test-20260428-185041.time ./gradlew :langserver-core:test`
  - Output: `build/codex-workspace-test-logs/langserver-core-test-20260428-185041.log`
  - Tests: 3477, failures: 0, skipped: 0
  - Elapsed time: 255.08s
  - Peak RSS: 104988672 bytes
  - Baseline: `feat14` full module passed in 436.40s with 115474432-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/semantic-diff-computer-test-after-create-doc-clean-20260428-213555.time.log ./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test --tests 'io.ballerina.copilotagent.extension.SemanticDiffComputerTest'`
  - Output: `build/codex-workspace-test-logs/semantic-diff-computer-test-after-create-doc-clean-20260428-213555.stdout.log`
  - Elapsed time: 17.43s
  - Peak RSS: 106643456 bytes
  - Baseline: `feat14` focused class run passed in 5.33s with 108347392-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-140725-architecture-model-generator-ls-extension-test-after-close-quiet.time ./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260516-140725-architecture-model-generator-ls-extension-test-after-close-quiet.log`
  - Tests: 51, failures: 0, skipped: 0
  - Elapsed time: 58.65s
  - Peak RSS: 111820800 bytes
  - Baseline: `feat14` full module failed only 4 stale icon-version cases in 89.23s with 108544000-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-145044-architecture-model-generator-ls-extension-test-final.time ./gradlew architecture-model-generator:architecture-model-generator-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260516-145044-architecture-model-generator-ls-extension-test-final.log`
  - Elapsed time: 67.33s
  - Peak RSS: 107773952 bytes
  - Log grep: no `Failed to describe project`, `NoSuchElementException`, or `OutOfMemory`; contains `BUILD SUCCESSFUL`.
  - Baseline: `feat14` full module failed only 4 stale icon-version cases in 89.23s with 108544000-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-145422-bal-shell-service-test.time ./gradlew bal-shell-service:test`
  - Output: `build/codex-workspace-test-logs/20260516-145422-bal-shell-service-test.log`
  - Tests: 38, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 41.27s
  - Peak RSS: 110411776 bytes
  - Baseline: `feat14` full module passed in 66.40s with 105922560-byte RSS; target is faster with comparable memory.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-145831-edi-service-ls-extension-test.time ./gradlew edi-service:edi-service-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260516-145831-edi-service-ls-extension-test.log`
  - Exit status: 0
  - Tests: 0, failures: 0, skipped: 0
  - Elapsed time: 6.06s
  - Peak RSS: 110313472 bytes
  - Baseline: `feat14` full module passed in 9.42s with 111050752-byte RSS; target is faster with slightly lower memory.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-150213-flow-model-central-client-test.time ./gradlew flow-model-generator:flow-model-central-client:test`
  - Output: `build/codex-workspace-test-logs/20260516-150213-flow-model-central-client-test.log`
  - Exit status: 0
  - Tests: no test classes; Gradle reported `:flow-model-generator:flow-model-central-client:test NO-SOURCE`
  - Elapsed time: 1.32s
  - Peak RSS: 108494848 bytes
  - Baseline: `feat14` full module passed in 1.72s with 106315776-byte RSS; target is faster with comparable memory.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-150636-flow-model-generator-core-test.time ./gradlew flow-model-generator:flow-model-generator-core:test`
  - Output: `build/codex-workspace-test-logs/20260516-150636-flow-model-generator-core-test.log`
  - Exit status: 0
  - Tests: 31, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 5.00s
  - Peak RSS: 110034944 bytes
  - Baseline: `feat14` full module passed in 9.54s with 111050752-byte RSS; target is faster with slightly lower memory.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-170403-flow-model-generator-ls-extension-provider-search-target-after.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.embeddingprovidermanager.EmbeddingProviderSearchTest' --tests 'io.ballerina.flowmodelgenerator.extension.modelprovidermanager.ModelProviderSearchTest' --tests 'io.ballerina.flowmodelgenerator.extension.vectorstoremanager.VectorStoreSearchTest'`
  - Output: `build/codex-workspace-test-logs/20260516-170403-flow-model-generator-ls-extension-provider-search-target-after.log`
  - Exit status: 0
  - Tests: 9, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 14.16s
  - Peak RSS: 110706688 bytes
  - Baseline: `feat14` focused combined command failed the same stale icon-version drift in 55.40s with 110346240-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-172026-flow-model-generator-ls-extension-ExpressionEditorDiagnosticsTest-target-after.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorDiagnosticsTest'`
  - Output: `build/codex-workspace-test-logs/20260516-172026-flow-model-generator-ls-extension-ExpressionEditorDiagnosticsTest-target-after.log`
  - Exit status: 0
  - Tests: 75, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 137.49s
  - Peak RSS: 109707264 bytes
  - Baseline: `feat14` focused class passed in 97.01s with 107741184-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-172624-flow-model-generator-ls-extension-DataMappingCompletionTest-target-before.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.DataMappingCompletionTest'`
  - Output: `build/codex-workspace-test-logs/20260516-172624-flow-model-generator-ls-extension-DataMappingCompletionTest-target-before.log`
  - Exit status: 0
  - Tests: 3, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 14.67s
  - Peak RSS: 110657536 bytes
  - Baseline: `feat14` focused class passed in 13.10s with 109182976-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-173621-flow-model-generator-ls-extension-GetModelsTest-target-after.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.agentsmanager.GetModelsTest'`
  - Output: `build/codex-workspace-test-logs/20260516-173621-flow-model-generator-ls-extension-GetModelsTest-target-after.log`
  - Exit status: 0
  - Tests: 1, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 9.47s
  - Peak RSS: 110624768 bytes
  - Baseline: `feat14` focused class passed in 9.81s with 111116288-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-174336-flow-model-generator-ls-extension-FlowModelDiagnosticsTest-target-after.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.FlowModelDiagnosticsTest'`
  - Output: `build/codex-workspace-test-logs/20260516-174336-flow-model-generator-ls-extension-FlowModelDiagnosticsTest-target-after.log`
  - Exit status: 0
  - Tests: 22, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 31.52s
  - Peak RSS: 108937216 bytes
  - Baseline: `feat14` focused class failed only stale Kafka 4.6.4 fixture drift in 25.24s with 110919680-byte RSS; target-only `wait_data.json` is absent on `feat14`.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-175027-flow-model-generator-ls-extension-ExpressionEditorSemanticTokensTest-target-after.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorSemanticTokensTest'`
  - Output: `build/codex-workspace-test-logs/20260516-175027-flow-model-generator-ls-extension-ExpressionEditorSemanticTokensTest-target-after.log`
  - Exit status: 0
  - Tests: 36, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 8.64s
  - Peak RSS: 107757568 bytes
  - Baseline: `feat14` focused class passed in 6.74s with 109723648-byte RSS.
- FAIL: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-175404-flow-model-generator-ls-extension-test-final.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260516-175404-flow-model-generator-ls-extension-test-final.log`
  - Exit status: 1
  - Tests: 1839 completed, 6 failed
  - Elapsed time: 923.53s
  - Peak RSS: 109117440 bytes
  - Baseline: `feat14` full module failed 1778 tests completed, 7 failed in 1121.05s with 107429888-byte RSS; baseline failures were recorded as stale dependency/version fixture failures.
  - Next: isolate the first full-run failure cluster in `io.ballerina.flowmodelgenerator.extension.ModelGeneratorTest` for the three workflow config files.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-182209-flow-model-generator-ls-extension-ModelGeneratorTest-workflow-target-after.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ModelGeneratorTest'`
  - Output: `build/codex-workspace-test-logs/20260516-182209-flow-model-generator-ls-extension-ModelGeneratorTest-workflow-target-after.log`
  - Exit status: 0
  - Tests: 177, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 190.45s
  - Peak RSS: 108576768 bytes
  - Baseline: `feat14` focused class failed only one stale fixture in 185.08s with 110870528-byte RSS.
  - Next: isolate `io.ballerina.flowmodelgenerator.extension.ExpressionEditorCompletionTest` for `completions/config/non_existence.json` and `completions/config/proj6.json`.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-183644-flow-model-generator-ls-extension-ExpressionEditorCompletionTest-target-rerun.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorCompletionTest'`
  - Output: `build/codex-workspace-test-logs/20260516-183644-flow-model-generator-ls-extension-ExpressionEditorCompletionTest-target-rerun.log`
  - Exit status: 0
  - Tests: 26, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 75.82s
  - Peak RSS: 107642880 bytes
  - Baseline: `feat14` focused class passed in 39.34s with 110755840-byte RSS.
  - Note: the first target class run failed only `testMultipleRequests`; `completions/config/non_existence.json` and `completions/config/proj6.json` passed. A single-method probe also passed and was removed before the accepted rerun.
  - Next: rerun full `flow-model-generator:flow-model-generator-ls-extension:test`.
- FAIL: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-184142-flow-model-generator-ls-extension-test-final-rerun.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260516-184142-flow-model-generator-ls-extension-test-final-rerun.log`
  - Exit status: 1
  - Tests: 1839 completed, 1 failed
  - Elapsed time: 923.73s
  - Peak RSS: 107347968 bytes
  - Baseline: `feat14` full module failed 1778 tests completed, 7 failed in 1121.05s with 107429888-byte RSS; baseline failures were recorded as stale dependency/version fixture failures.
  - Failure: `io.ballerina.flowmodelgenerator.extension.DataMappingCompletionTest.test[2](proj3.json)`; XML reports expected 65 completions and actual 0.
  - Next: isolate `DataMappingCompletionTest` / `data_mapper_completions/config/proj3.json` as the next smallest remaining cluster.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-worker-datamapping-completion-focused.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.DataMappingCompletionTest'`
  - Output: `build/codex-workspace-test-logs/20260516-worker-datamapping-completion-focused.log`
  - Exit status: 0
  - Tests: 3, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 23.07s
  - Peak RSS: 117391360 bytes
  - Baseline: existing `feat14` focused baseline reused; passed in 13.10s with 109182976-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-worker-datamapping-block-through-completion-rerun.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --rerun-tasks --tests ...DataMappingTypesTest ... --tests 'io.ballerina.flowmodelgenerator.extension.DataMappingCompletionTest'`
  - Output: `build/codex-workspace-test-logs/20260516-worker-datamapping-block-through-completion-rerun.log`
  - Exit status: 0
  - Elapsed time: 164.82s
  - Peak RSS: 111050752 bytes
  - Note: forced data-mapping block through completion reproduced heap-pressure log noise but did not reproduce the zero-completion failure.
- FAIL: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260516-worker-flow-model-generator-ls-extension-full-rerun-forced.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --rerun-tasks`
  - Output: `build/codex-workspace-test-logs/20260516-worker-flow-model-generator-ls-extension-full-rerun-forced.log`
  - Exit status: 1
  - Tests: 1839 completed, 2 failed
  - Elapsed time: 960.93s
  - Peak RSS: 111181824 bytes
  - Failures: `ExpressionEditorCompletionTest.test[14](proj12.json)` and `DataMappingCompletionTest.test[2](proj3.json)`.
  - Root signal: repeated `ballerina:http:2.16.2` compiler-plugin initialization failure with `ctxData is null` before zero-completion assertions.
  - Baseline: existing `feat14` full module baseline reused; exit 1, stale fixture failures only, 1121.05s / 107429888-byte RSS.
- FAIL: experimental forced full-module runs with close-wait, JVM-wide CE permit, and shared `Package.getCompilation()` lock all still logged the same `ctxData is null` compiler-plugin failure; experiments were reverted and no source change was accepted in this worker.
  - Logs: `20260516-worker-flow-model-generator-ls-extension-full-after-close-wait.log`, `20260516-worker-flow-model-generator-ls-extension-full-after-global-permit.log`, `20260516-worker-flow-model-generator-ls-extension-full-after-global-compilation-lock.log`.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-model-generator-shared-compilation-guard.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ModelGeneratorTest' --rerun-tasks`
  - Output: `build/codex-workspace-test-logs/20260517-model-generator-shared-compilation-guard.log`
  - Exit status: 0
  - Tests: 177, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 207.05s
  - Peak RSS: 111820800 bytes
  - Grep: no `ctxData is null`, `CompilerPluginManager`, or `Mismatched completions count` matches.
  - Baseline: existing `feat14` focused `ModelGeneratorTest` baseline reused; it failed only one stale fixture in
    185.08s with 110870528-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-completion-classes-shared-compilation-guard.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --tests 'io.ballerina.flowmodelgenerator.extension.ExpressionEditorCompletionTest' --tests 'io.ballerina.flowmodelgenerator.extension.DataMappingCompletionTest' --rerun-tasks`
  - Output: `build/codex-workspace-test-logs/20260517-completion-classes-shared-compilation-guard.log`
  - Exit status: 0
  - Tests: `ExpressionEditorCompletionTest` 26/0/0/0 and `DataMappingCompletionTest` 3/0/0/0.
  - Elapsed time: 75.67s
  - Peak RSS: 111394816 bytes
  - Grep: no `ctxData is null`, `CompilerPluginManager`, or `Mismatched completions count` matches.
  - Baseline: new combined `feat14` baseline passed in 56.84s with 107118592-byte RSS.
- FAIL: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-flow-model-generator-ls-extension-full-shared-compilation-guard.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --rerun-tasks`
  - Output: `build/codex-workspace-test-logs/20260517-flow-model-generator-ls-extension-full-shared-compilation-guard.log`
  - Exit status: 1
  - Tests: 1839 completed, 1 failed
  - Elapsed time: 954.30s
  - Peak RSS: 109920256 bytes
  - Grep: no `ctxData is null` or `CompilerPluginManager` matches; one `Mismatched completions count` remains.
  - Failure: `DataMappingCompletionTest.test[2](proj3.json)` with `Expected: 65, Found: 0`.
  - Baseline: existing `feat14` full module baseline reused; exit 1 due to stale dependency/version fixture failures,
    1121.05s / 107429888-byte RSS.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-flow-model-generator-ls-extension-full-after-scoped-project-load.time ./gradlew flow-model-generator:flow-model-generator-ls-extension:test --rerun-tasks`
  - Output: `build/codex-workspace-test-logs/20260517-flow-model-generator-ls-extension-full-after-scoped-project-load.log`
  - Exit status: 0
  - Tests: 1839, failures: 0, errors: 0, skipped: 0
  - Elapsed time: 949.50s
  - Peak RSS: 111706112 bytes
  - Grep: no `ctxData is null`, `CompilerPluginManager`, `NoSuchElementException`, or `Mismatched completions count`.
  - Baseline: existing `feat14` full module baseline failed only stale dependency/version fixture cases in 1121.05s with
    107429888-byte RSS; target is faster with comparable memory.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-045143-langserver-commons-test.time ./gradlew langserver-commons:test`
  - Output: `build/codex-workspace-test-logs/20260517-045143-langserver-commons-test.log`
  - Exit status: 0
  - Tests: no `TEST-*.xml` reports generated
  - Elapsed time: 1.82s
  - Peak RSS: 109445120 bytes
  - Baseline: `feat14` passed in 1.72s with 111312896-byte RSS and no XML reports; target memory is slightly lower
    and elapsed time is comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-045551-langserver-stdlib-test.time ./gradlew langserver-stdlib:test`
  - Output: `build/codex-workspace-test-logs/20260517-045551-langserver-stdlib-test.log`
  - Exit status: 0
  - Tests: task reported `NO-SOURCE`; no `TEST-*.xml` reports generated
  - Elapsed time: 1.71s
  - Peak RSS: 109199360 bytes
  - Baseline: `feat14` passed as `NO-SOURCE` in 1.38s with 111362048-byte RSS and no XML reports; target memory is
    lower and elapsed time is comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-050013-model-generator-commons-test.time ./gradlew model-generator-commons:test`
  - Output: `build/codex-workspace-test-logs/20260517-050013-model-generator-commons-test.log`
  - Exit status: 0
  - Tests: task reported `NO-SOURCE`; no `TEST-*.xml` reports generated
  - Elapsed time: 1.52s
  - Peak RSS: 111099904 bytes
  - Baseline: `feat14` passed as `NO-SOURCE` in 1.63s with 109854720-byte RSS and no XML reports; target time and
    memory are comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-050438-openapi-service-ls-extension-test.time ./gradlew openapi-service:openapi-service-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260517-050438-openapi-service-ls-extension-test.log`
  - Exit status: 0
  - Tests: task reported `NO-SOURCE`; no `TEST-*.xml` reports generated
  - Elapsed time: 6.64s
  - Peak RSS: 111017984 bytes
  - Baseline: `feat14` passed as `NO-SOURCE` in 6.67s with 108953600-byte RSS and no XML reports; target time and
    memory are comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-053806-sequence-model-generator-core-test.time ./gradlew sequence-model-generator:sequence-model-generator-core:test`
  - Output: `build/codex-workspace-test-logs/20260517-053806-sequence-model-generator-core-test.log`
  - Exit status: 0
  - Tests: task reported `NO-SOURCE`; no `TEST-*.xml` reports generated
  - Elapsed time: 1.25s
  - Peak RSS: 111230976 bytes
  - Baseline: `feat14` passed as `NO-SOURCE` in 1.94s with 108036096-byte RSS and no XML reports; target time and
    memory are comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-054318-sequence-model-generator-ls-extension-test.time ./gradlew sequence-model-generator:sequence-model-generator-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260517-054318-sequence-model-generator-ls-extension-test.log`
  - Exit status: 0
  - Tests: XML reports record 18 tests, 0 failures, 0 errors, 0 skipped
  - Elapsed time: 15.25s
  - Peak RSS: 110034944 bytes
  - Baseline: `feat14` passed 18 tests in 16.57s with 108871680-byte RSS; target time and memory are comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-055041-service-model-generator-ls-extension-test.time ./gradlew service-model-generator:service-model-generator-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260517-055041-service-model-generator-ls-extension-test.log`
  - Exit status: 0
  - Tests: XML reports record 207 tests, 0 failures, 0 errors, 0 skipped
  - Elapsed time: 82.58s
  - Peak RSS: 106921984 bytes
  - Baseline: `feat14` passed 202 tests in 138.22s with 108511232-byte RSS; target time is faster and memory is
    slightly lower.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-055638-service-model-index-generator-test.time ./gradlew service-model-generator:service-model-index-generator:test`
  - Output: `build/codex-workspace-test-logs/20260517-055638-service-model-index-generator-test.log`
  - Exit status: 0
  - Tests: task reported `NO-SOURCE`; no `TEST-*.xml` reports generated
  - Elapsed time: 1.46s
  - Peak RSS: 111869952 bytes
  - Baseline: `feat14` passed as `NO-SOURCE` in 3.16s with 108412928-byte RSS and no XML reports; target time is
    faster and memory is comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-060340-test-manager-service-ls-extension-test.time ./gradlew test-manager-service:test-manager-service-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260517-060340-test-manager-service-ls-extension-test.log`
  - Exit status: 0
  - Note: exact command succeeded from Gradle build cache after `cleanTest`; timing was 4.16s / 110395392-byte RSS and
    is not used as the fresh execution comparison.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-060612-test-manager-service-ls-extension-test-no-build-cache-rerun.time ./gradlew test-manager-service:test-manager-service-ls-extension:test --no-build-cache`
  - Output: `build/codex-workspace-test-logs/20260517-060612-test-manager-service-ls-extension-test-no-build-cache-rerun.log`
  - Exit status: 0
  - Tests: XML reports record 9 tests, 0 failures, 0 errors, 0 skipped
  - Elapsed time: 8.67s
  - Peak RSS: 110657536 bytes
  - Baseline: `feat14` passed the exact command with 9 tests, 0 failures/errors/skips in 10.36s / 107610112-byte RSS;
    target time is faster and memory is comparable.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-061243-wsdl-service-ls-extension-test.time ./gradlew wsdl-service:wsdl-service-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260517-061243-wsdl-service-ls-extension-test.log`
  - Exit status: 0
  - Tests: XML reports record 1 test, 0 failures, 0 errors, 0 skipped
  - Elapsed time: 9.11s
  - Peak RSS: 108101632 bytes
  - Baseline: `feat14` passed 1 test in 10.69s with 108429312-byte RSS; target time is faster and memory is slightly
    lower.
- PASS: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-061635-xsd-service-ls-extension-test.time ./gradlew xsd-service:xsd-service-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260517-061635-xsd-service-ls-extension-test.log`
  - Exit status: 0
  - Tests: no `TEST-*.xml` reports generated
  - Elapsed time: 6.28s
  - Peak RSS: 110804992 bytes
  - Baseline: `feat14` passed with no XML reports in 6.83s with 108920832-byte RSS; target time is faster and memory
    remains comparable.

## Blocked Target-Branch Commands

- FAIL: `/usr/bin/time -l -o build/codex-workspace-test-logs/20260517-052053-persist-service-ls-extension-test.time ./gradlew persist-service:persist-service-ls-extension:test`
  - Output: `build/codex-workspace-test-logs/20260517-052053-persist-service-ls-extension-test.log`
  - Exit status: 1
  - Tests: Gradle failed before the `test` task; no `TEST-*.xml` reports generated
  - Elapsed time: 331.10s
  - Peak RSS: 108789760 bytes
  - Failure: `:persist-service:persist-service-ls-extension:waitForServices` timed out after 300 seconds; MySQL and
    PostgreSQL became healthy, but MSSQL stayed `starting` and then `unhealthy`.
  - Baseline: new `feat14` baseline failed the same service-health gate in 723.38s with 111198208-byte RSS.
  - Classification: local Docker architecture blocker. Direct compose evidence in
    `build/codex-workspace-test-logs/20260517-053203-mssql-logs-after-failure.log` shows SQL Server 2019 segfaulting
    under QEMU on an `arm64` Docker server while the image is pinned to `linux/amd64`; no repo change was made.

## Atomic Commit Plan

### Commit 1: Stabilize compiler snapshots and trace logs

Files:
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/compilerengine/CompilationActionImpl.java`
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/compilerengine/CompilationServiceImpl.java`
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/observability/FileTraceLogSink.java`
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/workspacemanager/change/ChangeBuffer.java`
- `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/compilerengine/CompilationPipelineTest.java`
- `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/WorkspaceContextContractsTest.java` (compilation-service contract hunks)

Rationale: keeps compiler-engine snapshot versioning, cancellation handling, path normalization, trace-log uniqueness, and their contract/test updates together.

Suggested message:

```text
Stabilize workspace compiler snapshots

Ensure compilation requests advance beyond the latest stable snapshot
version, treat interrupted compilation as cancellation, normalize
document paths consistently, and avoid trace log filename collisions.
```

### Commit 2: Repair workspace project updates

Files:
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/workspacemanager/ProjectService.java`
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/workspacemanager/ProjectServiceImpl.java`
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/workspacemanager/change/ChangeApplier.java`
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/workspacemanager/uri/UriResolver.java`
- `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/WorkspaceContextContractsTest.java` (project-service contract hunks)
- Fixture deletions under `langserver-core/src/test/resources/project/`

Rationale: groups the non-loading cached-project API, watcher routing, single-file URI indexing, mock-safe change application, and fixture cleanup needed for workspace project consistency.

Suggested message:

```text
Repair workspace project updates

Add a cached-project lookup, refresh projects for watcher changes,
index single-file documents by their own URI, and remove generated
fixture artifacts that caused project-kind misclassification.
```

### Commit 3: Restore legacy workspace run behavior

Files:
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/execution/WorkspaceRunService.java`
- `langserver-core/src/main/java/org/ballerinalang/langserver/workspace/lspgateway/WorkspaceManagerFacadeImpl.java`
- `langserver-core/src/test/java/org/ballerinalang/langserver/workspace/lspgateway/WorkspaceManagerFacadeImplTest.java`

Rationale: isolates legacy run/stop behavior behind a service and updates facade tests for current syntax, semantic, watcher, project, and run behavior.

Suggested message:

```text
Restore legacy workspace run behavior

Run projects through the current package compilation and generated
backend classpath, stop process trees by source root, and keep facade
tests aligned with current project reads.
```

### Local State: do not include in product commits

Files:
- `INSTRUCTIONS.md`
- `MEMORY.md`
- `PERF_METHOD.md`
- `WORKSPACE_BASELINE.md`
- `WORKSPACE_FINDINGS.md`
- `WORKSPACE_PLAN.md`
- `memory/`
- `init-jfr.gradle`
- `langserver-core/recording.jfr`

Rationale: these are orchestration artifacts and measurement notes for this local repair loop unless the maintainer explicitly wants them versioned.
