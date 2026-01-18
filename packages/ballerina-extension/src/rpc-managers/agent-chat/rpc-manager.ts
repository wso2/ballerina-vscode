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
    ToolCallSummary,
    ExecutionStep,
    TraceInput,
    TraceStatus,
    ChatHistoryMessage,
    ChatHistoryResponse,
    AgentStatusResponse,
    ClearChatResponse
} from "@wso2/ballerina-core";
import * as vscode from 'vscode';
import { extension } from '../../BalExtensionContext';
import { TracerMachine, TraceServer } from "../../features/tracing";
import { TraceDetailsWebview } from "../../features/tracing/trace-details-webview";
import { Trace } from "../../features/tracing/trace-server";
import { v4 as uuidv4 } from "uuid";
import { updateChatSessionId } from "../../features/tryit/activator";

export class AgentChatRpcManager implements AgentChatAPI {
    private currentAbortController: AbortController | null = null;
    // Store chat history per session ID
    private static chatHistoryMap: Map<string, ChatHistoryMessage[]> = new Map();
    // Track active sessions
    private static activeSessions: Set<string> = new Set();

    async getChatMessage(params: ChatReqMessage): Promise<ChatRespMessage> {
        return new Promise(async (resolve, reject) => {
            try {
                if (
                    !extension.agentChatContext.chatEp || typeof extension.agentChatContext.chatEp !== 'string' ||
                    !extension.agentChatContext.chatSessionId || typeof extension.agentChatContext.chatSessionId !== 'string'
                ) {
                    throw new Error('Invalid Agent Chat Context: Missing or incorrect ChatEP or ChatSessionID!');
                }

                // Store user message in history
                const sessionId = extension.agentChatContext.chatSessionId;
                // Mark session as active when first message is sent
                AgentChatRpcManager.activeSessions.add(sessionId);

                this.addMessageToHistory(sessionId, {
                    type: 'message',
                    text: params.message,
                    isUser: true
                });

                this.currentAbortController = new AbortController();

                const payload = { sessionId: extension.agentChatContext.chatSessionId, ...params };
                console.log('[Agent Chat] Sending message with session ID:', payload.sessionId);

                const response = await this.fetchTestData(
                    extension.agentChatContext.chatEp,
                    payload,
                    this.currentAbortController.signal
                );
                if (response && response.message) {
                    // Store agent response in history
                    this.addMessageToHistory(sessionId, {
                        type: 'message',
                        text: response.message,
                        isUser: false,
                        traceId: trace?.traceId
                    });

                    // Find trace and extract tool calls and execution steps
                    const trace = this.findTraceForMessage(params.message);
                    const toolCalls = trace ? this.extractToolCalls(trace) : undefined;
                    const executionSteps = trace ? this.extractExecutionSteps(trace) : undefined;

                    resolve({
                        message: response.message,
                        traceId: trace?.traceId,
                        executionSteps
                    } as ChatRespMessage);
                } else {
                    reject(new Error("Invalid response format:", response));
                }
            } catch (error) {
                // Store error message in history
                const errorMessage =
                    error && typeof error === "object" && "message" in error
                        ? String(error.message)
                        : "An unknown error occurred";

                const sessionId = extension.agentChatContext?.chatSessionId;
                if (sessionId) {
                    this.addMessageToHistory(sessionId, {
                        type: 'error',
                        text: errorMessage,
                        isUser: false
                    });
                }

                reject(error);
            } finally {
                this.currentAbortController = null;
            }
        });
    }

    private addMessageToHistory(sessionId: string, message: ChatHistoryMessage): void {
        if (!AgentChatRpcManager.chatHistoryMap.has(sessionId)) {
            AgentChatRpcManager.chatHistoryMap.set(sessionId, []);
        }
        AgentChatRpcManager.chatHistoryMap.get(sessionId)!.push(message);
    }

