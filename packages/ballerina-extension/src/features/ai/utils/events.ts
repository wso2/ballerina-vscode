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

import { ChatNotify, Command, onChatNotify } from "@wso2/ballerina-core";
import { ModelUsage } from "./libs/function-registry";
import { RPCLayer } from "../../../RPCLayer";
import { AiPanelWebview } from "../../../views/ai-panel/webview";
import {
    sendContentAppendNotification,
    sendContentReplaceNotification,
    sendDiagnosticMessageNotification,
    sendErrorNotification,
    sendMessagesNotification,
    sendMessageStartNotification,
    sendMessageStopNotification,
    sendIntermidateStateNotification,
    sendToolCallNotification,
    sendToolResultNotification,
    sendTaskApprovalRequestNotification,
    sendWebToolApprovalNotification,
    sendAbortNotification,
    sendSaveChatNotification,
    sendConnectorGenerationNotification,
    sendConfigurationCollectionNotification,
    sendMigrationPanelNotification,
    sendVisualizerMigrationNotification,
    sendAIPanelNotification,
    sendClarifyNotification,
    sendChatComponentNotification,
    sendUsageMetricsNotification,
} from "./ai-utils";

export type CopilotEventHandler = (event: ChatNotify) => void;

export type ToolModelUsage = Record<string, { inputTokens: number; outputTokens: number }>;

// Per-million-token pricing by model
const MODEL_PRICING: Record<string, { input: number; cacheWrite: number; cacheRead: number; output: number }> = {
    'claude-sonnet-4-6':            { input: 3,  cacheWrite: 3.75, cacheRead: 0.30, output: 15 },
    'claude-haiku-4-5-20251001':    { input: 1,  cacheWrite: 1.25, cacheRead: 0.10, output: 5  },
};

interface CostInput {
    model: string;
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
}

export function calculateCost(usage: CostInput): number {
    const pricing = MODEL_PRICING[usage.model];
    if (!pricing) { return 0; }

    const cacheRead = usage.cacheReadTokens || 0;
    const cacheWrite = usage.cacheWriteTokens || 0;
    const baseInput = usage.inputTokens - cacheRead - cacheWrite;

    return (
        baseInput   * pricing.input      +
        cacheWrite  * pricing.cacheWrite  +
        cacheRead   * pricing.cacheRead   +
        usage.outputTokens * pricing.output
    ) / 1_000_000;
}

export function calculateTotalCost(
    mainModel: string,
    mainUsage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number },
    toolModelUsage: ToolModelUsage
): number {
    const mainCost = calculateCost({ model: mainModel, ...mainUsage });
    const toolCost = Object.entries(toolModelUsage).reduce(
        (sum, [model, u]) => sum + calculateCost({ model, inputTokens: u.inputTokens, outputTokens: u.outputTokens }),
        0
    );
    return mainCost + toolCost;
}

export function emitModelUsage(eventHandler: CopilotEventHandler, usages: ModelUsage[], accumulator: ToolModelUsage): void {
    for (const u of usages) {
        if (!accumulator[u.model]) {
            accumulator[u.model] = { inputTokens: 0, outputTokens: 0 };
        }
        accumulator[u.model].inputTokens += u.inputTokens;
        accumulator[u.model].outputTokens += u.outputTokens;

        eventHandler({
            type: "usage_metrics",
            model: u.model,
            usage: {
                inputTokens: u.inputTokens,
                cacheCreationInputTokens: 0,
                cacheReadInputTokens: 0,
                outputTokens: u.outputTokens,
            },
        });
    }
}

/**
 * Updates chat message with model messages and triggers save
 * This is a shared utility used by agent, datamapper, and other AI features
 */
export function updateAndSaveChat(messageId: string, command: Command, eventHandler: CopilotEventHandler): void {
    eventHandler({ type: "save_chat", command, messageId });
}

