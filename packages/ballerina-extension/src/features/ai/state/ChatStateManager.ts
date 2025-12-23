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

import { sessionStorage, StoredChatState } from '../../../views/ai-panel/chatStateStorage';
import { Checkpoint, ChatMessage, AIChatMachineContext } from '@wso2/ballerina-core/lib/state-machine-types';
import { captureWorkspaceSnapshot, restoreWorkspaceSnapshot } from '../../../views/ai-panel/checkpoint/checkpointUtils';
import { getCheckpointConfig } from '../../../views/ai-panel/checkpoint/checkpointConfig';
import { notifyCheckpointCaptured } from '../../../RPCLayer';

/**
 * ChatStateManager - Global singleton for managing chat state and checkpoints
 *
 * Internally project-scoped using Map<projectId, state> for thread-safe parallel testing.
 * Wraps existing ChatStateSessionStorage and adds checkpoint management.
 */
export class ChatStateManager {
    private static instance: ChatStateManager;

    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): ChatStateManager {
        if (!ChatStateManager.instance) {
            ChatStateManager.instance = new ChatStateManager();
        }
        return ChatStateManager.instance;
    }

    // ============================================
    // Chat State Management
    // ============================================

    /**
     * Save chat state for a project
     * @param projectId - Project identifier (typically hash of workspace path)
     * @param context - AI chat machine context to save
     */
    saveState(projectId: string, context: AIChatMachineContext): void {
        sessionStorage.save(projectId, context);
    }

    /**
     * Load chat state for a project
     * @param projectId - Project identifier
     * @returns Stored chat state or undefined if not found
     */
    loadState(projectId: string): StoredChatState | undefined {
        return sessionStorage.load(projectId);
    }

    /**
     * Clear chat state for a specific project
     * @param projectId - Project identifier
     */
    clearState(projectId: string): void {
        sessionStorage.clear(projectId);
    }

    /**
     * Clear all chat states across all projects
     */
    clearAllStates(): void {
        sessionStorage.clearAll();
    }

    /**
     * Get all project IDs with saved states
     */
    getAllProjectIds(): string[] {
        return sessionStorage.getAllProjectIds();
    }

    /**
     * Get memory usage statistics
     */
    getStats(): { projectCount: number; totalCheckpoints: number; estimatedSizeMB: number } {
        return sessionStorage.getStats();
    }

    // ============================================
    // Checkpoint Management
    // ============================================

    /**
     * Capture a checkpoint of the current workspace state
     * @param messageId - Message ID to link checkpoint to
     * @returns Promise resolving to checkpoint or null if disabled/failed
     */
    async captureCheckpoint(messageId: string): Promise<Checkpoint | null> {
        try {
            const checkpoint = await captureWorkspaceSnapshot(messageId);
            if (checkpoint) {
                console.log(`[ChatStateManager] Checkpoint captured: ${checkpoint.id} for message ${messageId}`);
            }
            return checkpoint;
        } catch (error) {
            console.error('[ChatStateManager] Failed to capture checkpoint:', error);
            return null;
        }
    }

    /**
     * Restore workspace to a checkpoint state
     * @param checkpoint - Checkpoint to restore
     */
    async restoreCheckpoint(checkpoint: Checkpoint): Promise<void> {
        console.log(`[ChatStateManager] Restoring checkpoint: ${checkpoint.id}`);
        await restoreWorkspaceSnapshot(checkpoint);
    }

    /**
     * Cleanup old checkpoints keeping only the most recent maxCount
     * @param checkpoints - Array of checkpoints
     * @returns Cleaned up array of checkpoints
     */
    cleanupOldCheckpoints(checkpoints: Checkpoint[]): Checkpoint[] {
        const config = getCheckpointConfig();
        if (checkpoints.length <= config.maxCount) {
            return checkpoints;
        }
        return checkpoints.slice(-config.maxCount);
    }

    /**
     * Add checkpoint to chat context and cleanup old ones
     * @param context - Chat context to update
     * @param checkpoint - Checkpoint to add
     * @param messageId - Message ID to link checkpoint to
     */
    addCheckpointToContext(
        context: AIChatMachineContext,
        checkpoint: Checkpoint,
        messageId: string
    ): void {
        // Find the message and link checkpoint
        const message = context.chatHistory.find(m => m.id === messageId);
        if (message) {
            message.checkpointId = checkpoint.id;
        }

        // Add checkpoint and cleanup old ones
        const updatedCheckpoints = this.cleanupOldCheckpoints([
            ...(context.checkpoints || []),
            checkpoint
        ]);
        context.checkpoints = updatedCheckpoints;

        // Save updated context
        if (context.projectId) {
            this.saveState(context.projectId, context);
        }

        // Notify frontend
        notifyCheckpointCaptured({
            messageId,
            checkpointId: checkpoint.id
        });
    }

    /**
     * Restore chat context to a checkpoint state
     * @param context - Chat context to restore
     * @param checkpointId - Checkpoint ID to restore to
     * @returns true if restored, false if checkpoint not found
     */
    async restoreContextToCheckpoint(
        context: AIChatMachineContext,
        checkpointId: string
    ): Promise<boolean> {
        const checkpoint = context.checkpoints?.find(c => c.id === checkpointId);

        if (!checkpoint) {
            console.error(`[ChatStateManager] Checkpoint ${checkpointId} not found`);
            return false;
        }

        // Find message index to truncate history
        const messageIndex = context.chatHistory.findIndex(m => m.id === checkpoint.messageId);
        const restoredHistory = messageIndex >= 0
            ? context.chatHistory.slice(0, messageIndex)
            : context.chatHistory;

        // Find checkpoint index to truncate checkpoints
        const checkpointIndex = context.checkpoints?.findIndex(c => c.id === checkpointId) || 0;
        const restoredCheckpoints = checkpointIndex >= 0
            ? (context.checkpoints?.slice(0, checkpointIndex) || [])
            : (context.checkpoints || []);

        // Update context
        context.chatHistory = restoredHistory;
        context.checkpoints = restoredCheckpoints;
        context.currentPlan = undefined;
        context.currentTaskIndex = -1;

        // Save updated context
        if (context.projectId) {
            this.saveState(context.projectId, context);
        }

        // Restore workspace
        await this.restoreCheckpoint(checkpoint);

        return true;
    }
}

// Export singleton instance for convenience
export const chatStateManager = ChatStateManager.getInstance();
