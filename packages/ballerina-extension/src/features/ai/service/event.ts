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
import { sendContentAppendNotification, sendContentReplaceNotification, sendDiagnosticMessageNotification, sendErrorNotification, sendMessagesNotification, sendMessageStartNotification, sendMessageStopNotification, sendIntermidateStateNotification, sendToolCallNotification, sendToolResultNotification, sendTaskApprovalRequestNotification, sendAbortNotification, sendSaveChatNotification, sendGeneratedSourcesNotification, sendConnectorGenerationNotification } from "./utils";

export type CopilotEventHandler = (event: ChatNotify) => void;

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
                sendToolCallNotification(event.toolName, event.toolInput);
                break;
            case "tool_result":
                sendToolResultNotification(event.toolName, event.toolOutput);
                break;
            case "task_approval_request":
                console.log("[Event Handler] Task approval request received:", event);
                sendTaskApprovalRequestNotification(
                    event.approvalType,
                    event.tasks,
                    event.taskDescription,
                    event.message
                );
                break;
            case "evals_tool_result":
            case "usage_metrics":
                // Ignore evals-specific events in webview
                break;
            case "diagnostics":
                sendDiagnosticMessageNotification(event.diagnostics);
                break;
            case "connector_generation_notification":
                sendConnectorGenerationNotification(event);
                break;
            default:
                console.warn(`Unhandled event type: ${event}`);
                break;
        }
    };
}
