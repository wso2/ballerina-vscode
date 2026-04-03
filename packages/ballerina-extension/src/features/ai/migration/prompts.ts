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

// ---------------------------------------------------------------------------
// Enhancement stage definitions
// ---------------------------------------------------------------------------

/** Describes a single stage of the multi-stage migration enhancement. */
export interface EnhancementStage {
    /** Human-readable name shown in progress messages. */
    name: string;
    /** The prompt text the agent receives for this stage. */
    prompt: string;
    /** Per-stage agent limits (overrides the default). */
    agentLimits: { maxSteps: number; maxOutputTokens: number };
}

/**
 * Returns the ordered list of enhancement stages.
 * The orchestrator runs each stage sequentially, giving each stage a **fresh
 * context window** so the agent never runs out of context mid-work.
 */
export function getEnhancementStages(): EnhancementStage[] {
    const shared = getSharedEnhancementContext();
    return [
        {
            name: "Stage 1 — Fidelity Check & TODO Resolution",
            prompt: shared + "\n\n" + getStage1Prompt(),
            agentLimits: { maxSteps: 200, maxOutputTokens: 16384 },
        },
        {
            name: "Stage 2 — Zero Compilation Diagnostics",
            prompt: shared + "\n\n" + getStage2Prompt(),
            agentLimits: { maxSteps: 100, maxOutputTokens: 16384 },
        },
        {
            name: "Stage 3 — Test Refinement",
            prompt: shared + "\n\n" + getStage3Prompt(),
            agentLimits: { maxSteps: 100, maxOutputTokens: 16384 },
        },
        {
            name: "Stage 4 — Final Validation & Documentation",
            prompt: shared + "\n\n" + getStage4Prompt(),
            agentLimits: { maxSteps: 50, maxOutputTokens: 16384 },
        },
    ];
}

// ---------------------------------------------------------------------------
// Per-project enhancement stages (for multi-package workspaces)
// ---------------------------------------------------------------------------

/**
 * Returns enhancement stages scoped to a single package inside a
 * multi-package workspace.  The shared context is augmented with a
 * per-package preamble so the agent knows:
 *
 * 1. Which package it is currently enhancing.
 * 2. Where the package sits within the overall workspace.
 * 3. A light-weight cross-package manifest (names + public symbols)
 *    so it can write correct `import` statements.
 *
 * @param packageName   Display name of the package (from Ballerina.toml).
 * @param packagePath   Relative path of the package from the workspace root.
 * @param packageIndex  Zero-based position in the ordered package list.
 * @param totalPackages Total number of packages in the workspace.
 * @param crossPackageManifest  Markdown snippet listing peer packages and symbols.
 */
export function getPerProjectEnhancementStages(
    packageName: string,
    packagePath: string,
    packageIndex: number,
    totalPackages: number,
    crossPackageManifest: string,
): EnhancementStage[] {
    const preamble = getPerProjectPreamble(
        packageName, packagePath, packageIndex, totalPackages, crossPackageManifest,
    );
    const shared = preamble + "\n\n" + getSharedEnhancementContext();
    return [
        {
            name: `[${packageName}] Stage 1 — Fidelity Check & TODO Resolution`,
            prompt: shared + "\n\n" + getStage1Prompt(),
            agentLimits: { maxSteps: 200, maxOutputTokens: 16384 },
        },
        {
            name: `[${packageName}] Stage 2 — Zero Compilation Diagnostics`,
            prompt: shared + "\n\n" + getStage2Prompt(),
            agentLimits: { maxSteps: 100, maxOutputTokens: 16384 },
        },
        {
            name: `[${packageName}] Stage 3 — Test Refinement`,
            prompt: shared + "\n\n" + getStage3Prompt(),
            agentLimits: { maxSteps: 100, maxOutputTokens: 16384 },
        },
        {
            name: `[${packageName}] Stage 4 — Final Validation & Documentation`,
            prompt: shared + "\n\n" + getStage4Prompt(),
            agentLimits: { maxSteps: 50, maxOutputTokens: 16384 },
        },
    ];
}

