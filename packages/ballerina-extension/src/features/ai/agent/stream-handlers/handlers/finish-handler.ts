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
import { Command, AIChatMachineEventType, ExecutionContext } from "@wso2/ballerina-core";
import { AIChatStateMachine } from "../../../../../views/ai-panel/aiChatMachine";
import { checkCompilationErrors } from "../../../tools/diagnostics-utils";
import { integrateCodeToWorkspace } from "../../utils";
import { sendAgentDidCloseForProjects } from "../../../utils/project/ls-schema-notifications";
import { cleanupTempProject } from "../../../utils/project/temp-project";
import { updateAndSaveChat } from "../../../utils/events";

/**
 * Stored context data for code review actions
 * This is used by RPC methods to access temp project data after stream finishes
 */
interface ReviewContext {
    tempProjectPath: string;
    modifiedFiles: string[];
    ctx: ExecutionContext;
    projects: any[];
    shouldCleanup: boolean;
    timestamp: number;  // Track when this context was created
    messageId: string;  // Track which message this belongs to
}

/**
 * Module-level storage for pending review context.
 * Note: This persists for the lifetime of the extension process.
 * Only one review context is stored at a time (latest wins).
 */
let pendingReviewContext: ReviewContext | null = null;
let autoCleanupTimer: NodeJS.Timeout | null = null;

// Auto-expire timeout in milliseconds (30 minutes)
const AUTO_EXPIRE_MS = 30 * 60 * 1000;

/**
 * Automatically cleanup expired review context
 */
function scheduleAutoCleanup(): void {
    // Clear any existing timer
    if (autoCleanupTimer) {
        clearTimeout(autoCleanupTimer);
    }

    // Schedule cleanup after expiration time
    autoCleanupTimer = setTimeout(() => {
        if (pendingReviewContext) {
            const ageInMinutes = (Date.now() - pendingReviewContext.timestamp) / 1000 / 60;
            console.warn(`[Review Context] Auto-cleaning expired context (age: ${ageInMinutes.toFixed(1)} minutes) for message: ${pendingReviewContext.messageId}`);
            
            // Cleanup temp project if it still exists
            if (pendingReviewContext.shouldCleanup) {
                try {
                    cleanupTempProject(pendingReviewContext.tempProjectPath);
                } catch (error) {
                    console.error("[Review Context] Error during auto-cleanup:", error);
                }
            }
            
            pendingReviewContext = null;
        }
        autoCleanupTimer = null;
    }, AUTO_EXPIRE_MS);
}

export function getPendingReviewContext(): ReviewContext | null {
    if (pendingReviewContext) {
        const ageInMinutes = (Date.now() - pendingReviewContext.timestamp) / 1000 / 60;
        
        // Check if context has expired
        if (ageInMinutes > 30) {
            console.warn(`[Review Context] Context expired (age: ${ageInMinutes.toFixed(1)} minutes) - clearing automatically`);
            clearPendingReviewContext();
            return null;
        }
    } else {
        console.log("[Review Context] No pending context found");
    }
    return pendingReviewContext;
}

export function clearPendingReviewContext(): void {
    if (pendingReviewContext) {
        console.log(`[Review Context] Clearing context for message: ${pendingReviewContext.messageId}`);
        pendingReviewContext = null;
    }
    
    // Clear the auto-cleanup timer
    if (autoCleanupTimer) {
        clearTimeout(autoCleanupTimer);
        autoCleanupTimer = null;
    }
}

export function setPendingReviewContext(context: ReviewContext): void {
    if (pendingReviewContext) {
        console.warn(`[Review Context] Overwriting existing context for message: ${pendingReviewContext.messageId} with new context for message: ${context.messageId}`);
        
        // Cleanup old context's temp project if needed
        if (pendingReviewContext.shouldCleanup && pendingReviewContext.tempProjectPath !== context.tempProjectPath) {
            try {
                cleanupTempProject(pendingReviewContext.tempProjectPath);
            } catch (error) {
                console.error("[Review Context] Error cleaning up old context:", error);
            }
        }
    }
    
    pendingReviewContext = context;
    
    // Schedule automatic cleanup
    scheduleAutoCleanup();
}

/**
 * Cleanup function to be called when extension deactivates
 * Should be registered in the extension's deactivate() function
 */
export function cleanupOnExtensionDeactivate(): void {
    console.log("[Review Context] Extension deactivating - cleaning up pending review context");
    
    if (autoCleanupTimer) {
        clearTimeout(autoCleanupTimer);
        autoCleanupTimer = null;
    }
    
    if (pendingReviewContext) {
        if (pendingReviewContext.shouldCleanup) {
            try {
                cleanupTempProject(pendingReviewContext.tempProjectPath);
            } catch (error) {
                console.error("[Review Context] Error during extension deactivation cleanup:", error);
            }
        }
        pendingReviewContext = null;
    }
}

/**
 * Closes all documents in the temp project and waits for LS to process
 */
async function closeAllDocumentsAndWait(tempProjectPath: string, projects: any[]): Promise<void> {
    sendAgentDidCloseForProjects(tempProjectPath, projects);
    await new Promise(resolve => setTimeout(resolve, 300));
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

        // Store context data for later use by accept/decline/review actions
        // This will be used by RPC methods to access temp project data
        setPendingReviewContext({
            tempProjectPath: context.tempProjectPath,
            modifiedFiles: context.modifiedFiles,
            ctx: context.ctx,
            projects: context.projects,
            shouldCleanup: context.shouldCleanup,
            timestamp: Date.now(),
            messageId: context.messageId,
        });

        // Show review actions component in the chat UI via state machine
        AIChatStateMachine.sendEvent({
            type: AIChatMachineEventType.SHOW_REVIEW_ACTIONS,
        });

        // Update and save chat
        updateAndSaveChat(context.messageId, Command.Agent, context.eventHandler);
        context.eventHandler({ type: "stop", command: Command.Agent });
        AIChatStateMachine.sendEvent({
            type: AIChatMachineEventType.FINISH_EXECUTION,
        });

        // Throw exception to exit stream loop and return tempProjectPath
        throw new StreamFinishException(context.tempProjectPath);
    }
}
