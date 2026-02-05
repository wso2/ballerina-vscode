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

    // Find the span containing the GenAI interaction attributes
    const aiSpan = spans.find((s: SpanData) =>
        s.name.includes('invoke_agent') && s.attributes?.some((a: AttributeData) => a.key === 'gen_ai.input.messages')
    );

    if (!rootSpan || !aiSpan) {
        throw new Error("Could not find required Root or AI spans in trace.");
    }

    // Extract Data
    const traceId = traceData.traceId;
    const startTime = rootSpan.startTime || traceData.firstSeen;
    const endTime = rootSpan.endTime || traceData.lastSeen;

    // Extract Tools
    const toolSpan = spans.find((s: SpanData) =>
        s.attributes?.some((a: AttributeData) => a.key === 'gen_ai.input.tools')
    );
    const toolsStr = getAttribute(toolSpan, 'gen_ai.input.tools');
    const toolsData = safeJsonParse(toolsStr);
    const tools: ToolSchema[] = [];

    if (Array.isArray(toolsData)) {
        toolsData.forEach((t: any) => {
            tools.push({
                name: t.name,
                description: t.description,
                parametersSchema: t.parameters
            });
        });
    }

    // Extract History & Messages
    const inputMessagesStr = getAttribute(aiSpan, 'gen_ai.input.messages');
    const outputMessagesStr = getAttribute(aiSpan, 'gen_ai.output.messages');

    // Parse the input messages (History)
    let rawHistory = safeJsonParse(inputMessagesStr);

    // Handle case where history might be a single string
    if (typeof rawHistory === 'string') {
        rawHistory = [{ role: 'user', content: rawHistory }];
    }

    // Map raw OpenAI-style messages to our ChatMessage types
    const history: ChatMessage[] = (rawHistory || []).map((msg: any) => {
        const base: any = {
            role: msg.role,
            content: msg.content
        };

        if (msg.name) { base.name = msg.name; }
        if (msg.toolCalls) { base.toolCalls = msg.toolCalls; }
        if (msg.id) { base.id = msg.id; }

        return base as ChatMessage;
    });

    // Determine User Message (Trigger)
    // We assume the last user message in the history is the current trigger
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
    const userMessage: ChatUserMessage = lastUserMsg
        ? (lastUserMsg as ChatUserMessage)
        : { role: 'user', content: 'Unknown input' };

    // Determine Output
    let outputObj: ChatAssistantMessage;
    const parsedOutput = safeJsonParse(outputMessagesStr);

    if (parsedOutput && typeof parsedOutput === 'object' && parsedOutput.role) {
        outputObj = parsedOutput;
    } else if (outputMessagesStr) {
        // Construct a generic assistant message if raw string
        outputObj = {
            role: 'assistant',
            content: outputMessagesStr
        };
    } else {
        // No output found - use a placeholder
        outputObj = {
            role: 'assistant',
            content: 'No output available'
        };
    }

    // Extract tool calls from execute_tool spans
    const toolCallSpans = spans.filter((s: SpanData) => s.name.includes('execute_tool'));
    if (toolCallSpans.length > 0) {
        const toolCalls: EvalFunctionCall[] = [];

        for (const toolSpan of toolCallSpans) {
            const toolName = getAttribute(toolSpan, 'gen_ai.tool.name') || getAttribute(toolSpan, 'tool.name');
            const toolArgs = getAttribute(toolSpan, 'gen_ai.tool.arguments') || getAttribute(toolSpan, 'tool.arguments');
            const toolId = getAttribute(toolSpan, 'gen_ai.tool.id') || getAttribute(toolSpan, 'tool.id') || toolSpan.spanId;

            // parse tool arguments if they are in JSON format
            const parsedArgs = safeJsonParse(toolArgs);
            const finalArgs = typeof parsedArgs === 'object' ? parsedArgs : toolArgs;

            if (toolName) {
                toolCalls.push({
                    id: toolId,
                    name: toolName,
                    arguments: finalArgs
                });
            }
        }

        if (toolCalls.length > 0) {
            outputObj.toolCalls = toolCalls;
        }
    }

    // Construct Iteration
    const iteration: Iteration = {
        startTime: aiSpan.startTime || startTime,
        endTime: aiSpan.endTime || endTime,
        history: history,
        output: outputObj
    };

    // Assemble Final Trace Object
    const evalsetTrace: EvalsetTrace = {
        id: traceId,
        userMessage: userMessage,
        iterations: [iteration],
        output: outputObj,
        tools: tools,
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
