// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

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

export const HTTP_REQUEST_TOOL_NAME = "Send-HTTP-request";


export const HTTPInputSchema = z.object({
    curlCommand: z.string().describe("The curl command to execute, including the URL, method, headers, and body. For example: `curl -X POST https://api.example.com/data -H 'Content-Type: application/json' -d '{\"key\":\"value\"}'`")
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

export function createHttpRequestTool(eventHandler: CopilotEventHandler) {
    return tool({
        description: `A tool to make requests to a given API endpoint. Provide the endpoint URL and request details to get a response. Use this tool for testing and debugging HTTP endpoints.`,
        inputSchema: HTTPInputSchema,
        execute: async (input): Promise<HTTPResponse | HTTPErrorResponse> => await executeHttpRequest(input, eventHandler)
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
	
	return { method, url, headers, data };
}

/**
 * Tokenize curl command while respecting quoted strings
 */
function tokenizeCurl(curl: string): string[] {
	const tokens: string[] = [];
	let current = '';
	let inQuotes = false;
	let quoteChar = '';
	
	for (let i = 0; i < curl.length; i++) {
		const char = curl[i];
		
		if ((char === '"' || char === "'") && (i === 0 || curl[i - 1] !== '\\')) {
			if (!inQuotes) {
				inQuotes = true;
				quoteChar = char;
			} else if (char === quoteChar) {
				inQuotes = false;
				quoteChar = '';
			} else {
				current += char;
			}
		} else if (char === ' ' && !inQuotes) {
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

export const executeHttpRequest = async (input: HTTPInput, eventHandler: CopilotEventHandler, context?: { toolCallId?: string }): Promise<HTTPResponse | HTTPErrorResponse> => {
	const toolCallId = context?.toolCallId || `fallback-${Date.now()}`;
    console.log(`Executing HTTP request: input:`, input);
    try {
		eventHandler({type:"tool_call", toolName: HTTP_REQUEST_TOOL_NAME, toolInput: input});
        const response = await axios.request(parseCurl(input.curlCommand));
        console.log("HTTP request successful:", response);
		const requestOutput = createSuccessResponse(response);
		const toolOutput = {input, output: requestOutput};
		eventHandler({
        type: "tool_result",
        toolName: HTTP_REQUEST_TOOL_NAME,
        toolOutput: toolOutput,
        toolCallId});
        return requestOutput;
    } catch (error) {
        console.error("HTTP request failed:", error);
        if (axios.isAxiosError(error)) {
            const errorOutput = createErrorResponse(error);
            const toolOutput = {input, output: errorOutput};
            eventHandler({
                type: "tool_result",
                toolName: HTTP_REQUEST_TOOL_NAME,
                toolOutput: toolOutput,
                toolCallId
            });
            return errorOutput;
        }
        const genericErrorOutput: HTTPErrorResponse = {
            error: true,
            message: error instanceof Error ? error.message : String(error),
        };
        const toolOutput = {input, output: genericErrorOutput};
        eventHandler({
            type: "tool_result",
            toolName: HTTP_REQUEST_TOOL_NAME,
            toolOutput: toolOutput,
            toolCallId
        });
        return genericErrorOutput;
    }
};
