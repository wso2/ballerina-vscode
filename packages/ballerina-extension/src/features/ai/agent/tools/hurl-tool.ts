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
import * as vscode from 'vscode';
import { CopilotEventHandler } from '../../utils/events';
import { runningServicesManager } from './running-service-manager';
import { solveRelativeTempPath } from '../utils';

export const HURL_TOOL_NAME = "hurlRunnerTool";
const HURL_LM_TOOL_NAME = "run-hurl-test";
const TOOL_DESCRIPTION = `The hurl script to execute. Hurl is a command-line tool for running HTTP requests written in a simple text format. A script can contain one or more requests.
Example Script:
GET http://example.com/api/resource
Accept: application/json

POST http://example.com/api
Content-Type: application/json

{
  "name": "try-it"
}

When defining a request body in Hurl, you must follow strict syntax rules. For simple bodies (e.g., JSON), you can write them directly after a blank line. However, for complex or multi-line raw bodies (such as multipart/form-data, raw HTTP payloads, or content containing special characters), you MUST wrap the entire body inside triple backticks (\`\`\`).
Failing to do this will result in parsing errors (e.g., "invalid HTTP method").

Example (raw multipart body using triple backticks):
POST http://example.com/upload
Content-Type: multipart/form-data; boundary=----Boundary123

\`\`\`
------Boundary123
Content-Disposition: form-data; name="file"; filename="sample.txt"
Content-Type: text/plain

hello world
------Boundary123--
\`\`\`

Use triple backticks whenever the body spans multiple structured lines or includes boundary markers, binary-like content, or custom formatting.

Avoid using unnecessary newlines in the hurl script, as they can lead to parsing issues.
`;

export const HURLInputSchema = z.object({
    hurlScript: z.string().describe(TOOL_DESCRIPTION),
    tryItScenario: z.string().max(30).describe("A short description of the try-it scenario being executed. This is used for logging and reporting purposes to provide context about the Hurl script execution.")
});

export type HURLInput = z.infer<typeof HURLInputSchema>;

type HurlToolOutput = {
    input: {
        requests: Array<{
            name: string;
            method: string;
            url: string;
            headers: Array<{ key: string; value: string }>;
            queryParameters: Array<{ key: string; value: string }>;
            body?: string;
            assertions?: string[];
        }>;
    };
    output: {
        status: string;
        durationMs: number;
        entries: Array<{
            name: string;
            method?: string;
            url?: string;
            statusCode?: number;
            responseHeaders?: Array<{ name: string; value: string }>;
            responseBody?: string;
            status: string;
            durationMs?: number;
            assertions: Array<{
                expression: string;
                status: string;
                expected?: string;
                actual?: string;
                message?: string;
            }>;
            errorMessage?: string;
        }>;
        warnings: string[];
    };
};

type RawHurlToolOutput = HurlToolOutput & {
    output: HurlToolOutput["output"] & {
        summary?: {
            totalEntries: number;
            passedEntries: number;
            failedEntries: number;
        };
    };
};

function removeSummaryFromHurlOutput(response: RawHurlToolOutput): HurlToolOutput {
    const { summary: _summary, ...outputWithoutSummary } = response.output;
    return {
        ...response,
        output: outputWithoutSummary
    };
}


export function createHurlTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `A tool to execute Hurl scripts. The input is a Hurl script as a string. The output includes the execution results, including response details. Use this tool to try out HTTP endpoints. Prefer requests without assertions for simple try-it scenarios ( without including status code assertions such as HTTP 200 or other types of assertions)`,
        inputSchema: HURLInputSchema,
        execute: async (input): Promise<HurlToolOutput> => await executeHurlRequest(input, eventHandler)
    });
}

export const executeHurlRequest = async (input: HURLInput, eventHandler: CopilotEventHandler, context?: { toolCallId?: string }): Promise<HurlToolOutput> => {
	const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
    const hurlScript = input.hurlScript;
    try {
		eventHandler({
            type: "tool_call",
            toolName: HURL_TOOL_NAME,
            toolInput: { hurlScript, scenario: input.tryItScenario },
            toolCallId
        });
        const runningServices = runningServicesManager.getAll().filter(service => !service.exited);
        const runningServiceTargets = runningServices.flatMap(service => {
            const target = solveRelativeTempPath(service.packagePath);
            return target ? [{...target, fullPackagePath: service.packagePath}] : [];
        });
		const lmToolResult = await vscode.lm.invokeTool(HURL_LM_TOOL_NAME, { input: { hurlScript }, toolInvocationToken: undefined });
        const resultTextPart = (lmToolResult.content[0] as vscode.LanguageModelTextPart);
        const rawResponse: RawHurlToolOutput = JSON.parse(resultTextPart.value);
        const response = removeSummaryFromHurlOutput(rawResponse);
		const toolOutput = { hurlScript: input.hurlScript, scenario: input.tryItScenario, runResult: response, runningServiceTargets};
		eventHandler({
            type: "tool_result",
            toolName: HURL_TOOL_NAME,
            toolOutput: toolOutput,
            toolCallId
        });
        return response;
    } catch (error) {
        const genericErrorOutput: HurlToolOutput = {
			input:{
				requests: []
			},
			output: {
				status: "error",
				durationMs: 0,
				entries: [],
				warnings: [`Failed to execute Hurl script. Error: ${error instanceof Error ? error.message : String(error)}`]
			}
        };
        const toolOutput = { hurlScript: input.hurlScript, scenario: input.tryItScenario, runResult: genericErrorOutput };
        eventHandler({
            type: "tool_result",
            toolName: HURL_TOOL_NAME,
            toolOutput: toolOutput,
            toolCallId
        });
        return genericErrorOutput;
    }
};