/**
 * Builds a preamble injected before the shared context for per-project runs.
 */
function getPerProjectPreamble(
    packageName: string,
    packagePath: string,
    packageIndex: number,
    totalPackages: number,
    crossPackageManifest: string,
): string {
    return `## Per-Package Enhancement Context

You are enhancing **package ${packageIndex + 1} of ${totalPackages}**: \`${packageName}\` (path: \`${packagePath}/\`).

**Scope rules:**
- Only modify files inside this package (\`${packagePath}/\`).
- Do NOT modify files in other packages.${crossPackageManifest}

---`;
}

// ---------------------------------------------------------------------------
// Shared context — included at the top of every stage prompt
// ---------------------------------------------------------------------------

function getSharedEnhancementContext(): string {
    return `You are enhancing a Ballerina project that was automatically migrated from an external integration
platform (e.g. MuleSoft Mule 3/4, TIBCO BusinessWorks, or similar) by a static code migration tool. The tool
produced a structurally valid Ballerina package (or workspace with multiple packages) but left \`// TODO\` and
\`// FIXME\` comments where it could not fully translate a construct, and may have introduced compilation errors.

**Apply your combined knowledge of the source integration platform and Ballerina throughout this task.**

---

## Critical Rules — Read Before Anything Else

These rules are **non-negotiable**. Violating any of them means the enhancement has failed.

1. **IMPLEMENT, do not document.** Write working Ballerina code. Never produce summaries, roadmaps,
   remaining-work lists, or explanations of what _should_ be done instead of doing it.
   **Do NOT create** \`NEXT_STEPS.md\`, \`README_MIGRATION.md\`, \`ENHANCEMENT_SUMMARY.md\` (unless Stage 4),
   or any guide/roadmap/documentation file.
2. **Never stop early.** "This project is complex", "time constraints", "token limits", "escaping issues"
   are NOT valid reasons to stop. You have ample budget. Keep making \`file_edit\` calls.
3. **Edit files in place — always.** Use \`file_edit\` / \`file_multi_edit\` on existing files.
   **NEVER** create \`*_new.bal\`, \`*_backup.bal\`, \`*_v2.bal\`, or any copy of an existing file.
   If a file is large, break your edits into multiple \`file_edit\` calls targeting different regions.
4. **No stubs or placeholders.** Every TODO must become real, runnable Ballerina logic — not an empty
   function, not a \`return {}\`, not a \`return ""\`, not a \`// placeholder\`. If a DataWeave transform
   is 200 lines, translate all 200 lines.
5. **No empty files.** Never create a file that contains only comments or is empty.
6. **Code over commentary.** Your text output between tool calls should be 1–2 sentences of progress.
   If you are writing more than 3 sentences without a tool call, stop and make an edit instead.
7. **\`file_write\` is ONLY for new files.** Files like \`functions.bal\`, \`data_mappings.bal\`, \`main.bal\`,
   \`configs.bal\`, \`types.bal\` etc. that appear in the initial project source ALREADY EXIST. You must use
   \`file_edit\` / \`file_multi_edit\` to modify them. Use \`file_write\` only when creating a file that has
   no content yet (e.g. an entirely new \`.bal\` file the migration tool did not produce).
8. **Never write a "Summary" or "Remaining Work" section.** Do not output a final summary of completed
   and remaining work. Just keep editing files until every TODO is resolved.

---

## Mandatory Workflow: Process One File at a Time

**This is the most important workflow rule.** Do NOT read all original source files upfront. Instead:

1. Pick one \`.bal\` file that has TODOs/FIXMEs (start with \`main.bal\`, then \`functions.bal\`, then others).
2. For each TODO in that file, read **only** the specific original source file related to that TODO
   (using \`migration_source_read\`). Do not read unrelated source files.
3. Implement the fix using \`file_edit\` / \`file_multi_edit\`.
4. Move to the next TODO in the same file, or the next file.
5. Output a one-line progress note: "Resolved 3/7 TODOs in functions.bal".

**Why:** Reading all source files at once fills your context window before you make any edits, leaving
no room for the actual implementation work. Read just-in-time, edit immediately.

---

## Ballerina Coding Guidelines

- Use \`check\` for error propagation. Use \`match\` / \`if\`/\`else\` over flag variables.
- Prefer typed \`record\` types over \`map<json>\`. Use \`isolated\` functions where possible.
- Prefer expression-bodied functions (\`=> expr\`) for pure data transformations.
- Use \`configurable\` for externalised configuration. Max line length: 120 characters.

---

## File Editing Strategy

| Tool | When to use |
|---|---|
| \`file_read\` | Re-read a file after editing it, or read a file not in the initial message. |
| \`file_edit\` | Replace one text region in an **existing** file (find-and-replace). |
| \`file_multi_edit\` | Multiple find-and-replace edits in the **same existing** file. |
| \`file_write\` | Create a file that does **not yet exist** (zero content). |

---

## Project Structure Awareness

### Default BI file structure
| File | Contents |
|---|---|
| \`main.bal\` | HTTP/scheduler listeners, services, class definitions |
| \`functions.bal\` | Block-body functions from source flows/sub-flows |
| \`data_mappings.bal\` | Expression-bodied functions from DataWeave/XSLT transforms |
| \`automations.bal\` | The \`main\` function (scheduled/batch flows) |
| \`types.bal\` | All \`type\` definitions |
| \`configs.bal\` | \`configurable\` variables |
| \`connections.bal\` | Connector client/connection initialisations |
| \`internal_types.bal\` | Shared internal types |
| \`todo.bal\` | Constructs the tool could not map |

### Config.toml
Every \`configurable\` variable must have a corresponding entry in \`Config.toml\`.

---

## Original Source Context

You have two tools for reading the original source project:
- **\`migration_source_list\`**: List files/directories.
- **\`migration_source_read\`**: Read a specific file.

**Read source files on-demand** — only when you need them for a specific TODO you are about to resolve.
Do NOT read all source files as a first step.

### Handling missing original source
If the source cannot be found:
1. Implement what can be inferred from surrounding code and platform knowledge.
2. Must be syntactically and type-correct.
3. Leave a scoped comment noting the approximation.
4. **Never leave an empty stub.**

---

## Inter-Package References

1. Verify \`import\` statements and \`public\` visibility.
2. Create minimal compilable stubs for missing cross-package functions.
3. Ensure workspace \`Ballerina.toml\` lists all packages.

---

## Multi-Project Workspace

Process one package at a time. Read other packages for context but only modify them for compilation stubs.`;
}

