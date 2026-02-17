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

import { EvalThread, EvalsetTrace, EvalFunctionCall, EvalToolSchema } from "@wso2/ballerina-core";

/**
 * Deep clone an EvalThread for editing
 */
export const cloneEvalThread = (evalThread: EvalThread): EvalThread => {
    return JSON.parse(JSON.stringify(evalThread));
};

/**
 * Update the user message content in a trace
 */
export const updateTraceUserMessage = (trace: EvalsetTrace, content: string): EvalsetTrace => {
    return {
        ...trace,
        userMessage: {
            ...trace.userMessage,
            content,
        },
    };
};

/**
 * Update the agent output content in a trace
 */
export const updateTraceAgentOutput = (trace: EvalsetTrace, content: string): EvalsetTrace => {
    return {
        ...trace,
        output: {
            ...trace.output,
            content,
        },
    };
};

/**
 * Get tool calls from a trace output
 */
export const getToolCallsFromTrace = (trace: EvalsetTrace): EvalFunctionCall[] => {
    if (trace.toolCalls) {
        return trace.toolCalls as EvalFunctionCall[];
    }
    return [];
};

/**
 * Update tool calls in a trace
 */
export const updateToolCallsInTrace = (
    trace: EvalsetTrace,
    toolCalls: EvalFunctionCall[]
): EvalsetTrace => {
    const updated = { ...trace };
    if (toolCalls && toolCalls.length > 0) {
        updated.toolCalls = toolCalls;
    } else {
        delete updated.toolCalls;
    }
    return updated;
};

/**
 * Generate a unique ID for a tool call
 */
export const generateToolCallId = (): string => {
    return `tool_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Serialize content for editing (convert object to string if needed)
 */
export const serializeContent = (content: string | any): string => {
    if (typeof content === 'string') {
        return content;
    }
    return JSON.stringify(content, null, 2);
};

/**
 * Deserialize content after editing (parse JSON if original was object)
 */
export const deserializeContent = (
    content: string,
    originalType: 'string' | 'object'
): string | any => {
    if (originalType === 'string') {
        return content;
    }
    try {
        return JSON.parse(content);
    } catch (error) {
        // If parsing fails, return as string
        console.error('Failed to parse content as JSON:', error);
        return content;
    }
};

/**
 * Get the original type of content
 */
export const getContentType = (content: string | any): 'string' | 'object' => {
    return typeof content === 'string' ? 'string' : 'object';
};

/**
 * Generate a unique ID for a trace
 */
export const generateTraceId = (): string => {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * Create a new empty trace
 */
export const createNewTrace = (tools: EvalToolSchema[] = []): EvalsetTrace => {
    const timestamp = new Date().toISOString();

    return {
        id: generateTraceId(),
        userMessage: {
            role: 'user',
            content: 'User message',
        },
        output: {
            role: 'assistant',
            content: 'Agent response',
        },
        tools: tools,
        iterations: [],
        startTime: timestamp,
        endTime: timestamp,
    };
};
