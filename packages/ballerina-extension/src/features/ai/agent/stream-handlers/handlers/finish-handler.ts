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

import { StreamEventHandler, StreamFinishException } from "../stream-event-handler";
import { StreamContext } from "../stream-context";
import { Command } from "@wso2/ballerina-core";
import { checkCompilationErrors } from "../../tools/diagnostics-utils";
import { updateAndSaveChat } from "../../../utils/events";
import { runtimeStateManager } from "../../../state/RuntimeStateManager";

/**
 * Handles finish events from the stream.
 * Runs diagnostics and updates generation review state in chatStateStorage.
 */
export class FinishHandler implements StreamEventHandler {
    readonly eventType = "finish";

    canHandle(eventType: string): boolean {
        return eventType === this.eventType;
    }

    async handle(part: any, context: StreamContext): Promise<void> {
        const finalResponse = await context.response;
        const assistantMessages = finalResponse.messages || [];

        // Run final diagnostics
        const finalDiagnostics = await checkCompilationErrors(context.tempProjectPath);
        context.eventHandler({
            type: "diagnostics",
            diagnostics: finalDiagnostics.diagnostics
        });

        // Import chatStateStorage
        const { chatStateStorage } = await import('../../../../../views/ai-panel/chatStateStorage');

        // Get workspace ID and thread ID
        const workspaceId = context.ctx.projectPath;
        const threadId = 'default';

        // Update generation review state in storage
        chatStateStorage.updateReviewState(workspaceId, threadId, context.messageId, {
            status: 'under_review',
            tempProjectPath: context.tempProjectPath,
            modifiedFiles: context.modifiedFiles,
        });

        // Update generation with model messages
        chatStateStorage.updateGeneration(workspaceId, threadId, context.messageId, {
            modelMessages: assistantMessages,
        });

        console.log(`[FinishHandler] Updated generation ${context.messageId} review state to 'under_review'`);

        // Show review actions component in the chat UI
        runtimeStateManager.setShowReviewActions(true);
        context.eventHandler({ type: "review_actions" });

        // Update and save chat
        updateAndSaveChat(context.messageId, Command.Agent, context.eventHandler);
        context.eventHandler({ type: "stop", command: Command.Agent });

        // Throw exception to exit stream loop and return tempProjectPath
        throw new StreamFinishException(context.tempProjectPath);
    }
}
