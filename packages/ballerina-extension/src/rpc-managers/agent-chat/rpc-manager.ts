/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
    AgentChatAPI,
    ChatReqMessage,
    ChatRespMessage,
    TraceInput,
    TraceStatus
} from "@wso2/ballerina-core";
import * as vscode from 'vscode';
import { extension } from '../../BalExtensionContext';
import { TracerMachine, TraceServer } from "../../features/tracing";
import { TraceDetailsWebview } from "../../features/tracing/trace-details-webview";
import { Trace } from "../../features/tracing/trace-server";

export class AgentChatRpcManager implements AgentChatAPI {
    private currentAbortController: AbortController | null = null;

    async getChatMessage(params: ChatReqMessage): Promise<ChatRespMessage> {
        return new Promise(async (resolve, reject) => {
            try {
                if (
                    !extension.agentChatContext.chatEp || typeof extension.agentChatContext.chatEp !== 'string' ||
                    !extension.agentChatContext.chatSessionId || typeof extension.agentChatContext.chatSessionId !== 'string'
                ) {
                    throw new Error('Invalid Agent Chat Context: Missing or incorrect ChatEP or ChatSessionID!');
                }

                this.currentAbortController = new AbortController();
                const response = await this.fetchTestData(
                    extension.agentChatContext.chatEp,
                    { sessionId: extension.agentChatContext.chatSessionId, ...params },
                    this.currentAbortController.signal
                );
                if (response && response.message) {
                    resolve(response as ChatRespMessage);
                } else {
                    reject(new Error("Invalid response format:", response));
                }
            } catch (error) {
                reject(error);
            } finally {
                this.currentAbortController = null;
            }
        });
    }

    async abortChatRequest(): Promise<void> {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }

    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch (_) {
            return false;
        }
    }

    private async fetchTestData(url: string, payload: Record<string, any>, signal: AbortSignal): Promise<Record<string, any>> {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                signal,
            });

            if (!response.ok) {
                switch (response.status) {
                    case 400:
                        throw new Error("Bad Request: The server could not understand the request.");
                    case 401:
                        throw new Error("Unauthorized: Authentication is required.");
                    case 403:
                        throw new Error("Forbidden: You do not have permission to access this resource.");
                    case 404:
                        throw new Error("Not Found: The requested resource could not be found.");
                    case 408:
                        throw new Error("Request Timeout: The server took too long to respond.");
                    case 500:
                        throw new Error("Internal Server Error: Something went wrong on the server.");
                    case 502:
                        throw new Error("Bad Gateway: Received an invalid response from the upstream server.");
                    case 503:
                        throw new Error("Service Unavailable: The server is temporarily unavailable.");
                    case 504:
                        throw new Error("Gateway Timeout: The server took too long to respond.");
                    default:
                        throw new Error(`HTTP error! Status: ${response.status}`);
                }
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                // Provide a custom message for aborted request
                throw new Error("Request aborted by the user.");
            }

            let errorMessage = "An unknown error occurred";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            throw new Error(errorMessage);
        }
    }

    async getTracingStatus(): Promise<TraceStatus> {
        return new Promise(async (resolve) => {
            const isEnabled = TracerMachine.isEnabled();
            resolve({
                enabled: isEnabled
            });
        });
    }


    /**
     * Find the trace that corresponds to a chat message by matching span attributes
     * @param userMessage The user's input message
     * @returns The matching trace or undefined if not found
     */
    findTraceForMessage(userMessage: string): Trace | undefined {
        // Get all traces from the TraceServer
        const traces = TraceServer.getTraces();

        // Helper function to extract string value from attribute value
        const extractValue = (value: any): string => {
            if (typeof value === 'string') {
                return value;
            }
            if (value && typeof value === 'object' && 'stringValue' in value) {
                return String(value.stringValue);
            }
            return '';
        };

        // Iterate through each trace to find matching spans
        for (const trace of traces) {
            // Check each span in the trace
            for (const span of trace.spans || []) {
                // Check if this span matches our criteria:
                // 1. span.type === "ai"
                // 2. gen_ai.operation.name === "invoke_agent"
                // 3. gen_ai.input.messages matches the user message

                const attributes = span.attributes || [];

                // Find relevant attributes
                let spanType: string | undefined;
                let operationName: string | undefined;
                let inputMessages: string | undefined;

                for (const attr of attributes) {
                    const attrValue = extractValue(attr.value);

                    if (attr.key === 'span.type') {
                        spanType = attrValue;
                    } else if (attr.key === 'gen_ai.operation.name') {
                        operationName = attrValue;
                    } else if (attr.key === 'gen_ai.input.messages') {
                        inputMessages = attrValue;
                    }
                }

                // Check if all criteria match
                if (spanType === 'ai' &&
                    operationName === 'invoke_agent' &&
                    inputMessages) {
                    // Check if the input message matches
                    // inputMessages might be JSON or contain the message
                    if (inputMessages.includes(userMessage)) {
                        return trace;
                    }
                }
            }
        }

        return undefined;
    }

    /**
     * Show trace details webview for a given chat message
     * Finds the trace matching the message and opens it in the trace details webview
     * @param userMessage The user's input message
     * @throws Error if no trace is found for the message
     */
    async showTraceDetailsForMessage(userMessage: string): Promise<void> {
        try {
            // Find the trace that matches the user message
            const trace = this.findTraceForMessage(userMessage);

            if (!trace) {
                const errorMessage = 'No trace found for the given message. Make sure tracing is enabled and the agent has processed this message.';
                vscode.window.showErrorMessage(errorMessage);
                throw new Error(errorMessage);
            }

            // Open the trace details webview with isAgentChat=true
            TraceDetailsWebview.show(trace, true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to show trace details';
            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
            throw error;
        }
    }

    async showTraceView(params: TraceInput): Promise<void> {
        await this.showTraceDetailsForMessage(params.message);
    }
}
