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

import { StreamEventHandler, StreamFinishException } from "./stream-event-handler";
import { StreamContext } from "./stream-context";
import { Command, AIChatMachineEventType } from "@wso2/ballerina-core";
import { AIChatStateMachine } from "../../../../../views/ai-panel/aiChatMachine";
import { checkCompilationErrors } from "../../libs/diagnostics_utils";
import { integrateCodeToWorkspace } from "../utils";
import { sendAgentDidCloseForProjects } from "../../libs/agent_ls_notification_utils";
import { cleanupTempProject } from "../../../utils/project-utils";

/**
 * Closes all documents in the temp project and waits for LS to process
 */
async function closeAllDocumentsAndWait(tempProjectPath: string, projects: any[]): Promise<void> {
    sendAgentDidCloseForProjects(tempProjectPath, projects);
    await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * Updates chat message with model messages and triggers save
 */
function updateAndSaveChat(
    messageId: string,
    userMessageContent: any,
    assistantMessages: any[],
    eventHandler: any
): void {
    const completeMessages = [
        {
            role: "user",
            content: userMessageContent,
        },
        ...assistantMessages
    ];

    AIChatStateMachine.sendEvent({
        type: AIChatMachineEventType.UPDATE_CHAT_MESSAGE,
        payload: {
            id: messageId,
            modelMessages: completeMessages,
        },
    });

    eventHandler({ type: "save_chat", command: Command.Design, messageId });
}

/**
 * Handles finish events from the stream.
 * Runs diagnostics, integrates code to workspace, and performs cleanup.
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

        // Integrate code to workspace if not in test mode
        if (!process.env.AI_TEST_ENV && context.modifiedFiles.length > 0) {
            const modifiedFilesSet = new Set(context.modifiedFiles);
            await integrateCodeToWorkspace(context.tempProjectPath, modifiedFilesSet, context.ctx);
        }

        // Cleanup
        await closeAllDocumentsAndWait(context.tempProjectPath, context.projects);
        if (context.shouldCleanup) {
            cleanupTempProject(context.tempProjectPath);
        }

        // Update and save chat
        updateAndSaveChat(context.messageId, context.userMessageContent, assistantMessages, context.eventHandler);
        context.eventHandler({ type: "stop", command: Command.Design });
        AIChatStateMachine.sendEvent({
            type: AIChatMachineEventType.FINISH_EXECUTION,
        });

        // Throw exception to exit stream loop and return tempProjectPath
        throw new StreamFinishException(context.tempProjectPath);
    }
}