// ---------------------------------------------------------------------------
// Stage 1 — Fidelity Check + Resolve TODO/FIXME Comments
// ---------------------------------------------------------------------------

function getStage1Prompt(): string {
    return `## Your Task — Stage 1: Fidelity Check + Resolve TODO/FIXME Comments

Your sole focus: resolve every TODO/FIXME in source files (excluding \`tests/\`). A later stage handles
diagnostics, tests, and documentation.

> **Do NOT** create any documentation files. **Do NOT** fix compilation errors (Stage 2 does that).
> **Do NOT** create \`functions_new.bal\`, \`data_mappings_new.bal\`, or ANY copy of existing files.

### Workflow — Follow This Exact Order

**Phase A: Quick fidelity scan (≤ 3 tool calls)**
1. Call \`migration_source_list\` on the root directory (\`.\`) to see the source project structure.
2. Compare the listed source files against the Ballerina project files in the initial message.
3. Note any source constructs that have **no** Ballerina counterpart — you will implement them during Phase B.
   **Do NOT read every source file now.** Just note which files exist.

**Phase B: Resolve TODOs file by file**

Process files in this order: \`todo.bal\` → \`main.bal\` → \`functions.bal\` → \`data_mappings.bal\` → other \`.bal\` files.

For each file:
1. Scan the file content (already in the initial message) for \`// TODO\` and \`// FIXME\` comments.
2. For each TODO:
   a. If it references a specific source construct/file, call \`migration_source_read\` to read **only that file**.
   b. Implement the fix immediately using \`file_edit\` or \`file_multi_edit\`.
   c. For \`// TODO: UNSUPPORTED ... BLOCK ENCOUNTERED\` comments: the commented-out source between the
      \`// ---\` lines is the specification. Translate it to Ballerina and remove the entire commented block.
3. After finishing all TODOs in one file, output one line: "✅ \`<filename>\`: resolved N TODOs".
4. Move to the next file.

**Phase C: Fidelity-gap implementation**

Using the notes from Phase A, implement any source constructs that were silently dropped by the migration
tool. Read the specific source file, then add the corresponding Ballerina code to the appropriate \`.bal\` file.

**Phase D: Clean up todo.bal**

If all constructs from \`todo.bal\` have been moved to their correct files, delete \`todo.bal\`.
If some remain, continue implementing them.

### Connector / Construct Mapping Quick Reference

| Source construct | Ballerina equivalent |
|---|---|
| Custom loggers (json-logger, etc.) | \`log:printInfo\` / \`log:printError\` with structured fields |
| Object stores / caches | \`ballerina/cache\` or \`map\` variable |
| Message queues (Anypoint MQ, JMS) | \`ballerinax/rabbitmq\`, \`kafka\`, or \`java.jms\` |
| Batch processors | \`foreach\` with error collection, or \`fork\`/\`worker\` |
| Schedulers | \`ballerina/task\` or \`@schedule\` annotation |
| DataWeave transforms | Expression-bodied Ballerina functions |
| SOAP/XML services | \`ballerina/http\` + \`ballerina/xmldata\` |
| Choice routers | \`if\`/\`else\` or \`match\` |
| Error handling (on-error-propagate) | \`on fail\` / \`check\` |
| Error handling (on-error-continue) | \`do { } on fail { }\` (no re-throw) |
| Scatter-gather | \`fork\`/\`worker\` or \`future\` types |
| Flow references | Ballerina function calls |

### Anti-Patterns — DO NOT DO THESE

The following actions are **failures**. If you catch yourself doing any of them, stop immediately:

❌ Reading 4+ original source files before making your first \`file_edit\` call.
❌ Creating \`functions_new.bal\`, \`data_mappings_new.bal\`, or any "-new" / "-v2" / "_backup" file.
❌ Using \`file_write\` on a file that already has content (\`functions.bal\`, \`main.bal\`, etc.).
❌ Writing a "Summary", "Remaining Work", "Next Steps", or "Recommendation" section.
❌ Saying "Due to complexity..." or "Given the size..." or "time constraints" and stopping.
❌ Creating a function that returns \`{}\`, \`""\`, \`()\`, or \`0\` as a "placeholder".
❌ Writing more than 3 sentences of text between two consecutive tool calls.

If a DataWeave file is 400 lines, you translate all 400 lines. Break the work into multiple
\`file_edit\` calls if needed, each handling a section of the file.

### Completion Criteria

When every TODO/FIXME in source files (excluding \`tests/\`) is resolved, output one line:
"Stage 1 complete: resolved N TODOs across M files. todo.bal: [deleted | N constructs remain]."
Then stop. Do not write anything else.`;
}

