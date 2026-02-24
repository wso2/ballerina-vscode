// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

import { tool } from 'ai';
import { z } from 'zod';
import child_process from 'child_process';
import { CopilotEventHandler } from '../../utils/events';
import { extension } from '../../../../BalExtensionContext';
import { quoteShellPath } from '../../../../utils/config';
import { DIAGNOSTICS_TOOL_NAME } from './diagnostics';

export const TEST_RUNNER_TOOL_NAME = "runTests";

export interface TestRunResult {
    output: string;
}

const TestRunnerInputSchema = z.object({});

/**
 * Creates the test runner tool for the AI agent.
 *
 * Executes `bal test` in the temp project directory and returns the full output
 * so the agent can diagnose failures and fix them before completing a task.
 *
 * @param tempProjectPath - Path to the temporary project directory (agent's working dir)
 * @param eventHandler - Event handler to emit tool execution events to the visualizer
 * @returns Tool instance for running the Ballerina test suite
 */
export function createTestRunnerTool(
    tempProjectPath: string,
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Runs \`bal test\` in the current Ballerina project and returns the raw output.

**Prerequisites:** The project must compile cleanly. Always run \`${DIAGNOSTICS_TOOL_NAME}\` first and resolve all compilation errors before invoking this tool — tests cannot run on code that does not compile.

**REQUIRED before calling this tool:** You MUST tell the user what is being tested (e.g. which functions or scenarios the test cases cover). Do NOT invoke this tool without first informing the user.

**When to use:**
- After compilation is clean and the project contains test cases
- After modifying existing code, to confirm tests still pass
- After writing new test cases, to validate them

**Output:** Returns the full raw \`bal test\` output. Read the output carefully to identify which tests passed or failed, then fix any failures before marking the task as complete.
`,
        inputSchema: TestRunnerInputSchema,
        execute: async (_input: Record<string, never>, context?: { toolCallId?: string }): Promise<TestRunResult> => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: TEST_RUNNER_TOOL_NAME,
                toolCallId,
            });

            const result = await runBallerinaTests(tempProjectPath);

            eventHandler({
                type: "tool_result",
                toolName: TEST_RUNNER_TOOL_NAME,
                toolCallId,
                toolOutput: { summary: parseTestSummary(result.output) }
            });

            return result;
        }
    });
}

function parseTestSummary(output: string): string {
    const passingMatch = output.match(/(\d+)\s+passing/);
    const failingMatch = output.match(/(\d+)\s+failing/);
    if (passingMatch) {
        const passing = parseInt(passingMatch[1]);
        const failing = failingMatch ? parseInt(failingMatch[1]) : 0;
        const total = passing + failing;
        return `Tests completed: ${passing}/${total} passing`;
    }
    return "Tests completed";
}

/**
 * Executes `bal test` in the given directory and parses the output.
 */
async function runBallerinaTests(cwd: string): Promise<TestRunResult> {
    return new Promise((resolve) => {
        const balCmd = extension.ballerinaExtInstance.getBallerinaCmd();
        const command = `${quoteShellPath(balCmd)} test`;

        console.log(`[TestRunner] Running: ${command} in ${cwd}`);

        child_process.exec(command, { cwd }, (err, stdout, stderr) => {
            const output = [stdout, stderr].filter(Boolean).join('\n').trim();

            console.log(`[TestRunner] Completed. Exit code: ${err?.code ?? 0}`);
            resolve({ output });
        });
    });
}
