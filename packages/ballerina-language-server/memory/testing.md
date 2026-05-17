# Testing Memory

- Never run `./gradlew test`; use `./gradlew :langserver-core:test --tests '<TestClass>'`.
- Work bottom-up: directly affected class first, then related scoped module/test package.
- For each unique target-branch test command, record one `feat14` baseline before accepting the target result.
- After `TestWorkspaceManager` or workspace wildcard runs, check for generated test-resource `target` directories and remove only generated outputs. Do not restore intentionally deleted fixture artifacts that are absent from `feat14`.
- Avoid shell variables named `status` in zsh test wrappers; it is read-only and can make a successful Gradle run look failed after the fact.
- Focused LS-extension failures can come from stale upstream module jars. If a failure disappears after recompiling an upstream module and no source diff remains, record the rebuild evidence before changing behavior.
- When a focused LS-extension class fails but the full-log config cases pass, isolate the failing method and rerun the class before changing behavior; expression-editor tests can expose transient shared-state or scheduling effects.
- Full `flow-model-generator-ls-extension` zero-completion failures can be downstream of an earlier suite-level compiler-plugin initialization failure, especially `ballerina:http` reporting `ctxData is null`; isolate the plugin fault before changing completion fixtures or providers.
- The `ballerina:http` `ctxData is null` plugin fault can appear in focused `ModelGeneratorTest` even when assertions pass, so grep successful logs for the compiler-plugin stack trace before accepting completion/model-generator scope.
- After the shared compiler-compilation guard removes `ctxData is null`, zero-completion failures can still be ordering-sensitive. The expression/config/data-mapping slice reproduces `DataMappingCompletionTest.test[2](proj3.json)`, while the data-mapping-only block passes.
- Do not treat a passing `DataMappingCompletionTest` or passing data-mapping-only block as sufficient coverage for the current completion race; preserve ordered predecessor classes when validating this failure.
- `persist-service:persist-service-ls-extension:test` needs an amd64-capable Docker SQL Server environment locally; on arm64 Docker with the pinned `linux/amd64` MSSQL 2019 image, SQL Server can segfault under QEMU before Java tests run.
- Some LS-extension module commands can restore cached test outputs; when fresh timing or a suspicious pass matters, use the module `cleanTest` task plus `--no-build-cache` before accepting the result.
- Code-action tests should compile expected diagnostics through the same `BallerinaLanguageServer` workspace and server context used for the code-action request. A separate diagnostic workspace can drift from the open-document state and produce order-sensitive empty diagnostics.
- TestNG subclasses should not override a base `@BeforeMethod` with a same-signature `@BeforeClass`. After the first `@AfterMethod`, inherited per-test fields can remain null for the rest of the data-provider rows.
