// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

/**
 * Returns the comprehensive enhancement prompt for the wizard-level AI enhancement step.
 * This prompt covers all four enhancement stages, fidelity checks, multi-package workspaces,
 * missing source strategies, inter-package references, test refinement, and documentation.
 *
 * Use this for the main wizard enhancement flow.
 */
export function getWizardEnhancementPrompt(): string {
    return `You are enhancing a Ballerina project that was automatically migrated from MuleSoft (Mule 3 or Mule 4) by a
static code migration tool. The tool produced a structurally valid Ballerina package (or workspace with multiple
packages) but left \`// TODO\` and \`// FIXME\` comments where it could not fully translate a construct, and may
have introduced compilation errors. Your goal is to make every package fully functional and diagnostic-free.

> **Tests are not executed during this enhancement phase.** Stage 3 produces well-structured, correctly-typed,
> and logically complete test files — but test execution and pass/fail validation is handled in a separate
> subsequent prompt. Do not attempt to run tests or report test results here.

**Apply your combined knowledge of both MuleSoft and Ballerina throughout this task.** Understanding MuleSoft
concepts (flows, sub-flows, connectors, DataWeave, MEL, error handling strategies, MUnit) is just as important
as knowing Ballerina idioms. Use that dual expertise to bridge any gaps the static tool left behind.

---

## Ballerina Coding Guidelines

When writing Ballerina code, follow these idiomatic conventions — meaning code that is natural and conventional
for the language, not a literal transliteration of Mule patterns:
- Use \`check\` expressions for error propagation rather than explicit \`if err is error\` checks.
- Use \`match\` and \`if\`/\`else\` over flag variables.
- Prefer typed Ballerina \`record\` types over \`map<json>\` where the shape is known.
- Use \`isolated\` functions where possible for concurrency safety.
- Prefer expression-bodied functions (\`=> expr\`) for pure data transformations.
- Use \`configurable\` for all externalised configuration — never hardcode values that came from Mule property
  files.
- Maximum line length: 120 characters.

---

## Multi-Project Workspace: Enhance One Package at a Time

If this is a Ballerina workspace containing multiple packages (each corresponding to one original Mule
project), **process one package at a time** through all four stages before moving to the next. After
completing each package, report progress clearly, for example:

> ✅ Package 2 of 10 complete: \`order-service\`.

While enhancing a package you may **read** other packages in the workspace for context (e.g. to resolve
cross-package function signatures or type definitions), but **only modify** another package if a compilation
stub must be created to unblock the current one. Document any such stubs clearly so they are picked up when
that package is processed in its own turn.

After all packages are complete, produce a **workspace-level summary** at the workspace root as described in
the Enhancement Documentation section below.

---

## Project Structure Awareness

### Default BI file structure (no \`--keep-structure\` flag)
By default, the migration tool reclassifies all constructs from the parsed Mule XML files into a standard
Ballerina Integration (BI) file layout within a single package:

| File | Contents |
|---|---|
| \`main.bal\` | HTTP/scheduler listeners, services, class definitions, uncategorised module-level variables |
| \`functions.bal\` | Regular (block-body) functions generated from Mule flows and sub-flows |
| \`data_mappings.bal\` | Expression-bodied functions generated from DataWeave transforms |
| \`automations.bal\` | The \`main\` function, if present (e.g. from scheduled or batch flows) |
| \`types.bal\` | All Ballerina \`type\` definitions |
| \`configs.bal\` | \`configurable\` variables extracted from Mule property/YAML files |
| \`connections.bal\` | Connector client/connection initialisation variables |
| \`internal_types.bal\` | Shared internal type definitions generated from the Mule flow context (do not delete; extend if needed) |
| \`todo.bal\` | Constructs the tool could not map — review and migrate manually |

### \`--keep-structure\` mode
When \`--keep-structure\` is used, each Mule XML config file is converted into a separate \`.bal\` file named after
the XML file, preserving the original project layout rather than following the BI standard layout above.

### Single vs. multi-project
- A single Mule project → one Ballerina package with its own \`Ballerina.toml\` and \`Config.toml\`.
- Multiple Mule projects migrated together → a Ballerina workspace: a root \`Ballerina.toml\` with a \`[workspace]\`
  section listing each package subdirectory.

### Config.toml
\`Config.toml\` contains configurable values extracted from Mule \`.properties\` and \`.yaml\` files. Variable names
are sanitised to valid Ballerina identifiers: dots and hyphens are replaced with underscores. Every \`configurable\`
variable declared in a source file must have a corresponding entry in \`Config.toml\`.

---

## Original Source Context

The original Mule project directory is available alongside the migrated Ballerina project.
**Always consult the original source files before implementing any TODO/FIXME or fixing any gap.**

Key original artifacts:
- **Mule XML configurations** — \`src/main/mule/*.xml\` (Mule 4) or \`src/main/app/*.xml\` (Mule 3): flows,
  sub-flows, error handlers, connectors, and routers. In \`--keep-structure\` mode each XML maps to one \`.bal\`
  file; in default BI mode constructs are spread across the BI files above.
- **DataWeave transforms** — inline \`<ee:transform>\` / \`<dw:transform-message>\` blocks in XML, or \`.dwl\` files
  under \`src/main/resources/\`: these map to expression-bodied functions in \`data_mappings.bal\` (or \`functions.bal\`
  if they have a block body).
- **Property/YAML files** — \`src/main/resources/*.properties\` and \`*.yaml\`: source of \`Config.toml\` entries.
- **MUnit test files** — \`src/test/munit/*.xml\`: source of the Ballerina test files in \`tests/\`.
- **\`pom.xml\`** — connector dependencies that indicate which \`ballerinax/\` modules should be imported.

### Fidelity check: migrated project vs. original source
The static migration tool may have silently dropped or partially converted constructs — this is especially
common with DataWeave transforms that failed to parse. **Before starting Stage 1, perform a fidelity check:**

1. For each Mule XML file, identify every significant construct: flows, sub-flows, \`<ee:transform>\` /
   \`<dw:transform-message>\` blocks, choice routers, error handlers, connectors, and flow references.
2. Locate the corresponding code in the migrated Ballerina package (using the BI file table above as a guide).
3. If a construct is **absent or clearly incomplete** in the Ballerina output (e.g. a DataWeave block that
   produced no function, or a flow whose body is empty), treat it exactly like a \`// TODO\` — implement it from
   the original source before proceeding.
4. Pay particular attention to \`data_mappings.bal\`: if a DataWeave transform exists in the original source but
   has no corresponding function in the Ballerina project, translate it manually following the DataWeave →
   Ballerina mapping rules in Stage 1.

### Handling missing or partial original source
The original Mule source may be incomplete — shared utility projects, common libraries, or individual XML files
may be absent. When the original source cannot be found, follow this strategy to still produce diagnostic-free
code:

1. **Identify the gap**: Note which Mule component is missing (e.g. a logging utility class, a shared library
   flow, a custom transformer).
2. **Implement what can be inferred**: Use the surrounding Ballerina code, the comment text, and your MuleSoft
   knowledge to produce the closest reasonable Ballerina equivalent. The implementation must be
   **syntactically and type-correct** so it does not introduce new compilation errors. For example:
   - A missing Mule logging utility → implement using \`ballerina/log\` with the log levels and message
     patterns visible in the surrounding context.
   - A missing custom transformer with a known input/output type → implement a pass-through or best-effort
     transformation that type-checks correctly, with a scoped comment explaining what is approximated.
   - A missing shared flow whose return type is unknown → declare a local helper function returning \`anydata\`
     (or the narrowest type that satisfies all call sites), so the caller compiles without errors.
3. **Leave a scoped comment**: Replace the original \`// TODO\` / \`// FIXME\` with a precise note, for example:
   \`\`\`ballerina
   // TODO: Original Mule utility 'com.example:logging-util' was not found in the source.
   //       Best-effort conversion using ballerina/log. Verify when the utility source becomes available.
   log:printInfo("Processing started", orderId = ctx.variables["orderId"]);
   \`\`\`
4. **The code must compile**: The best-effort implementation must introduce zero new diagnostics. If a type
   cannot be inferred at all, use \`anydata\` or an anonymous record \`record {| anydata...; |}\` as a last resort
   rather than leaving an unresolved symbol.
5. **Never leave an empty stub**: An empty function body or a bare \`// TODO\` with no implementation is not
   acceptable. Always provide runnable code alongside the explanatory comment.

---

## Stage 1 — Fidelity Check + Resolve TODO/FIXME Comments in Source Files

First, complete the **fidelity check** described in the "Original Source Context" section above to catch any
constructs that were silently dropped by the static tool.

Then scan every \`.bal\` file **excluding the \`tests/\` directory** for \`// TODO\` and \`// FIXME\` comments.

For each comment:
1. Read the surrounding Ballerina code to understand the structural context (which flow, which connector
   operation, which transform, which BI file it lives in).
2. Locate the corresponding construct in the original Mule XML or DataWeave source to understand the exact
   intended behaviour. If the original source is missing, follow the "Handling missing or partial original
   source" guidelines above.
3. Implement with correct, idiomatic Ballerina code:
   - **HTTP/REST connectors**: use \`ballerina/http\` client/listener with correct resource paths, methods,
     headers, and query parameters as defined in the original Mule HTTP requester/listener config.
   - **Database operations**: use the appropriate \`ballerinax/\` database connector (\`mysql\`, \`postgresql\`,
     \`mssql\`, etc.) matching the original Mule DB connector config.
   - **Message transformations**: translate DataWeave logic to Ballerina, preferring expression-bodied
     functions in \`data_mappings.bal\`. Use \`map\`, \`filter\`, record destructuring, and \`lang.value\` functions.
   - **Error handling**: map \`on-error-propagate\` → \`on fail\` / \`check\`; map \`on-error-continue\` → \`do\` with
     explicit error handling that does not re-throw.
   - **Scatter-gather / parallel-for-each**: use Ballerina \`fork\`/\`worker\` constructs or \`future\` types.
   - **Choice routers**: use \`if\`/\`else\` or \`match\` statements.
   - **Flow references**: ensure the Ballerina function call matches the target function's signature and
     return type. For cross-package references see the inter-package section below.
   - **Logging**: use \`ballerina/log\` (\`log:printInfo\`, \`log:printError\`, \`log:printDebug\`). Map Mule log
     levels to their Ballerina equivalents.
4. After implementing, ensure all required imports are added at the top of the file.

---

## Stage 2 — Achieve Zero Compilation Diagnostics

Run the diagnostics tool to identify all compilation errors across the package.
Address errors systematically:
- **Missing imports**: Add the correct \`import\` statement. Prefer \`ballerina/\` stdlib and \`ballerinax/\`
  connectors.
- **Type mismatches**: Align types with declarations in \`internal_types.bal\` and connector return types.
  Use \`check\` for error unions.
- **Undefined symbols**: Check whether the symbol should come from another file in the same package, or
  whether a function/type was not migrated and needs to be created. If the original source for that symbol
  is missing, apply the missing-source strategy (implement a best-effort, type-correct version) — do not
  leave an unresolved symbol that blocks compilation.
- **Incompatible function signatures**: Match parameter types and return types. Pay attention to
  \`returns error?\` vs \`returns SomeType|error\`.
- **Config.toml mismatches**: Ensure every \`configurable\` variable in source has a matching key in
  \`Config.toml\` with a compatible type (\`string\`, \`int\`, \`boolean\`).
- **Cross-package references**: See the inter-package section below.
- **Errors rooted in missing/erroneous original source**: If a diagnostic cannot be fixed by consulting the
  original source (because the source itself was broken or absent), apply the minimum change that makes the
  code compile: widen a type to \`anydata\`, replace an unresolvable expression with a typed placeholder, or
  extract a helper function with a compatible signature. Always accompany such changes with a scoped comment
  explaining the approximation.

Re-run diagnostics after each batch of fixes.
**Do not proceed to Stage 3 until zero error-level diagnostics remain.**

---

## Inter-Package References in a Ballerina Workspace

When multiple Mule projects are migrated into a Ballerina workspace, flows that called across projects are
converted into cross-package function calls. The static tool already resolves these by:
- Adding an \`import <org>/<package>\` statement to the calling file.
- Prefixing the call with the package name: \`packageName:functionName(ctx)\`.

When resolving TODOs/FIXMEs or fixing errors involving cross-package calls:
1. Verify the \`import\` statement is present and the package name matches the target package's \`Ballerina.toml\`
   \`name\` field.
2. Verify the called function is \`public\` in the target package.
3. If the target function does not exist yet (because that Mule project has not been enhanced yet), create a
   minimal compilable stub in the target package — typed correctly based on the call site — with a scoped
   comment marking it for completion when that package is processed:
   \`\`\`ballerina
   // TODO: Stub created to unblock 'order-service'. Replace with full implementation
   //       when 'payment-service' is enhanced.
   public function processPayment(Context ctx) returns error? {
   }
   \`\`\`
4. Ensure the workspace root \`Ballerina.toml\` lists all packages under \`[workspace]\` so they resolve correctly.

---

## Stage 3 — Refine and Validate Test Files

> **Why this is a separate stage:** By this point the source files have been fully enhanced. Stage 3 uses
> the *enhanced* Ballerina implementation as the source of truth for what the code actually does, and
> cross-references it against the original MUnit tests to verify behavioural equivalence. The goal is to
> produce test files that are complete, correctly typed, and structurally ready to run — **not** to execute
> them (that is handled in a separate subsequent step).

### Preparation: build a behaviour map
Before touching any test file, construct a mental map of the package by reading both sides:
- **Enhanced Ballerina source** (\`functions.bal\`, \`data_mappings.bal\`, \`main.bal\`, etc.): understand the
  actual function signatures, return types, error paths, and data shapes that exist after enhancement.
- **Original MUnit XML files** (\`src/test/munit/*.xml\`): for each MUnit test, identify:
  - The flow under test and the mock event / payload it sets up (\`<munit:set-event>\`, \`<mock:when>\`).
  - The assertions it makes (\`<munit:assert-that>\`, \`<munit-tools:assert-equals>\`, etc.).
  - Any mock configurations (\`<mock:spy>\`, \`<mock:when>\`) that replace connectors or sub-flows.

### For each test file in \`tests/\`:
1. **Align with the enhanced implementation**: Read the corresponding Ballerina source functions that the test
   exercises. Verify that the test is calling the correct function with the correct signature as it exists
   after Stage 1/2 enhancement — update call sites if signatures changed.
2. **Align with MUnit intent**: Cross-reference each test function against the MUnit XML to confirm it is
   testing the same scenario. If the MUnit test mocked a connector, the Ballerina test should mock the
   equivalent \`ballerinax/\` client using \`@test:Mock\`. If the MUnit test asserted on a transformed payload,
   the Ballerina test should assert on the equivalent record or JSON value.
3. **Resolve all \`// TODO\` and \`// FIXME\` comments** with correct test logic. Apply missing-source guidelines
   if the MUnit file is absent — in that case, write tests that exercise the enhanced Ballerina functions
   directly based on their visible behaviour.
4. **Ensure meaningful assertions**: Every \`@test:Config\` annotated function must have at least one
   substantive assertion (\`test:assertEquals\`, \`test:assertTrue\`, \`test:assertFail\`, etc.). Empty stubs or
   trivially-true checks (\`test:assertTrue(true)\`) are not acceptable.
5. **Check for dropped test coverage**: If a MUnit test exists in the original source but has no counterpart
   in the Ballerina \`tests/\` directory, create the missing test function.
6. **Mock connectors and external services**: Use \`@test:Mock\` to stub \`http:Client\`, database clients, and
   any other connector that would make tests depend on live infrastructure.
7. **Wire setup/teardown correctly**: Verify functions annotated with \`@test:BeforeSuite\`, \`@test:AfterSuite\`,
   \`@test:BeforeEach\`, \`@test:AfterEach\` are present where needed and correctly annotated.
8. **Ensure test files are compilation-error free**: Run the diagnostics tool including the \`tests/\`
   directory and fix any errors. Test files must compile cleanly even though they are not executed here.
9. **Do not delete or comment out existing test cases.**

---

## Enhancement Documentation

### Per-package: \`ENHANCEMENT_SUMMARY.md\`
After completing all four stages for a package, create (or overwrite) a file named \`ENHANCEMENT_SUMMARY.md\`
in the root of that package directory. It must contain the following sections:

\`\`\`markdown
# Enhancement Summary — <package-name>

## Overview
<One-paragraph description of what this package does, inferred from the Mule source and the enhanced code.>

## Changes Made

### Fidelity Fixes
List every construct that was silently dropped or partially converted by the static tool and was completed
during the fidelity check. For each item include: construct type, original Mule file, and what was added.

### TODO / FIXME Resolutions
List every \`// TODO\` and \`// FIXME\` that was resolved. For each item include:
- File and line (approximate)
- Original comment text
- What was implemented

### Best-Effort Approximations
List every place where the original Mule source was missing or erroneous and a best-effort implementation
was produced. For each item include:
- What was missing (component name / file)
- What approximation was used
- What the developer should verify when the original source becomes available

### Compilation Fixes
List every diagnostic that was fixed in Stage 2 that was not already covered above. For each item include:
- File, error description, and resolution applied.

### Test Changes
Summarise what was done in Stage 3:
- Tests updated to match the enhanced implementation.
- New test functions added (with the MUnit scenario each covers).
- Mocks added or updated.
- Any MUnit scenarios that could not be covered and why.

## Remaining Scoped TODOs
List all \`// TODO\` comments that remain in the package after enhancement (i.e. best-effort notes, not
unimplemented stubs). For each: file, approximate line, and a brief description of what still needs
human review.

## Compilation Status
State: **✅ Zero diagnostics** or list any warnings that are acceptable to leave.

## Test Readiness
State: **✅ Test files compile and are structurally complete** or note any test files that still have
unresolved gaps, with justification. Test execution results will be validated in a separate step.
\`\`\`

### Workspace-level: \`ENHANCEMENT_SUMMARY.md\` at workspace root
After all packages in a workspace have been enhanced, create (or overwrite) \`ENHANCEMENT_SUMMARY.md\` in the
workspace root directory. It must contain:

\`\`\`markdown
# Enhancement Summary — Workspace

## Packages Enhanced

| Package | Diagnostics | Test Files Ready | Remaining TODOs | Notes |
|---|---|---|---|---|
| \`order-service\` | ✅ 0 | ✅ Compile-clean | 2 best-effort | Missing logging util |
| \`payment-service\` | ✅ 0 | ✅ Compile-clean | 0 | — |
| ... | | | | |

## Cross-Package Stubs Created
List every stub that was written in one package to unblock another, with the package it lives in, the
package it unblocks, and the function/type involved. These stubs must be replaced when the target package
is enhanced.

## Overall Remaining Work
Summarise anything across the entire workspace that still requires human review: missing source components,
approximated logic, skipped tests, and any known behavioural differences from the original Mule system.
\`\`\`

---

## Stage 4 — Final Validation

Before declaring the current package complete, verify all of the following:

- **Source files**: Zero \`// TODO\` and \`// FIXME\` comments remain, **or** every remaining comment is a
  scoped best-effort note (following the missing-source format above) — never an unimplemented stub or an
  unresolved symbol.
- **Diagnostics**: Zero error-level compilation diagnostics in all source files (excluding \`tests/\`).
- **Config.toml**: Has entries for all \`configurable\` variables used in the package.
- **Test files**: All test files are compilation-error free. Every MUnit scenario from the original source
  is represented by at least one Ballerina test function. No empty stubs remain. Test execution is out of
  scope for this phase.
- **Documentation**: \`ENHANCEMENT_SUMMARY.md\` has been written in the package root with all sections
  completed.
- **Cross-package stubs**: Any stubs written in other packages to unblock this one are listed in this
  package's \`ENHANCEMENT_SUMMARY.md\` and marked for completion when those packages are processed.
- **Workspace** *(multi-package only)*: Once all packages are complete, the workspace-level
  \`ENHANCEMENT_SUMMARY.md\` is written at the workspace root.

Work methodically through each stage in order. Do not declare a package complete until all checklist items
above are satisfied.`;
}

/**
 * Returns a lightweight enhancement prompt for demo or quick validation scenarios.
 * This prompt is NOT used in the main wizard flow, but can be used for lightweight demos.
 */
export function getLightweightEnhancementPrompt(): string {
  return `You are enhancing a Ballerina project that was automatically migrated from a legacy integration platform.

Perform the following quick improvements:

1. **Add WSO2 license headers** – For every \`.bal\` file that does NOT already have a license header at the top, prepend the standard Apache 2.0 / WSO2 license comment block.
2. **Run diagnostics** – Use the diagnostics tool to check for compilation errors. If there are any obvious one-line fixes (e.g. missing imports, unused variables), fix them. Do NOT attempt large refactors.

Stop once license headers have been added and trivial diagnostics are resolved.`;
}
