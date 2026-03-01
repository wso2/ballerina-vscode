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

import { exec } from 'child_process';
import { tool } from 'ai';
import { z } from 'zod';
import { CopilotEventHandler } from '../../utils/events';

export const CURL_TOOL_NAME = "curlRequest";

const CURL_TIMEOUT = 30000;

const CurlInputSchema = z.object({
    command: z.string().describe(
        "The full curl command to execute (e.g., 'curl http://localhost:9090/health'). " +
        "If the string does not start with 'curl', it will be prepended automatically."
    ),
});

export function createCurlTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `Executes a curl command and returns the HTTP response.

Use this tool to make HTTP requests to APIs, check service health, test endpoints, or fetch data.
The command should be a valid curl command string. Common flags: -X (method), -H (header), -d (data), -s (silent), -o (output).`,
        inputSchema: CurlInputSchema,
        execute: async (input, context?: { toolCallId?: string }) => {
            const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;

            eventHandler({
                type: "tool_call",
                toolName: CURL_TOOL_NAME,
                toolCallId,
            });

            const result = await executeCurl(input.command);

            eventHandler({
                type: "tool_result",
                toolName: CURL_TOOL_NAME,
                toolCallId,
                toolOutput: { status: result.status },
            });

            return result;
        }
    });
}

function buildCurlCommand(command: string): string {
    const trimmed = command.trim();
    if (trimmed.toLowerCase().startsWith("curl ")) {
        return trimmed;
    }
    return `curl ${trimmed}`;
}

async function executeCurl(command: string): Promise<Record<string, unknown>> {
    const fullCommand = buildCurlCommand(command);

    return new Promise((resolve) => {
        exec(fullCommand, { timeout: CURL_TIMEOUT }, (error, stdout, stderr) => {
            if (error) {
                if (error.killed) {
                    resolve({
                        status: "timeout",
                        output: stdout || "",
                        message: `Curl command timed out after ${CURL_TIMEOUT / 1000} seconds.`,
                    });
                } else {
                    resolve({
                        status: "error",
                        output: stderr || error.message,
                        message: "Curl command failed. Check output for details.",
                    });
                }
                return;
            }

            resolve({
                status: "completed",
                output: stdout,
                message: "Curl request completed successfully.",
            });
        });
    });
}
