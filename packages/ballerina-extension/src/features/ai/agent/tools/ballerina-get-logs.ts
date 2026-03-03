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
import { RunningServicesManager } from './running-service-manager';
import { BALLERINA_RUN_TOOL_NAME } from './ballerina-run';

export const BALLERINA_GET_LOGS_TOOL_NAME = "getServiceLogs";

const BallerinaGetLogsInputSchema = z.object({
    taskId: z.string().describe(`The taskId returned by ${BALLERINA_RUN_TOOL_NAME}.`),
    waitTime: z.number().optional().describe("Seconds to wait before reading logs, allowing the service to produce output. Default: 2."),
});

export function createBallerinaGetLogsTool(
    runningServices: RunningServicesManager,
    eventHandler: CopilotEventHandler
) {
    return tool({
        description: `Retrieves new log output from a running Ballerina service or program.

**Usage:** After starting a service with \`${BALLERINA_RUN_TOOL_NAME}\`, use this tool with the returned \`taskId\` to read its output. Each call returns only **new** output since the last call.
`,
        inputSchema: BallerinaGetLogsInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: BALLERINA_GET_LOGS_TOOL_NAME,
                toolCallId,
            });

            const result = await getLogs(input, runningServices);

            eventHandler({
                type: "tool_result",
                toolName: BALLERINA_GET_LOGS_TOOL_NAME,
                toolCallId,
                toolOutput: { status: result.status },
            });

            return result;
        }
    });
}

async function getLogs(
    input: z.infer<typeof BallerinaGetLogsInputSchema>,
    runningServices: RunningServicesManager
): Promise<Record<string, unknown>> {
    const service = runningServices.get(input.taskId);
    if (!service) {
        return {
            status: "not_found",
            message: `No running service with taskId '${input.taskId}'. Use ${BALLERINA_RUN_TOOL_NAME} first.`,
        };
    }

    const waitTime = (input.waitTime ?? 2) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const newLogs = service.logs.slice(service.logCursor).join('');
    service.logCursor = service.logs.length;

    if (service.exited) {
        return {
            status: "exited",
            exitCode: service.exitCode,
            logs: newLogs,
            message: `Service has exited with code ${service.exitCode}.`,
        };
    }

    if (newLogs.length === 0) {
        return {
            status: "running",
            logs: "",
            message: "No new output since last check.",
        };
    }

    return {
        status: "running",
        logs: newLogs,
        message: `${newLogs.split('\n').length} new log lines.`,
    };
}