// ---------------------------------------------------------------------------
// Stage 2 — Zero Compilation Diagnostics
// ---------------------------------------------------------------------------

function getStage2Prompt(): string {
    return `## Your Task — Stage 2: Achieve Zero Compilation Diagnostics

You are running **Stage 2** of the enhancement pipeline. The previous stage resolved all TODO/FIXME comments.
Your sole focus is achieving **zero error-level compilation diagnostics** across all source files
(excluding \`tests/\`).

> **Do NOT** create \`ENHANCEMENT_SUMMARY.md\` or any documentation files during this stage.
> **Do NOT** work on test files — that is Stage 3.
> Focus entirely on fixing compilation errors.

### Workflow

1. Run the diagnostics tool to get all current compilation errors.
2. Address errors systematically:
   - **Missing imports**: Add the correct \`import\` statement. Prefer \`ballerina/\` stdlib and \`ballerinax/\` connectors.
   - **Type mismatches**: Align types with declarations in \`internal_types.bal\` and connector return types.
     Use \`check\` for error unions.
   - **Undefined symbols**: Check whether the symbol should come from another file in the same package, or
     whether a function/type was not migrated and needs to be created.
   - **Incompatible function signatures**: Match parameter types and return types. Pay attention to
     \`returns error?\` vs \`returns SomeType|error\`.
   - **Config.toml mismatches**: Ensure every \`configurable\` variable has a matching key in \`Config.toml\`.
   - **Cross-package references**: Verify imports, ensure called functions are \`public\`, create stubs if needed.
3. After each batch of fixes, **re-run diagnostics** to verify progress and catch new errors.
4. Repeat until zero error-level diagnostics remain.

### Important Notes

- If a diagnostic cannot be fixed by consulting the original source (because the source itself was broken
  or absent), apply the minimum change that makes the code compile: widen a type to \`anydata\`, extract a
  helper function with a compatible signature, etc. Always add a scoped comment explaining the approximation.
- You may use \`migration_source_read\` if you need to check original source for context while fixing errors.
- If the previous stage left any unresolved TODOs that cause compilation errors, fix them now.

### Completion Criteria for Stage 2

When the diagnostics tool reports zero error-level diagnostics for all source files (excluding \`tests/\`):
- Output the final diagnostics count (should be 0 errors).
- List any best-effort approximations you made to fix diagnostics.

Then stop. Stage 3 will handle test files.`;
}

