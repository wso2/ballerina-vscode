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
import { extension } from '../../BalExtensionContext';
import { generateProjectId } from './idGenerators';

const CHAT_STATE_STORAGE_KEY_PREFIX = 'ballerina.ai.chat.state';

/**
 * Gets the storage key for the current project
 * @param projectId The project identifier
 * @returns The storage key for this project
 */
export const getStorageKey = (projectId: string): string => {
    return `${CHAT_STATE_STORAGE_KEY_PREFIX}.${projectId}`;
};

/**
 * Saves the chat state for the current project
 * @param context The chat machine context
 */
export const saveChatState = (context: AIChatMachineContext): void => {
    try {
        if (!context.projectId) {
            console.warn("No project ID available, skipping state save");
            return;
        }

        const stateToSave = {
            chatHistory: context.chatHistory,
            currentPlan: context.currentPlan,
            currentTaskIndex: context.currentTaskIndex,
            sessionId: context.sessionId,
            projectId: context.projectId,
            checkpoints: context.checkpoints || [],
            savedAt: Date.now(),
        };

        const storageKey = getStorageKey(context.projectId);
        extension.context?.globalState.update(storageKey, stateToSave);

        // Also save a list of all project IDs for management purposes
        const allProjectIds =
            extension.context?.globalState.get<string[]>(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`) || [];
        if (!allProjectIds.includes(context.projectId)) {
            allProjectIds.push(context.projectId);
            extension.context?.globalState.update(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`, allProjectIds);
        }
    } catch (error) {
        console.error("Failed to save chat state:", error);
    }
};

/**
 * Clears the chat state for a specific project (action version for state machine)
 * @param context The chat machine context
 */
export const clearChatStateAction = (context: AIChatMachineContext): void => {
    try {
        if (!context.projectId) {
            console.warn('No project ID available, skipping state clear');
            return;
        }

        const storageKey = getStorageKey(context.projectId);
        extension.context?.globalState.update(storageKey, undefined);
        console.log(`Cleared chat state for project: ${context.projectId}`);
    } catch (error) {
        console.error('Failed to clear chat state:', error);
    }
};

/**
 * Loads the chat state for the current project
 * @param projectId Optional project ID. If not provided, uses current workspace
 * @returns The saved chat state or undefined
 */
export const loadChatState = async (projectId?: string): Promise<AIChatMachineContext | undefined> => {
    try {
        const targetProjectId = projectId || generateProjectId();
        const storageKey = getStorageKey(targetProjectId);
        const savedState = extension.context?.globalState.get<AIChatMachineContext & { savedAt?: number }>(storageKey);

        if (savedState) {
            console.log(`Loaded chat state for project: ${targetProjectId}, saved at: ${savedState.savedAt ? new Date(savedState.savedAt).toISOString() : 'unknown'}`);
        }

        return savedState;
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
        const storageKey = getStorageKey(targetProjectId);
        await extension.context?.globalState.update(storageKey, undefined);
        console.log(`Cleared chat state for project: ${targetProjectId}`);
    } catch (error) {
        console.error('Failed to clear chat state:', error);
    }
};

/**
 * Gets all project IDs that have saved chat states
 * @returns Array of project IDs
 */
export const getAllProjectIds = async (): Promise<string[]> => {
    try {
        return extension.context?.globalState.get<string[]>(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`) || [];
    } catch (error) {
        console.error('Failed to get project IDs:', error);
        return [];
    }
};

/**
 * Clears all chat states for all projects
 */
export const clearAllChatStates = async (): Promise<void> => {
    try {
        const projectIds = await getAllProjectIds();

        for (const projectId of projectIds) {
            await clearChatState(projectId);
        }

        // Clear the projects list
        await extension.context?.globalState.update(`${CHAT_STATE_STORAGE_KEY_PREFIX}.projects`, []);
        console.log('Cleared all chat states');
    } catch (error) {
        console.error('Failed to clear all chat states:', error);
    }
};

/**
 * Gets metadata about saved chat states
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
        const projectIds = await getAllProjectIds();
        const metadata = [];

        for (const projectId of projectIds) {
            const state = await loadChatState(projectId);
            if (state) {
                const savedState = state as AIChatMachineContext & { savedAt?: number };
                metadata.push({
                    projectId,
                    savedAt: savedState.savedAt,
                    sessionId: savedState.sessionId,
                    taskCount: savedState.currentPlan?.tasks.length || 0,
                });
            }
        }

        return metadata;
    } catch (error) {
        console.error('Failed to get chat state metadata:', error);
        return [];
    }
};
