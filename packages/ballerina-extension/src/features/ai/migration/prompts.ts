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
 * Returns the prompt used in **auto-fix** mode.
 * The agent must walk through all four pipeline stages without user intervention:
 *   1. Fix compilation errors
 *   2. Resolve TODO comments
 *   3. Refine test files
 *   4. Run tests and fix failures
 */
export function getAutoFixPrompt(): string {
    return `You are enhancing a Ballerina project that was automatically migrated from a legacy integration platform (MuleSoft or TIBCO). The migration tool produced a working structural skeleton but left TODO comments and may have compilation errors. Your goal is to make the project fully functional by completing all four stages below. Work through them in order without stopping.

## Original Source Context
The original source project may be available alongside the migrated Ballerina project. When resolving TODO comments or fixing migration gaps, **read the corresponding original source files** (e.g. Mule XML configurations, DataWeave transforms, TIBCO process definitions) to understand the intended behaviour. This context is critical for producing accurate implementations rather than guesses.

## Stage 1 - Fix Compilation Errors
Use the diagnostics tool to inspect the project for compilation errors.
- Resolve every error-level diagnostic. Common issues include missing imports, incorrect type references, incompatible function signatures, and unsupported constructs.
- Repeat the diagnostics check until zero errors remain before proceeding.

## Stage 2 - Resolve TODO Comments
Scan every \`.bal\` source file (excluding the \`tests/\` directory for now) for lines containing \`// TODO\`.
- Read the surrounding code to understand the intent.
- Where a TODO references an original source construct, read the corresponding original source file to understand the exact transformation or logic that was intended.
- Implement each TODO with correct, idiomatic Ballerina code.
- After implementing all TODOs, re-run diagnostics to confirm no new errors were introduced.

## Stage 3 - Refine Test Files
Open all files inside the \`tests/\` directory.
- Review each test function for completeness and correctness.
- Implement any TODO comments found in test files.
- Ensure every test function has meaningful assertions rather than empty stubs.
- Do not delete or comment-out existing test cases.

## Stage 4 - Run Tests and Fix Failures
Use the test-runner tool to execute \`bal test\`.
- Carefully read the output. Identify every FAILED or ERROR test.
- Fix each failing test (either the test itself or the production code it exercises, as appropriate).
- Re-run tests after each fix until all tests pass.

## Completion Criteria
- Zero compilation errors.
- Zero unresolved TODO comments in any \`.bal\` file.
- All test cases pass.

Work methodically through each stage. Do not declare the task complete until all four stages succeed.`;
}
