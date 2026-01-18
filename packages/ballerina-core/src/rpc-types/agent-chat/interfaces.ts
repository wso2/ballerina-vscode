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

export interface ChatReqMessage {
    message: string;
}

export interface ChatRespMessage {
    message: string;
    traceId?: string;
    toolCalls?: ToolCallSummary[];
    executionSteps?: ExecutionStep[];
}

export interface ToolCallSummary {
    spanId: string;
    toolName: string;
    output: string;
}

export interface ExecutionStep {
    spanId: string;
    operationType: 'invoke' | 'chat' | 'tool' | 'other';
    name: string;
    fullName: string;
    duration: number;
    startTime?: string;
    endTime?: string;
    hasError?: boolean;
}

export interface TraceStatus {
    enabled: boolean;
}

export interface TraceInput {
    message?: string;
    traceId?: string;
    focusSpanId?: string;
}

export interface ChatHistoryMessage {
    type: 'message' | 'error';
    text: string;
    isUser: boolean;
    traceId?: string;
}

export interface ChatHistoryResponse {
    messages: ChatHistoryMessage[];
    isAgentRunning: boolean;
}

export interface AgentStatusResponse {
    isRunning: boolean;
}

export interface ClearChatResponse {
    newSessionId: string;
}