// ---------------------------------------------------------------------------
// Stage 3 — Test Refinement
// ---------------------------------------------------------------------------

function getStage3Prompt(): string {
    return `## Your Task — Stage 3: Refine and Validate Test Files

You are running **Stage 3** of the enhancement pipeline. Stages 1 and 2 have already resolved all TODOs
and achieved zero compilation diagnostics in source files. Your sole focus is making the test files in
\`tests/\` complete, correctly typed, and compilation-error free.

> **Tests are not executed during this stage.** The goal is to produce structurally complete, correctly-typed
> test files. Test execution and pass/fail validation is handled in a separate subsequent step.
> **Do NOT** create \`ENHANCEMENT_SUMMARY.md\` during this stage — that is Stage 4.

### Preparation: Build a Behaviour Map

Before touching any test file:
1. Read the enhanced Ballerina source files (\`functions.bal\`, \`data_mappings.bal\`, \`main.bal\`, etc.) to
   understand actual function signatures, return types, error paths, and data shapes.
2. Use \`migration_source_list\` and \`migration_source_read\` to read original test files (e.g. MUnit XML
   under \`src/test/munit/\`) to understand the original test scenarios.

### For each test file in \`tests/\`:

1. **Align with enhanced implementation**: Verify test calls match current function signatures. Update
   call sites if signatures changed during Stages 1/2.
2. **Align with original test intent**: Cross-reference each test against original test files. If the
   original mocked a connector, mock the equivalent \`ballerinax/\` client using \`@test:Mock\`.
3. **Resolve all \`// TODO\` and \`// FIXME\` comments** with correct test logic.
4. **Ensure meaningful assertions**: Every \`@test:Config\` function must have at least one substantive
   assertion (\`test:assertEquals\`, \`test:assertTrue\`, \`test:assertFail\`, etc.). No trivially-true checks.
5. **Check for dropped test coverage**: If a test exists in the original source but has no counterpart
   in \`tests/\`, create the missing test function.
6. **Mock connectors and external services**: Use \`@test:Mock\` for \`http:Client\`, database clients, etc.
7. **Wire setup/teardown correctly**: \`@test:BeforeSuite\`, \`@test:AfterSuite\`, etc.
8. **Ensure test files compile**: Run the diagnostics tool **including** the \`tests/\` directory and fix errors.
9. **Do not delete or comment out existing test cases.**

### Completion Criteria for Stage 3

When all test files are complete and compilation-error free:
- Output the diagnostics count for test files (should be 0 errors).
- List test functions added or significantly modified.

Then stop. Stage 4 will handle final validation and documentation.`;
}