// Event listener that handles events and sends notifications
export function createWebviewEventHandler(command: Command): CopilotEventHandler {
    return (event: ChatNotify) => {
        switch (event.type) {
            case "start":
                sendMessageStartNotification();
                break;
            case "content_block":
                sendContentAppendNotification(event.content);
                break;
            case "content_replace":
                sendContentReplaceNotification(event.content);
                break;
            case "error":
                sendErrorNotification(event.content);
                break;
            case "stop":
                sendMessageStopNotification(command);
                break;
            case "abort":
                sendAbortNotification(event.command);
                break;
            case "save_chat":
                sendSaveChatNotification(event.command, event.messageId);
                break;
            case "intermediary_state":
                sendIntermidateStateNotification(event.state);
                break;
            case "messages":
                sendMessagesNotification(event.messages);
                break;
            case "tool_call":
                sendToolCallNotification(event.toolName, event.toolInput, event.toolCallId);
                break;
            case "tool_result":
                sendToolResultNotification(event.toolName, event.toolOutput, event.toolCallId, event.failed);
                break;
            case "task_approval_request":
                console.log("[Event Handler] Task approval request received:", event);
                sendTaskApprovalRequestNotification(
                    event.approvalType,
                    event.tasks,
                    event.taskDescription,
                    event.message,
                    event.requestId,
                    event.autoApproved
                );
                break;
            case "evals_tool_result":
                // Ignore evals-specific events in webview
                break;
            case "usage_metrics":
                sendUsageMetricsNotification(event.usage, event.breakdown);
                break;
            case "diagnostics":
                sendDiagnosticMessageNotification(event.diagnostics);
                break;
            case "connector_generation_notification":
                sendConnectorGenerationNotification(event);
                break;
            case "configuration_collection_event":
                sendConfigurationCollectionNotification(event);
                break;
            case "clarify_event":
                sendClarifyNotification(event);
                break;
            case "chat_component":
                sendChatComponentNotification(event.componentType, event.data, event.id);
                break;
            case "web_tool_approval_request":
                sendWebToolApprovalNotification(event.requestId, event.toolName, event.content);
                break;
            case "compaction_start":
                console.log('[Compaction] Context compaction started');
                RPCLayer._messenger.sendNotification(onChatNotify, { type: "webview", webviewType: AiPanelWebview.viewType }, event);
                break;
            case "compaction_end":
                console.log('[Compaction] Context compaction completed');
                RPCLayer._messenger.sendNotification(onChatNotify, { type: "webview", webviewType: AiPanelWebview.viewType }, event);
                break;
            case "compaction_disabled":
                console.warn('[Compaction] Compaction disabled — codebase floor exceeds trigger threshold');
                RPCLayer._messenger.sendNotification(onChatNotify, { type: "webview", webviewType: AiPanelWebview.viewType }, event);
                break;
            default:
                console.warn(`Unhandled event type: ${event}`);
                break;
        }
    };
}

/**
 * Event handler factory that routes agent/executor events to the standalone
 * Migration Enhancement Panel (instead of the AI Chat panel).
 *
 * Uses `sendMigrationPanelNotification` under the hood so the notifications
 * target `MigrationPanelWebview.viewType`.
 */
export function createMigrationEventHandler(command: Command): CopilotEventHandler {
    return (event: ChatNotify) => {
        // Route all events through the migration-panel notification channel
        sendMigrationPanelNotification(event);
    };
}

/**
 * Event handler factory that routes agent/executor events to the AI Chat panel.
 * Used when the user starts migration enhancement directly from AI Chat (static project).
 */
export function createAIPanelMigrationEventHandler(command: Command): CopilotEventHandler {
    return (event: ChatNotify) => {
        sendAIPanelNotification(event);
    };
}

/**
 * Event handler factory that routes agent/executor events to the Visualizer
 * webview.  Used for the wizard-level migration AI enhancement so the
 * ImportIntegration wizard can show live streaming progress before the project
 * is opened in VS Code.
 */
export function createVisualizerMigrationEventHandler(command: Command): CopilotEventHandler {
    return (event: ChatNotify) => {
        sendVisualizerMigrationNotification(event);
    };
}
