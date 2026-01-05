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

import { AIChatMachineContext } from '@wso2/ballerina-core/lib/state-machine-types';
import { generateProjectId } from './idGenerators';
import { sessionStorage } from './chatStateStorage';
import { getPendingReviewContext, clearPendingReviewContext } from '../../features/ai/agent/stream-handlers/handlers/finish-handler';
import { sendAgentDidCloseForProjects } from '../../features/ai/utils/project/ls-schema-notifications';
import { cleanupTempProject } from '../../features/ai/utils/project/temp-project';

/**
 * Saves the chat state for the current project (session-only storage)
 * @param context The chat machine context
 */
export const saveChatState = (context: AIChatMachineContext): void => {
    try {
        if (!context.projectId) {
            console.warn("No project ID available, skipping state save");
            return;
        }

        // Save to in-memory session storage instead of globalState
        sessionStorage.save(context.projectId, context);

        console.log(`Saved chat state for project: ${context.projectId} (session-only)`);
    } catch (error) {
        console.error("Failed to save chat state:", error);
    }
};

/**
 * Clears the chat state for a specific project (action version for state machine)
 * Also cleans up review context, temp directory, and language server notifications
 * @param context The chat machine context
 */
export const clearChatStateAction = (context: AIChatMachineContext): void => {
    try {
        if (!context.projectId) {
            console.warn('No project ID available, skipping state clear');
            return;
        }

        // Clear session storage
        sessionStorage.clear(context.projectId);
        console.log(`Cleared chat state for project: ${context.projectId}`);

        // Cleanup review context and temp directory if exists
        const pendingReview = getPendingReviewContext();
        if (pendingReview) {
            console.log('[Clear Chat] Cleaning up pending review context and temp directory');
            
            // Close all files in language server
            sendAgentDidCloseForProjects(pendingReview.tempProjectPath, pendingReview.projects);
            
            // Wait a bit for LS to process
            setTimeout(() => {
                // Cleanup temp directory
                if (pendingReview.shouldCleanup) {
                    cleanupTempProject(pendingReview.tempProjectPath);
                    console.log('[Clear Chat] Cleaned up temp directory:', pendingReview.tempProjectPath);
                }
                
                // Clear the review context
                clearPendingReviewContext();
                console.log('[Clear Chat] Cleared review context');
            }, 300);
        }
    } catch (error) {
        console.error('Failed to clear chat state:', error);
    }
};

/**
 * Loads the chat state for the current project (from session storage)
 * @param projectId Optional project ID. If not provided, uses current workspace
 * @returns The saved chat state or undefined
 */
export const loadChatState = async (projectId?: string): Promise<AIChatMachineContext | undefined> => {
    try {
        const targetProjectId = projectId || generateProjectId();
        const savedState = sessionStorage.load(targetProjectId);

        if (savedState) {
            console.log(`Loaded chat state for project: ${targetProjectId} (from current session), saved at: ${new Date(savedState.savedAt).toISOString()}`);
            return savedState as unknown as AIChatMachineContext;
        }

        console.log(`No session state found for project: ${targetProjectId}`);
        return undefined;
    } catch (error) {
        console.error('Failed to load chat state:', error);
        return undefined;
    }
};

/**
 * Clears the chat state for a specific project or current project
 * @param projectId Optional project ID. If not provided, uses current workspace
 */
export const clearChatState = async (projectId?: string): Promise<void> => {
    try {
        const targetProjectId = projectId || generateProjectId();
        sessionStorage.clear(targetProjectId);
        console.log(`Cleared chat state for project: ${targetProjectId}`);
    } catch (error) {
        console.error('Failed to clear chat state:', error);
    }
};

/**
 * Gets all project IDs that have saved chat states (from session storage)
 * @returns Array of project IDs
 */
export const getAllProjectIds = async (): Promise<string[]> => {
    try {
        return sessionStorage.getAllProjectIds();
    } catch (error) {
        console.error('Failed to get project IDs:', error);
        return [];
    }
};

/**
 * Clears all chat states for all projects (from session storage)
 */
export const clearAllChatStates = async (): Promise<void> => {
    try {
        const projectIds = await getAllProjectIds();
        console.log(`Clearing chat states for ${projectIds.length} project(s): ${projectIds.join(', ')}`);

        sessionStorage.clearAll();
        console.log('Cleared all chat states');
    } catch (error) {
        console.error('Failed to clear all chat states:', error);
    }
};

/**
 * Gets metadata about saved chat states (from session storage)
 * @returns Array of project metadata
 */
export const getChatStateMetadata = async (): Promise<Array<{
    projectId: string;
    workspacePath?: string;
    savedAt?: number;
    sessionId?: string;
    taskCount?: number;
}>> => {
    try {
        const projectIds = sessionStorage.getAllProjectIds();
        const metadata = [];

        for (const projectId of projectIds) {
            const state = sessionStorage.load(projectId);
            if (state) {
                metadata.push({
                    projectId,
                    savedAt: state.savedAt,
                    sessionId: state.sessionId,
                    taskCount: state.currentPlan?.tasks.length || 0,
                });
            }
        }

        return metadata;
    } catch (error) {
        console.error('Failed to get chat state metadata:', error);
        return [];
    }
};
