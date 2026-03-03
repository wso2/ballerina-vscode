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
import { CopilotEventHandler } from '../../utils/events';
import { RunningServicesManager, waitForExit, killProcessGroup } from './running-service-manager';
import { BALLERINA_RUN_TOOL_NAME } from './ballerina-run';

export const BALLERINA_STOP_TOOL_NAME = "stopBallerinaService";

const BallerinaStopInputSchema = z.object({
    taskId: z.string().describe(`The taskId returned by ${BALLERINA_RUN_TOOL_NAME}.`),
});

export function createBallerinaStopTool(
    runningServices: RunningServicesManager,
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Stops a running Ballerina service or program by disposing its terminal.

**Usage:** Pass the \`taskId\` from \`${BALLERINA_RUN_TOOL_NAME}\` to stop the service and close its terminal.
`,
        inputSchema: BallerinaStopInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: BALLERINA_STOP_TOOL_NAME,
                toolCallId,
            });

            const result = await stopService(input, runningServices);

            eventHandler({
                type: "tool_result",
                toolName: BALLERINA_STOP_TOOL_NAME,
                toolCallId,
                toolOutput: { status: result.status },
            });

            return result;
        }
    });
}

async function stopService(
    input: z.infer<typeof BallerinaStopInputSchema>,
    runningServices: RunningServicesManager
): Promise<Record<string, unknown>> {
    const service = runningServices.get(input.taskId);
    if (!service) {
        return {
            status: "not_found",
            message: `No running service with taskId '${input.taskId}'.`,
        };
    }

    if (service.exited) {
        service.terminal.dispose();
        runningServices.remove(input.taskId);
        return {
            status: "already_exited",
            exitCode: service.exitCode,
            message: `Service had already exited with code ${service.exitCode}.`,
        };
    }

    if (!service.process.killed) {
        killProcessGroup(service.process, 'SIGTERM');
    }

    await waitForExit(service.process);

    service.terminal.dispose();
    runningServices.remove(input.taskId);

    return {
        status: "stopped",
        message: "Service stopped and terminal closed.",
    };
}