// ---------------------------------------------------------------------------
// Stage 4 — Final Validation & Documentation
// ---------------------------------------------------------------------------

function getStage4Prompt(): string {
    return `## Your Task — Stage 4: Final Validation & Documentation

You are running the **final stage** of the enhancement pipeline. Stages 1–3 have resolved TODOs, fixed
diagnostics, and refined test files. Your focus is verifying completeness and writing \`ENHANCEMENT_SUMMARY.md\`.

### Validation Checklist

Verify each of the following. If any item fails, **fix it** before writing documentation:

- [ ] **Source files**: Zero unresolved \`// TODO\` and \`// FIXME\` comments remain (or every remaining
      comment is a scoped best-effort note — never an unimplemented stub).
- [ ] **\`todo.bal\`**: Empty or deleted.
- [ ] **UNSUPPORTED BLOCK comments**: Zero \`// TODO: UNSUPPORTED ... BLOCK ENCOUNTERED\` comments remain.
- [ ] **Diagnostics**: Run the diagnostics tool. Zero error-level diagnostics in source files.
- [ ] **Config.toml**: Has entries for all \`configurable\` variables.
- [ ] **Test files**: Run diagnostics including \`tests/\`. All test files compile. Every original test
      scenario has a Ballerina test function. No empty stubs.
- [ ] **Cross-package stubs**: Any stubs written in other packages are noted.

### Write ENHANCEMENT_SUMMARY.md

After the checklist passes, create \`ENHANCEMENT_SUMMARY.md\` in the package root with these sections:

\`\`\`markdown
# Enhancement Summary — <package-name>

## Overview
<One-paragraph description of what this package does.>

## Changes Made

### Fidelity Fixes
List constructs silently dropped by the static tool that were completed during fidelity check.

### TODO / FIXME Resolutions
List every TODO/FIXME resolved: file, original comment, what was implemented.

### Best-Effort Approximations
List places where original source was missing and a best-effort implementation was produced.

### Compilation Fixes
List diagnostics fixed in Stage 2.

### Test Changes
Summarise Stage 3 work: tests updated, added, mocks added, scenarios not covered.

## Remaining Scoped TODOs
List all remaining \`// TODO\` comments (best-effort notes only).

## Compilation Status
**✅ Zero diagnostics** or list acceptable warnings.

## Test Readiness
**✅ Test files compile and are structurally complete** or note gaps.
\`\`\`

### Workspace-Level Summary (multi-package only)

If this is a multi-package workspace and all packages are complete, also create \`ENHANCEMENT_SUMMARY.md\`
at the workspace root:

\`\`\`markdown
# Enhancement Summary — Workspace

## Packages Enhanced
| Package | Diagnostics | Test Files Ready | Remaining TODOs | Notes |
|---|---|---|---|---|

## Cross-Package Stubs Created
List stubs written in one package to unblock another.

## Overall Remaining Work
Summarise anything requiring human review.
\`\`\`

### Completion Criteria for Stage 4

Output the final status: checklist results and confirmation that \`ENHANCEMENT_SUMMARY.md\` was written.`;
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