    abortChatRequest(): void {
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
     * Extract tool call summaries from a trace
     * @param trace The trace to extract tool calls from
     * @returns Array of tool call summaries
     */
    private extractToolCalls(trace: Trace): ToolCallSummary[] {
        const toolCalls: ToolCallSummary[] = [];

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

        // Helper to check if a span is a tool execution span
        const isToolExecutionSpan = (span: any): boolean => {
            const attributes = span.attributes || [];
            for (const attr of attributes) {
                if (attr.key === 'gen_ai.operation.name') {
                    const value = extractValue(attr.value);
                    return value.startsWith('execute_tool');
                }
            }
            return false;
        };

        // Iterate through spans to find tool executions
        for (const span of trace.spans || []) {
            if (isToolExecutionSpan(span)) {
                const attributes = span.attributes || [];

                let toolName = 'Unknown';
                let output = '';

                // Extract tool name and output
                for (const attr of attributes) {
                    const value = extractValue(attr.value);
                    if (attr.key === 'gen_ai.tool.name') {
                        toolName = value;
                    } else if (attr.key === 'gen_ai.tool.output') {
                        output = value;
                    }
                }

                toolCalls.push({
                    spanId: span.spanId,
                    toolName,
                    output
                });
            }
        }

        return toolCalls;
    }

    /**
     * Remove operation prefixes from span names
     * @param name The span name to clean
     * @returns The cleaned span name
     */
    private stripSpanPrefix(name: string): string {
        const prefixes = ['invoke_agent ', 'execute_tool ', 'chat '];
        for (const prefix of prefixes) {
            if (name.startsWith(prefix)) {
                return name.substring(prefix.length);
            }
        }
        return name;
    }

    /**
     * Extract execution steps from a trace
     * @param trace The trace to extract execution steps from
     * @returns Array of execution steps sorted chronologically
     */
    private extractExecutionSteps(trace: Trace): ExecutionStep[] {
        const steps: ExecutionStep[] = [];

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

        // Iterate through all spans in the trace
        for (const span of trace.spans || []) {
            const attributes = span.attributes || [];

            let operationName = '';
            let toolName = '';
            let hasError = false;

            // Extract relevant attributes
            for (const attr of attributes) {
                const value = extractValue(attr.value);

                if (attr.key === 'gen_ai.operation.name') {
                    operationName = value;
                } else if (attr.key === 'gen_ai.tool.name') {
                    toolName = value;
                } else if (attr.key === 'error.message') {
                    hasError = true;
                }
            }

            // Determine operation type based on operation name
            let operationType: 'invoke' | 'chat' | 'tool' | 'other' = 'other';
            let displayName = operationName;

            if (operationName.startsWith('invoke_agent')) {
                operationType = 'invoke';
                displayName = this.stripSpanPrefix(span.name);
            } else if (operationName.startsWith('chat')) {
                operationType = 'chat';
                displayName = this.stripSpanPrefix(span.name);
            } else if (operationName.startsWith('execute_tool')) {
                operationType = 'tool';
                displayName = toolName || this.stripSpanPrefix(span.name);
            } else {
                // Skip spans that don't match our criteria
                continue;
            }

            // Calculate duration from ISO timestamps
            const startTimeISO = span.startTime;
            const endTimeISO = span.endTime;
            let duration = 0;

            if (startTimeISO && endTimeISO) {
                const startMs = new Date(startTimeISO).getTime();
                const endMs = new Date(endTimeISO).getTime();
                duration = endMs - startMs;
            }

            steps.push({
                spanId: span.spanId,
                operationType,
                name: displayName,
                fullName: operationName,
                duration,
                startTime: startTimeISO,
                endTime: endTimeISO,
                hasError
            });
        }

        // Sort by start time chronologically
        steps.sort((a, b) => {
            if (!a.startTime || !b.startTime) { return 0; }
            return a.startTime.localeCompare(b.startTime);
        });

        return steps;
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
        try {
            let trace: Trace | undefined;

            // Support direct trace lookup by traceId
            if (params.traceId) {
                const traces = TraceServer.getTraces();
                trace = traces.find(t => t.traceId === params.traceId);
            } else if (params.message) {
                // Fallback to message-based lookup
                trace = this.findTraceForMessage(params.message);
            }

            if (!trace) {
                const errorMessage = 'No trace found. Make sure tracing is enabled and the agent has processed this message.';
                vscode.window.showErrorMessage(errorMessage);
                throw new Error(errorMessage);
            }

            // Open the trace details webview with isAgentChat=true and optional focusSpanId
            TraceDetailsWebview.show(trace, true, params.focusSpanId, params.openInFocusMode);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to show trace details';
            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
            throw error;
        }
    }

    async getChatHistory(): Promise<ChatHistoryResponse> {
        return new Promise(async (resolve) => {
            const sessionId = extension.agentChatContext?.chatSessionId;

            if (!sessionId) {
                resolve({
                    messages: [],
                    isAgentRunning: false
                });
                return;
            }

            // Session is considered "running" if it's in the active sessions set
            const isAgentRunning = AgentChatRpcManager.activeSessions.has(sessionId);
            const messages = AgentChatRpcManager.chatHistoryMap.get(sessionId) || [];

            resolve({
                messages,
                isAgentRunning
            });
        });
    }

    async clearChatHistory(): Promise<ClearChatResponse> {
        return new Promise(async (resolve) => {
            const oldSessionId = extension.agentChatContext?.chatSessionId;
            if (oldSessionId) {
                // Clear the old session's history and mark it as inactive
                AgentChatRpcManager.chatHistoryMap.delete(oldSessionId);
                AgentChatRpcManager.activeSessions.delete(oldSessionId);
            }

            // Generate a new session ID
            const newSessionId = uuidv4();

            // Update the agent chat context with the new session ID
            if (extension.agentChatContext) {
                extension.agentChatContext.chatSessionId = newSessionId;

                // Mark the new session as active
                AgentChatRpcManager.activeSessions.add(newSessionId);

                // Update the activator's chatSessionMap with the new session ID
                const chatEp = extension.agentChatContext.chatEp;
                if (chatEp) {
                    updateChatSessionId(chatEp, newSessionId);
                }
            }

            resolve({
                newSessionId
            });
        });
    }

    async getAgentStatus(): Promise<AgentStatusResponse> {
        return new Promise(async (resolve) => {
            const sessionId = extension.agentChatContext?.chatSessionId;
            const isRunning = sessionId ? AgentChatRpcManager.activeSessions.has(sessionId) : false;
            resolve({
                isRunning
            });
        });
    }
}
