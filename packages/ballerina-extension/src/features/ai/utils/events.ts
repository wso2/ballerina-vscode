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

import { ChatNotify, Command } from "@wso2/ballerina-core";
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
    sendAbortNotification,
    sendSaveChatNotification,
    sendConnectorGenerationNotification,
    sendConfigurationCollectionNotification,
    sendReviewActionsNotification,
} from "./ai-utils";

export type CopilotEventHandler = (event: ChatNotify) => void;

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
                sendToolResultNotification(event.toolName, event.toolOutput, event.toolCallId);
                break;
            case "task_approval_request":
                console.log("[Event Handler] Task approval request received:", event);
                sendTaskApprovalRequestNotification(
                    event.approvalType,
                    event.tasks,
                    event.taskDescription,
                    event.message,
                    event.requestId
                );
                break;
            case "evals_tool_result":
            case "usage_metrics":
                // Ignore evals-specific events in webview
                break;
            case "diagnostics":
                sendDiagnosticMessageNotification(event.diagnostics);
                break;
            case "review_actions":
                sendReviewActionsNotification();
                break;
            case "connector_generation_notification":
                sendConnectorGenerationNotification(event);
                break;
            case "configuration_collection_event":
                sendConfigurationCollectionNotification(event);
                break;
            default:
                console.warn(`Unhandled event type: ${event}`);
                break;
        }
    };
}
