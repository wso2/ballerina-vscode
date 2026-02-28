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

import * as path from 'path';
import * as crypto from 'crypto';
import { tool } from 'ai';
import { z } from 'zod';
import { CopilotEventHandler } from '../../utils/events';
import { extension } from '../../../../BalExtensionContext';
import { RunningServicesManager, createProcessTerminal } from './running-service-manager';
import { DIAGNOSTICS_TOOL_NAME } from './diagnostics';
import { getRunCommand } from '../../../project/cmds/cmd-runner';

export const BALLERINA_RUN_TOOL_NAME = "runBallerinaPackage";

const BallerinaRunInputSchema = z.object({
    runType: z.enum(["main", "service"]),
    packagePath: z.string().optional().describe("Relative path to the package directory from the project root. Leave empty for the default/root package."),
    timeout: z.number().optional().describe("Timeout in milliseconds for main programs. Default: 120000. Ignored for services."),
});

const DEFAULT_MAIN_TIMEOUT = 120000;

export function createBallerinaRunTool(
    tempProjectPath: string,
    runningServices: RunningServicesManager,
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Runs a Ballerina package using \`bal run\` in a VS Code terminal.

**Prerequisites:** The project must compile cleanly. Always run \`${DIAGNOSTICS_TOOL_NAME}\` first and resolve all compilation errors before invoking this tool.

**Modes:**
- \`service\`: Starts a long-running service. Returns immediately with a \`taskId\`. Use \`getServiceLogs\` to check output and \`stopBallerinaService\` to stop it.
- \`main\`: Runs a main function to completion. Waits for the program to exit and returns its output.

**REQUIRED before calling this tool:** You MUST tell the user what you are about to run and why.
`,
        inputSchema: BallerinaRunInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: BALLERINA_RUN_TOOL_NAME,
                toolCallId,
            });

            const result = await executeRun(input, tempProjectPath, runningServices);

            eventHandler({
                type: "tool_result",
                toolName: BALLERINA_RUN_TOOL_NAME,
                toolCallId,
                toolOutput: { status: result.status },
            });

            return result;
        }
    });
}

async function executeRun(
    input: z.infer<typeof BallerinaRunInputSchema>,
    tempProjectPath: string,
    runningServices: RunningServicesManager
): Promise<Record<string, unknown>> {
    const cwd = input.packagePath
        ? path.resolve(tempProjectPath, input.packagePath)
        : tempProjectPath;

    const balCmd = extension.ballerinaExtInstance.getBallerinaCmd();
    const runCmd = getRunCommand();
    const taskId = crypto.randomUUID();
    const packageName = input.packagePath || path.basename(tempProjectPath);

    const logs: string[] = [];
    const { terminal, process: proc } = createProcessTerminal(
        `Bal: ${packageName}`,
        balCmd,
        [runCmd],
        cwd,
        logs
    );
    terminal.show(true);

    const service = {
        taskId,
        terminal,
        process: proc,
        logs,
        logCursor: 0,
        packagePath: cwd,
        startedAt: Date.now(),
        exited: false,
        exitCode: null as number | null,
    };

    // Track process exit
    proc.on('close', (code) => {
        service.exited = true;
        service.exitCode = code ?? null;
    });

    runningServices.register(service);

    if (input.runType === "service") {
        return {
            status: "started",
            taskId,
            message: "Service started. Use getServiceLogs to check output, stopBallerinaService to stop it.",
        };
    }

    // Main mode: wait for completion
    const timeout = input.timeout ?? DEFAULT_MAIN_TIMEOUT;
    const completionResult = await waitForCompletion(service, timeout);

    runningServices.remove(taskId);

    if (completionResult.timedOut) {
        proc.kill('SIGTERM');
        terminal.dispose();
        return {
            status: "timeout",
            output: completionResult.logs,
            message: `Program did not complete within ${timeout}ms. It may be a long-running service — use runType "service" instead.`,
        };
    }

    return {
        status: service.exitCode === 0 ? "completed" : "error",
        exitCode: service.exitCode,
        output: completionResult.logs,
        message: service.exitCode === 0
            ? "Program completed successfully."
            : "Build or runtime error. Check output for details.",
    };
}

async function waitForCompletion(
    service: { exited: boolean; exitCode: number | null; logs: string[] },
    timeout: number
): Promise<{ logs: string; timedOut: boolean }> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (!service.exited && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    const logs = service.logs.join('');

    if (!service.exited) {
        return { logs, timedOut: true };
    }

    return { logs, timedOut: false };
}
