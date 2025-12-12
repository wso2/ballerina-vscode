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

/**
 * Helper functions for accumulating and managing stream content.
 * Extracted from design.ts to be reusable across handlers.
 */

/**
 * Accumulates text delta into the current assistant content
 */
export function accumulateTextContent(currentAssistantContent: any[], textPart: string): void {
    const lastContent = currentAssistantContent[currentAssistantContent.length - 1];
    if (lastContent && lastContent.type === "text") {
        lastContent.text += textPart;
    }
}

/**
 * Accumulates a tool call into the current assistant content
 */
export function accumulateToolCall(currentAssistantContent: any[], part: any): void {
    currentAssistantContent.push({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input
    });
}

/**
 * Saves the tool result to accumulated messages
 */
export function saveToolResult(
    part: any,
    accumulatedMessages: any[],
    currentAssistantContent: any[]
): void {
    if (currentAssistantContent.length > 0) {
        accumulatedMessages.push({
            role: "assistant",
            content: [...currentAssistantContent]
        });
        currentAssistantContent.length = 0;
    }

    // Need to specify output type for tool result
    const outputType: 'json' = 'json';

    accumulatedMessages.push({
        role: "tool",
        content: [{
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            output: {
                type: outputType,
                value: part.output
            }
        }]
    });
}
