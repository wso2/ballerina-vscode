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

function prepareHurlScript(input: HURLInput): string {
	// Attaching the test scenario as a comment at the top of the Hurl script
	return "# @collectionName "+input.testScenario+"\n"+input.hurlScript;
}

export const HURLInputSchema = z.object({
    hurlScript: z.string().describe("The hurl script to execute. Hurl is a command-line tool and DSL for running HTTP requests defined in a simple text format. The script can contain one or more HTTP requests, along with optional assertions to validate the responses. You can capture values from previous requests and use them in subsequent requests. The tool will execute the script and return the results of each request, including response details and assertion outcomes. You can use #@name comments above requests to give them identifiable names.\n\nExample Hurl script:\n\n#@name login\nPOST http://localhost:8090/login\nContent-Type: application/json\n\n{\n  \"username\": \"DEFAULT\",\n  \"password\": \"1234\"\n}\n\nHTTP 200\n[Asserts]\njsonpath \"$.token\" exists\n\n[Captures]\ntoken: jsonpath \"$.token\"\n\n\n#@name getCity\nGET http://localhost:8090/city/London\nAuthorization: Bearer {{token}}\n\nHTTP 200\n[Asserts]\njsonpath \"$.city\" == \"London\"\njsonpath \"$.weather\" exists\njsonpath \"$.current_time\" exists\n"),
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
        description: `A tool to execute Hurl scripts. The input is a Hurl script as a string. The output includes the execution results, including request details, response details, assertion results, and any warnings.`,
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
