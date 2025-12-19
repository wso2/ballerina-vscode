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

import { AIChatMachineContext, Checkpoint, Plan, ChatMessage } from '@wso2/ballerina-core/lib/state-machine-types';

/**
 * Session-only storage for ChatState
 * Data is stored in memory and cleared when VSCode window closes
 */

interface StoredChatState {
    chatHistory: ChatMessage[];
    currentPlan?: Plan;
    currentTaskIndex: number;
    sessionId?: string;
    projectId: string;
    checkpoints: Checkpoint[];
    savedAt: number;
}

class ChatStateSessionStorage {
    // In-memory storage map: projectId -> ChatState
    private storage: Map<string, StoredChatState> = new Map();

    /**
     * Save chat state for a project
     */
    save(projectId: string, context: AIChatMachineContext): void {
        const stateToSave: StoredChatState = {
            chatHistory: context.chatHistory,
            currentPlan: context.currentPlan,
            currentTaskIndex: context.currentTaskIndex,
            sessionId: context.sessionId,
            projectId: context.projectId || projectId,
            checkpoints: context.checkpoints || [],
            savedAt: Date.now(),
        };

        this.storage.set(projectId, stateToSave);
    }

    /**
     * Load chat state for a project
     */
    load(projectId: string): StoredChatState | undefined {
        return this.storage.get(projectId);
    }

    /**
     * Clear state for a specific project
     */
    clear(projectId: string): void {
        this.storage.delete(projectId);
    }

    /**
     * Clear all stored states
     */
    clearAll(): void {
        this.storage.clear();
    }

    /**
     * Get all project IDs with saved states
     */
    getAllProjectIds(): string[] {
        return Array.from(this.storage.keys());
    }

    /**
     * Get memory usage statistics
     */
    getStats(): { projectCount: number; totalCheckpoints: number; estimatedSizeMB: number } {
        let totalCheckpoints = 0;
        let estimatedSize = 0;

        for (const state of this.storage.values()) {
            totalCheckpoints += state.checkpoints?.length || 0;
            // Rough estimate of size
            estimatedSize += JSON.stringify(state).length;
        }

        return {
            projectCount: this.storage.size,
            totalCheckpoints,
            estimatedSizeMB: estimatedSize / (1024 * 1024)
        };
    }
}

// Singleton instance
export const sessionStorage = new ChatStateSessionStorage();
