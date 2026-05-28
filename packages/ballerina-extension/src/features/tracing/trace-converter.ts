/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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
    EvalChatUserMessage as ChatUserMessage,
    EvalChatAssistantMessage as ChatAssistantMessage,
    EvalChatMessage as ChatMessage,
    EvalToolSchema as ToolSchema,
    EvalIteration as Iteration,
    EvalsetTrace,
    EvalFunctionCall
} from '@wso2/ballerina-core';

// TraceData interface (from trace-details-webview.ts)
interface TraceData {
    traceId: string;
    spans: SpanData[];
    resource: ResourceData;
    scope: ScopeData;
    firstSeen: string;
    lastSeen: string;
}

interface SpanData {
    spanId: string;
    traceId: string;
    parentSpanId: string;
    name: string;
    kind: string | number;
    startTime?: string;
    endTime?: string;
    attributes?: AttributeData[];
}

interface ResourceData {
    name: string;
    attributes: AttributeData[];
}

interface ScopeData {
    name: string;
    version?: string;
    attributes?: AttributeData[];
}

interface AttributeData {
    key: string;
    value: string;
}

// --- Helper Functions ---

/**
 * Helper to extract a value from the span's attribute list by key.
 */
function getAttribute(span: SpanData, key: string): string | null {
    if (!span.attributes) { return null; }
    const attr = span.attributes.find((a: AttributeData) => a.key === key);
    return attr ? attr.value : null;
}

/**
 * Parses a JSON string safely, returning null or a default if parsing fails.
 */
function safeJsonParse(jsonString: string | null): any {
    if (!jsonString) { return null; }
    try {
        return JSON.parse(jsonString);
    } catch (e) {
        // If it's not JSON, return the raw string or handle appropriately
        return jsonString;
    }
}

// --- Main Conversion Logic ---

/**
 * Converts a TraceData object to an EvalsetTrace format.
 */
