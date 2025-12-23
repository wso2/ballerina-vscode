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

import { StreamEventHandler, StreamAbortException } from "../stream-event-handler";
import { StreamContext } from "../stream-context";
import { Command, AIChatMachineEventType } from "@wso2/ballerina-core";
import { AIChatStateMachine } from "../../../../../views/ai-panel/aiChatMachine";
import { sendAgentDidCloseForProjects } from "../../../utils/project/ls-schema-notifications";
import { cleanupTempProject } from "../../../utils/project/temp-project";
import { updateAndSaveChat } from "../../../utils/events";
import { clearPendingReviewContext, getPendingReviewContext } from "./finish-handler";

/**
 * Handles abort events from the stream.
 * Saves partial state and performs cleanup.
 */
export class AbortHandler implements StreamEventHandler {
    readonly eventType = "abort";

    canHandle(eventType: string): boolean {
        return eventType === this.eventType;
    }

    async handle(part: any, context: StreamContext): Promise<void> {
        console.log("[Agent] Aborted by user.");

        // Get message history from SDK's response.messages
        let messagesToSave: any[] = [];
        try {
            const partialResponse = await context.response;
            messagesToSave = partialResponse.messages || [];
        } catch (error) {
            console.warn("[AbortHandler] Could not retrieve partial response messages:", error);
            messagesToSave = [];
        }

        // Add user message to inform about abort and file reversion
        messagesToSave.push({
            role: "user",
            content: `<abort_notification>
Generation stopped by user. The last in-progress task was not saved. Files have been reverted to the previous completed task state. Please redo the last task if needed.
</abort_notification>`,
        });

        if (context.shouldCleanup) {
            sendAgentDidCloseForProjects(context.tempProjectPath, context.projects);
            cleanupTempProject(context.tempProjectPath);
        }

        // Clear pending review context if it exists and matches this temp project
        const pendingReview = getPendingReviewContext();
        if (pendingReview && pendingReview.tempProjectPath === context.tempProjectPath) {
            console.log("[Abort Handler] Clearing review context due to abort");
            clearPendingReviewContext();
        }

        updateAndSaveChat(context.messageId, Command.Agent, context.eventHandler);
        context.eventHandler({ type: "abort", command: Command.Agent });
        AIChatStateMachine.sendEvent({
            type: AIChatMachineEventType.FINISH_EXECUTION,
        });

        // Throw exception to exit stream loop and return tempProjectPath
        throw new StreamAbortException(context.tempProjectPath);
    }
}
