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

export const HURL_TOOL_NAME = "hurlRunnerTool";
const HURL_LM_TOOL_NAME = "run-hurl-test";
const TOOL_DESCRIPTION = `The hurl script to execute. Hurl is a command-line tool and DSL for running HTTP requests defined in a simple text format. The script can contain one or more HTTP requests, along with optional assertions to validate the responses. You can capture values from previous requests and use them in subsequent requests. 

Example Hurl script:
GET http://api.example.com/users
HTTP 200

[Captures]
userId: jsonpath("$.id")

POST http://api.example.com/posts
Content-Type: application/json

{
    "userId": "{{userId}}",
    "title": "New Post",
    "content": "This post belongs to the user captured from the previous request"
}
HTTP 201

When defining a request body in Hurl, you must follow strict syntax rules. For simple bodies (e.g., JSON), you can write them directly after a blank line. However, for complex or multi-line raw bodies (such as multipart/form-data, raw HTTP payloads, or content containing special characters), you MUST wrap the entire body inside triple backticks (\`\`\`).

This ensures the Hurl parser treats the content as a literal body instead of interpreting lines as new requests or syntax elements. Failing to do this will result in parsing errors (e.g., "invalid HTTP method").

Example (standard JSON body):
POST http://example.com/api
Content-Type: application/json

{
  "name": "test"
}

Example (raw multipart body using triple backticks):
POST http://example.com/upload
Content-Type: multipart/form-data; boundary=----Boundary123

\`\`\`
------Boundary123
Content-Disposition: form-data; name="file"; filename="test.txt"
Content-Type: text/plain

hello world
------Boundary123--
\`\`\`

Use triple backticks whenever the body spans multiple structured lines or includes boundary markers, binary-like content, or custom formatting.

Avoid using unnecessary newlines in the hurl script, as they can lead to parsing issues.
`;
function prepareHurlScript(input: HURLInput): string {
	// Attaching the test scenario as a comment at the top of the Hurl script
	return "# @collectionName "+input.testScenario+"\n"+input.hurlScript;
}

export const HURLInputSchema = z.object({
    hurlScript: z.string().describe(TOOL_DESCRIPTION),
    testScenario: z.string().max(30).describe("A short description of the test scenario being executed. This is used for logging and reporting purposes to provide context about the Hurl script execution.")
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
        summary: {
            totalEntries: number;
            passedEntries: number;
            failedEntries: number;
        };
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


export function createHurlTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `A tool to execute Hurl scripts. The input is a Hurl script as a string. The output includes the execution results, including request details, response details, assertion results, and any warnings. Use this tool to try out endpoints, or to execute HTTP test scenarios.`,
        inputSchema: HURLInputSchema,
        execute: async (input): Promise<HurlToolOutput> => await executeHurlRequest(input, eventHandler)
    });
}

export const executeHurlRequest = async (input: HURLInput, eventHandler: CopilotEventHandler, context?: { toolCallId?: string }): Promise<HurlToolOutput> => {
	const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
    const hurlScript = prepareHurlScript(input);
    try {
		eventHandler({
            type: "tool_call",
            toolName: HURL_TOOL_NAME,
            toolInput: { hurlScript: input.hurlScript, scenario: input.testScenario },
            toolCallId
        });
		const lmToolResult = await vscode.lm.invokeTool(HURL_LM_TOOL_NAME, { input: { hurlScript }, toolInvocationToken: undefined });
        const resultTextPart = (lmToolResult.content[0] as vscode.LanguageModelTextPart);
        const response: HurlToolOutput = JSON.parse(resultTextPart.value);
		const toolOutput = { hurlScript: input.hurlScript, scenario: input.testScenario, runResult: response };
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
				summary: {
					totalEntries: 0,
					passedEntries: 0,
					failedEntries: 0
				},
				entries: [],
				warnings: [`Failed to execute Hurl script. Error: ${error instanceof Error ? error.message : String(error)}`]
			}
        };
        const toolOutput = { hurlScript: input.hurlScript, scenario: input.testScenario, runResult: genericErrorOutput };
        eventHandler({
            type: "tool_result",
            toolName: HURL_TOOL_NAME,
            toolOutput: toolOutput,
            toolCallId
        });
        return genericErrorOutput;
    }
};