export function convertTraceToEvalset(traceData: TraceData): EvalsetTrace {
    const spans = traceData.spans;
    const rootSpan = spans.find((s: SpanData) => s.kind === 2 || s.kind === '2');

    // Find all chat spans that contain conversation history
    const chatSpans = spans.filter((s: SpanData) =>
        s.name.startsWith('chat') && s.attributes?.some((a: AttributeData) => a.key === 'gen_ai.input.messages')
    );

    // Find all tool spans in the trace
    const toolSpans = spans.filter((s: SpanData) =>
        s.name.startsWith('execute_tool')
    );

    // Sort tool spans by start time to process in order
    toolSpans.sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
    });

    // Sort chat spans by start time to process in order
    chatSpans.sort((a, b) => {
        const timeA = a.startTime || '';
        const timeB = b.startTime || '';
        return timeA.localeCompare(timeB);
    });

    if (!rootSpan || chatSpans.length === 0) {
        throw new Error("Could not find required Root span or chat spans in trace.");
    }

    // Extract Data
    const traceId = traceData.traceId;
    const startTime = rootSpan.startTime || traceData.firstSeen;
    const endTime = rootSpan.endTime || traceData.lastSeen;

    // Extract Tools (look in any span that has gen_ai.input.tools)
    const toolSpan = spans.find((s: SpanData) =>
        s.attributes?.some((a: AttributeData) => a.key === 'gen_ai.input.tools')
    );
    const tools: ToolSchema[] = [];

    if (toolSpan) {
        const toolsStr = getAttribute(toolSpan, 'gen_ai.input.tools');
        if (toolsStr && toolsStr.trim() !== '') {
            const toolsData = safeJsonParse(toolsStr);
            if (Array.isArray(toolsData)) {
                toolsData.forEach((t: any) => {
                    tools.push({
                        name: t.name,
                        description: t.description,
                        parametersSchema: t.parameters
                    });
                });
            }
        }
    }

    // Helper function to parse messages
    const parseMessages = (messagesStr: string | null): ChatMessage[] => {
        if (!messagesStr) {
            return [];
        }

        let rawMessages = safeJsonParse(messagesStr);

        // Handle case where messages might be a single string
        if (typeof rawMessages === 'string') {
            rawMessages = [{ role: 'user', content: rawMessages }];
        }

        // Ensure we have an array
        if (!Array.isArray(rawMessages)) {
            console.warn('Expected array of messages, got:', typeof rawMessages);
            return [];
        }

        // Map raw OpenAI-style messages to our ChatMessage types
        return rawMessages.map((msg: any) => {
            const base: any = {
                role: msg.role,
                content: msg.content ?? null
            };

            if (msg.name) { base.name = msg.name; }

            // Only include toolCalls for assistant messages
            if (msg.role === 'assistant') {
                if (msg.tool_calls) {
                    base.toolCalls = msg.tool_calls.map((tc: any) => ({
                        id: tc.id,
                        name: tc.function?.name || tc.name,
                        arguments: typeof tc.function?.arguments === 'string'
                            ? safeJsonParse(tc.function.arguments)
                            : tc.function?.arguments || tc.arguments
                    }));
                } else if (msg.toolCalls) {
                    base.toolCalls = msg.toolCalls;
                } else {
                    base.toolCalls = null;
                }
            }

            if (msg.id) { base.id = msg.id; }

            return base as ChatMessage;
        });
    };

    // Helper function to parse a single output message
    const parseOutputMessage = (messageStr: string | null): ChatMessage => {
        if (!messageStr) {
            return {
                role: 'assistant',
                content: 'No output available',
                toolCalls: null
            };
        }

        const rawMessage = safeJsonParse(messageStr);

        // If it's already a properly formatted message object
        if (rawMessage && typeof rawMessage === 'object' && rawMessage.role) {
            const base: any = {
                role: rawMessage.role,
                content: rawMessage.content ?? null
            };

            if (rawMessage.name) { base.name = rawMessage.name; }

            // Only include toolCalls for assistant messages
            if (rawMessage.role === 'assistant') {
                if (rawMessage.tool_calls) {
                    base.toolCalls = rawMessage.tool_calls.map((tc: any) => ({
                        id: tc.id,
                        name: tc.function?.name || tc.name,
                        arguments: typeof tc.function?.arguments === 'string'
                            ? safeJsonParse(tc.function.arguments)
                            : tc.function?.arguments || tc.arguments
                    }));
                } else if (rawMessage.toolCalls) {
                    base.toolCalls = rawMessage.toolCalls;
                } else {
                    base.toolCalls = null;
                }
            }

            if (rawMessage.id) { base.id = rawMessage.id; }

            return base as ChatMessage;
        }

        // Fallback: treat as plain content
        return {
            role: 'assistant',
            content: typeof rawMessage === 'string' ? rawMessage : JSON.stringify(rawMessage),
            toolCalls: null
        };
    };

    // Build iterations from chat spans
    const iterations: Iteration[] = [];

    for (let i = 0; i < chatSpans.length; i++) {
        const chatSpan = chatSpans[i];
        const isLastSpan = i === chatSpans.length - 1;

        const inputMessagesStr = getAttribute(chatSpan, 'gen_ai.input.messages');
        const outputMessageStr = getAttribute(chatSpan, 'gen_ai.output.messages');

        const inputMessages = parseMessages(inputMessagesStr);
        const iterationHistory = [...inputMessages];

        // Parse output message (single object)
        const output = parseOutputMessage(outputMessageStr);

        if (!isLastSpan) {
            iterationHistory.push(output);
        }

        // Create iteration
        iterations.push({
            history: iterationHistory,
            output: output as ChatAssistantMessage,
            startTime: chatSpan.startTime || startTime,
            endTime: chatSpan.endTime || endTime
        });
    }

    // Determine User Message (Trigger)
    const firstChatInputStr = getAttribute(chatSpans[0], 'gen_ai.input.messages');
    const firstInputMessages = parseMessages(firstChatInputStr);
    const lastUserMsg = [...firstInputMessages].reverse().find(m => m.role === 'user');
    const userMessage: ChatUserMessage = lastUserMsg
        ? (lastUserMsg as ChatUserMessage)
        : { role: 'user', content: 'Unknown input' };

    const lastIteration = iterations[iterations.length - 1];
    const finalOutputToolCalls: EvalFunctionCall[] = [];

    for (let i = 0; i < toolSpans.length; i++) {
        const toolSpan = toolSpans[i];
        const toolCallsStr = getAttribute(toolSpan, 'gen_ai.tool.arguments');
        const toolCallsData = safeJsonParse(toolCallsStr);
        finalOutputToolCalls.push({
            name: getAttribute(toolSpan, 'gen_ai.tool.name') || 'unknown_tool',
            arguments: toolCallsData
        });
    }

    // Final output is the last iteration's output
    const finalOutput: ChatAssistantMessage = lastIteration.output;

    // Assemble Final Trace Object
    const evalsetTrace: EvalsetTrace = {
        id: traceId,
        userMessage: userMessage,
        iterations: iterations,
        output: finalOutput,
        tools: tools,
        ...(finalOutputToolCalls.length > 0 && { toolCalls: finalOutputToolCalls }),
        startTime: startTime,
        endTime: endTime
    };

    return evalsetTrace;
}

/**
 * Converts multiple TraceData objects to a combined evalset format.
 */
export function convertTracesToEvalset(traces: TraceData[]): EvalsetTrace[] {
    return traces.map(trace => convertTraceToEvalset(trace));
}
