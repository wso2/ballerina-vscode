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
import axios, { AxiosError, AxiosResponse } from 'axios';
import { CopilotEventHandler } from '../../utils/events';

export const CURL_TOOL_NAME = "curlRequest";

const CURL_REQUEST_TIMEOUT_MS = 30_000;


export const HTTPInputSchema = z.object({
    curlCommand: z.string().describe("The curl command to execute, including the URL, method, headers, and body. For example: `curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{\"key\":\"value\"}'`"),
    testScenario: z.string().max(30).optional().describe("An optional identifier (max 30 chars) to group requests belonging to the same test scenario.")
});

export type HTTPInput = z.infer<typeof HTTPInputSchema>;

type HTTPResponse = {
    data: unknown;
    status: number;
    statusText: string;
    headers: Record<string, string>;
};
type HTTPErrorResponse = {
    error: true;
    message: string;
    code?: string;
    response?: HTTPResponse
};

function createSuccessResponse(response: AxiosResponse): HTTPResponse {
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
            headers[key] = value;
        } else if (Array.isArray(value)) {
            headers[key] = value.join(', ');
        }
    }
    return {
        data: response.data,
        status: response.status,
        statusText: response.statusText,
        headers
    };
}

function createErrorResponse(error: AxiosError): HTTPErrorResponse {
    return {
        error: true,
        message: error.message,
        code: error.code,
        response: error.response ? createSuccessResponse(error.response) : undefined
    };
}

export function createCurlTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `A tool to make requests to a given API endpoint. Provide the endpoint URL and request details to get a response. Use this tool for testing and debugging HTTP endpoints.`,
        inputSchema: HTTPInputSchema,
        execute: async (input): Promise<HTTPResponse | HTTPErrorResponse> => await executeCurlRequest(input, eventHandler)
    });
}

/**
 * Parse a curl command string into components
 * Handles quoted strings and various curl options
 */
function parseCurl(curl: string): {
	method: string;
	url: string;
	headers: Record<string, string>;
	data: unknown;
} {
	// Remove line breaks and continuations
	const cleanCurl = curl.replace(/\\\s*\n/g, ' ').trim();
	
	let method = 'GET';
	let methodExplicitlySet = false;
	let url = '';
	const headers: Record<string, string> = {};
	let body = '';
	
	// Parse the curl string while respecting quoted values
	const tokens = tokenizeCurl(cleanCurl);
	
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		
		if (token === 'curl') {
			continue;
		}
		
		if (token === '-X' || token === '--request') {
			if (i + 1 < tokens.length) {
				method = tokens[i + 1];
				methodExplicitlySet = true;
				i++;
			}
		} else if (token === '-H' || token === '--header') {
			if (i + 1 < tokens.length) {
				const headerStr = tokens[i + 1];
				const colonIndex = headerStr.indexOf(':');
				if (colonIndex !== -1) {
					const key = headerStr.substring(0, colonIndex).trim();
					const value = headerStr.substring(colonIndex + 1).trim();
					headers[key] = value;
				}
				i++;
			}
		} else if (token === '-d' || token === '--data' || token === '--data-raw') {
			if (i + 1 < tokens.length) {
				body = tokens[i + 1];
				i++;
			}
		} else if (token.startsWith('http://') || token.startsWith('https://')) {
			url = token;
		}
	}
	
	// Parse body based on Content-Type
	let data: unknown = body;
	let contentType: string | undefined;

	for (const key in headers) {
	if (key.toLowerCase() === 'content-type') {
		contentType = headers[key];
		break;
	}
	}
	
	if (contentType && body) {
		if (contentType.toLowerCase().includes('application/json')) {
			try {
				data = JSON.parse(body);
			} catch (error) {
				console.warn('Failed to parse JSON body:', error);
				// Keep as string if parsing fails
				data = body;
			}
		}
	}
	
	// curl defaults to POST when a body is supplied and no method is explicitly set
	if (body && !methodExplicitlySet) {
		method = 'POST';
	}

	return { method, url, headers, data };
}

/**
 * Tokenize curl command while respecting quoted strings
 */
enum TokenScope {
	Plain = "Plain",
	InSingleQuotes = "InSingleQuotes",
	InDoubleQuotes = "InDoubleQuotes",
}

function tokenizeCurl(curl: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let scope = TokenScope.Plain;
	
	for (let i = 0; i < curl.length; i++) {
		const char = curl[i];
		
		// Handle escape sequences inside quotes: \\ → \, \" → " (double quotes), \' → ' (single quotes)
		if (scope !== TokenScope.Plain && char === '\\' && i + 1 < curl.length) {
			const nextChar = curl[i + 1];
			if (nextChar === '\\' ||
				(scope === TokenScope.InSingleQuotes && nextChar === "'") ||
				(scope === TokenScope.InDoubleQuotes && nextChar === '"')) {
				current += nextChar;
				i++;
				continue;
			}
		}
		
		if (char === "'" && scope === TokenScope.Plain) {
			scope = TokenScope.InSingleQuotes;
		} else if (char === "'" && scope === TokenScope.InSingleQuotes) {
			scope = TokenScope.Plain;
		} else if (char === '"' && scope === TokenScope.Plain) {
			scope = TokenScope.InDoubleQuotes;
		} else if (char === '"' && scope === TokenScope.InDoubleQuotes) {
			scope = TokenScope.Plain;
		} else if (char === ' ' && scope === TokenScope.Plain) {
			if (current) {
				tokens.push(current);
				current = '';
			}
		} else {
			current += char;
		}
	}
	
	if (current) {
		tokens.push(current);
	}
	
	return tokens;
}

export const executeCurlRequest = async (input: HTTPInput, eventHandler: CopilotEventHandler, context?: { toolCallId?: string }): Promise<HTTPResponse | HTTPErrorResponse> => {
	const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
    const parsedRequest = parseCurl(input.curlCommand);
    try {
		eventHandler({
            type: "tool_call",
            toolName: CURL_TOOL_NAME,
            toolInput: { request: parsedRequest, scenario: input.testScenario },
            toolCallId
        });
        const response = await axios.request({ ...parsedRequest, timeout: CURL_REQUEST_TIMEOUT_MS });
		const requestOutput = createSuccessResponse(response);
		const toolOutput = { request: parsedRequest, scenario: input.testScenario, output: requestOutput };
		eventHandler({
            type: "tool_result",
            toolName: CURL_TOOL_NAME,
            toolOutput: toolOutput,
            toolCallId
        });
        return requestOutput;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorOutput = createErrorResponse(error);
            const toolOutput = { request: parsedRequest, scenario: input.testScenario, output: errorOutput };
            eventHandler({
                type: "tool_result",
                toolName: CURL_TOOL_NAME,
                toolOutput: toolOutput,
                toolCallId
            });
            return errorOutput;
        }
        const genericErrorOutput: HTTPErrorResponse = {
            error: true,
            message: error instanceof Error ? error.message : String(error),
        };
        const toolOutput = { request: parsedRequest, scenario: input.testScenario, output: genericErrorOutput };
        eventHandler({
            type: "tool_result",
            toolName: CURL_TOOL_NAME,
            toolOutput: toolOutput,
            toolCallId
        });
        return genericErrorOutput;
    }
};
