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

import {
    WorkspaceChatState,
    ChatThread,
    Generation,
    GenerationMetadata,
    GenerationReviewState,
    Checkpoint,
} from '@wso2/ballerina-core/lib/state-machine-types';
import { Command } from '@wso2/ballerina-core';
import * as crypto from 'crypto';
import { approvalManager } from '../../features/ai/state/ApprovalManager';

/**
 * Active execution handle
 * Tracks running AI operations for abort functionality
 */
export interface ActiveExecution {
    generationId: string;              // For logging and correlation with generation
    abortController: AbortController;  // For actual abort operation
}

/**
 * Thread-based ChatStateStorage
 *
 * Single source of truth for all copilot chat state.
 * Stores workspace -> threads -> generations hierarchy.
 * Session-only storage (cleared when VSCode closes).
 */
export class ChatStateStorage {
    // In-memory storage: workspaceId -> WorkspaceChatState
    private storage: Map<string, WorkspaceChatState> = new Map();

    // Track active executions per workspace/thread for abort functionality
    private activeExecutions: Map<string, Map<string, ActiveExecution>> = new Map();

    // ============================================
    // Workspace Management
    // ============================================

    /**
     * Initialize workspace state (creates default thread if needed)
     * @param workspaceId Workspace identifier
     * @returns Workspace state
     */
    initializeWorkspace(workspaceId: string): WorkspaceChatState {
        let workspaceState = this.storage.get(workspaceId);

        if (!workspaceState) {
            // Create default thread
            const defaultThread: ChatThread = {
                id: 'default',
                name: 'Default Thread',
                generations: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };

            workspaceState = {
                workspaceId,
                threads: new Map([[defaultThread.id, defaultThread]]),
                activeThreadId: defaultThread.id,
            };

            this.storage.set(workspaceId, workspaceState);
            console.log(`[ChatStateStorage] Initialized workspace: ${workspaceId} with default thread`);
        }

        return workspaceState;
    }

    /**
     * Get workspace state
     * @param workspaceId Workspace identifier
     * @returns Workspace state or undefined
     */
    getWorkspaceState(workspaceId: string): WorkspaceChatState | undefined {
        return this.storage.get(workspaceId);
    }

    /**
     * Clear workspace state
     * Cleans up any pending review temp projects before clearing.
     * @param workspaceId Workspace identifier
     */
    async clearWorkspace(workspaceId: string): Promise<void> {
        // Cleanup pending review temp projects before clearing
        const workspace = this.storage.get(workspaceId);
        if (workspace) {
            for (const [threadId, thread] of workspace.threads) {
                const pendingReview = this.getPendingReviewGeneration(workspaceId, threadId);
                if (pendingReview?.reviewState.tempProjectPath) {
                    console.log(`[ChatStateStorage] Cleaning up pending review temp project: ${pendingReview.reviewState.tempProjectPath}`);

                    // Cleanup temp directory
                    if (!process.env.AI_TEST_ENV) {
                        const { cleanupTempProject } = require('../../features/ai/utils/project/temp-project');
                        try {
                            await cleanupTempProject(pendingReview.reviewState.tempProjectPath);
                        } catch (error) {
                            console.error(`[ChatStateStorage] Error cleaning up temp project:`, error);
                        }
                    }
                }
            }
        }

        this.storage.delete(workspaceId);
        console.log(`[ChatStateStorage] Cleared workspace: ${workspaceId}`);
    }

    /**
     * Clear all workspace states
     * Cleans up temp projects for each workspace before clearing.
     */
    async clearAll(): Promise<void> {
        // Clear each workspace individually to trigger cleanup logic
        const workspaceIds = Array.from(this.storage.keys());
        await Promise.all(workspaceIds.map(workspaceId => this.clearWorkspace(workspaceId)));
        console.log('[ChatStateStorage] Cleared all workspaces');
    }

    // ============================================
    // Thread Management (Minimal)
    // ============================================

    /**
     * Get or create a thread by ID
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @returns Thread
     */
    getOrCreateThread(workspaceId: string, threadId: string): ChatThread {
        const workspace = this.initializeWorkspace(workspaceId);
        let thread = workspace.threads.get(threadId);

        if (!thread) {
            thread = {
                id: threadId,
                name: threadId === 'default' ? 'Default Thread' : `Thread ${threadId}`,
                generations: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            workspace.threads.set(threadId, thread);
            workspace.activeThreadId = threadId;
            console.log(`[ChatStateStorage] Created thread: ${threadId} in workspace: ${workspaceId}`);
        }

        return thread;
    }

    /**
     * Get active thread
     * @param workspaceId Workspace identifier
     * @returns Active thread or undefined
     */
    getActiveThread(workspaceId: string): ChatThread | undefined {
        const workspace = this.storage.get(workspaceId);
        if (!workspace) {
            return undefined;
        }
        return workspace.threads.get(workspace.activeThreadId);
    }

    // ============================================
    // Generation Management
    // ============================================

    /**
     * Add a new generation to a thread
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param userPrompt User's prompt
     * @param metadata Generation metadata
     * @param id Optional generation ID (if not provided, generates new one)
     * @returns Created generation
     */
    addGeneration(
        workspaceId: string,
        threadId: string,
        userPrompt: string,
        metadata: Partial<GenerationMetadata>,
        id?: string
    ): Generation {
        const thread = this.getOrCreateThread(workspaceId, threadId);

        const generation: Generation = {
            id: id || this.generateId(),
            userPrompt,
            modelMessages: [],
            uiResponse: '',
            timestamp: Date.now(),
            reviewState: {
                status: 'pending',
                modifiedFiles: [],
            },
            currentTaskIndex: -1,
            metadata: {
                isPlanMode: metadata.isPlanMode || false,
                operationType: metadata.operationType,
                generationType: metadata.generationType || 'agent',
                commandType: metadata.commandType,
            },
        };

        thread.generations.push(generation);
        thread.updatedAt = Date.now();

        console.log(`[ChatStateStorage] Added generation: ${generation.id} to thread: ${threadId}`);

        // Capture checkpoint for this generation asynchronously
        this.captureCheckpointForGeneration(workspaceId, threadId, generation.id).catch(error => {
            console.error('[ChatStateStorage] Failed to capture checkpoint:', error);
        });

        return generation;
    }

    /**
     * Capture checkpoint for a generation asynchronously
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     */
    private async captureCheckpointForGeneration(
        workspaceId: string,
        threadId: string,
        generationId: string
    ): Promise<void> {
        try {
            // Dynamic import to avoid circular dependencies
            const { captureWorkspaceSnapshot } = await import('../../views/ai-panel/checkpoint/checkpointUtils');
            const { notifyCheckpointCaptured } = await import('../../RPCLayer');

            const checkpoint = await captureWorkspaceSnapshot(generationId);

            if (checkpoint) {
                await this.addCheckpointToGeneration(workspaceId, threadId, generationId, checkpoint);

                notifyCheckpointCaptured({
                    messageId: generationId,
                    checkpointId: checkpoint.id,
                });
            }
        } catch (error) {
            console.error('[ChatStateStorage] Failed to capture checkpoint:', error);
        }
    }

    /**
     * Update a generation
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     * @param updates Partial updates to generation
     */
    updateGeneration(
        workspaceId: string,
        threadId: string,
        generationId: string,
        updates: Partial<Generation>
    ): void {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        const generation = thread.generations.find(g => g.id === generationId);

        if (!generation) {
            console.error(`[ChatStateStorage] Generation not found: ${generationId}`);
            return;
        }

        // Apply updates
        Object.assign(generation, updates);
        thread.updatedAt = Date.now();

        console.log(`[ChatStateStorage] Updated generation: ${generationId}`);
    }

    /**
     * Get a specific generation
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     * @returns Generation or undefined
     */
    getGeneration(
        workspaceId: string,
        threadId: string,
        generationId: string
    ): Generation | undefined {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        return thread.generations.find(g => g.id === generationId);
    }

    /**
     * Get all generations for a thread
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @returns Array of generations
     */
    getGenerations(workspaceId: string, threadId: string): Generation[] {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        return thread.generations;
    }

    // ============================================
    // Chat History (for LLM)
    // ============================================

    /**
     * Get chat history for LLM (model messages only)
     * Includes ALL generations (pending, under_review, accepted)
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @returns Array of model messages for LLM context
     */
    getChatHistoryForLLM(workspaceId: string, threadId: string): any[] {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        const messages: any[] = [];

        for (const generation of thread.generations) {
            if (generation.modelMessages && generation.modelMessages.length > 0) {
                messages.push(...generation.modelMessages);
            }
        }

        console.log(`[ChatStateStorage] Retrieved ${messages.length} model messages for thread: ${threadId}`);
        return messages;
    }

    // ============================================
    // Review State Management
    // ============================================

    /**
     * Get pending review generation (latest with 'under_review' status)
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @returns Generation or undefined
     */
    getPendingReviewGeneration(
        workspaceId: string,
        threadId: string
    ): Generation | undefined {
        const thread = this.getOrCreateThread(workspaceId, threadId);

        // Find the LATEST generation with 'under_review' status
        // Iterate in reverse to get the most recent one
        for (let i = thread.generations.length - 1; i >= 0; i--) {
            const generation = thread.generations[i];
            if (generation.reviewState.status === 'under_review') {
                console.log(`[ChatStateStorage] Found pending review generation: ${generation.id}`);
                return generation;
            }
        }

        console.log(`[ChatStateStorage] No pending review generation in thread: ${threadId}`);
        return undefined;
    }

    /**
     * Update review state for a generation
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     * @param state Review state updates
     */
    updateReviewState(
        workspaceId: string,
        threadId: string,
        generationId: string,
        state: Partial<GenerationReviewState>
    ): void {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        const generation = thread.generations.find(g => g.id === generationId);

        if (!generation) {
            console.error(`[ChatStateStorage] Generation not found for review update: ${generationId}`);
            return;
        }

        Object.assign(generation.reviewState, state);
        thread.updatedAt = Date.now();

        console.log(`[ChatStateStorage] Updated review state for generation: ${generationId}, status: ${generation.reviewState.status}`);
    }

    /**
     * Accept all reviews in a thread
     * Marks ALL 'under_review' generations as 'accepted'
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     */
    acceptAllReviews(workspaceId: string, threadId: string): void {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        let count = 0;

        for (const generation of thread.generations) {
            if (generation.reviewState.status === 'under_review') {
                generation.reviewState.status = 'accepted';
                count++;
            }
        }

        thread.updatedAt = Date.now();
        console.log(`[ChatStateStorage] Accepted ${count} review(s) in thread: ${threadId}`);
    }

    /**
     * Decline all reviews in a thread
     * Marks ALL 'under_review' generations as 'error'
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     */
    declineAllReviews(workspaceId: string, threadId: string): void {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        let count = 0;

        for (const generation of thread.generations) {
            if (generation.reviewState.status === 'under_review') {
                generation.reviewState.status = 'error';
                generation.reviewState.errorMessage = 'Declined by user';
                count++;
            }
        }

        thread.updatedAt = Date.now();
        console.log(`[ChatStateStorage] Declined ${count} review(s) in thread: ${threadId}`);
    }

    // ============================================
    // Checkpoint Management
    // ============================================

    /**
     * Get all checkpoints for a thread (across all generations)
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @returns Array of checkpoints in chronological order
     */
    getCheckpoints(workspaceId: string, threadId: string): Checkpoint[] {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        const checkpoints: Checkpoint[] = [];

        for (const generation of thread.generations) {
            if (generation.checkpoint) {
                checkpoints.push(generation.checkpoint);
            }
        }

        return checkpoints;
    }

    /**
     * Find checkpoint by ID
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param checkpointId Checkpoint identifier
     * @returns Checkpoint and its generation, or undefined
     */
    findCheckpoint(
        workspaceId: string,
        threadId: string,
        checkpointId: string
    ): { checkpoint: Checkpoint; generation: Generation } | undefined {
        const thread = this.getOrCreateThread(workspaceId, threadId);

        for (const generation of thread.generations) {
            if (generation.checkpoint?.id === checkpointId) {
                return { checkpoint: generation.checkpoint, generation };
            }
        }

        return undefined;
    }

    /**
     * Add checkpoint to a generation
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param generationId Generation identifier
     * @param checkpoint Checkpoint to add
     */
    async addCheckpointToGeneration(
        workspaceId: string,
        threadId: string,
        generationId: string,
        checkpoint: Checkpoint
    ): Promise<void> {
        const thread = this.getOrCreateThread(workspaceId, threadId);
        const generation = thread.generations.find(g => g.id === generationId);

        if (!generation) {
            console.error(`[ChatStateStorage] Generation not found: ${generationId}`);
            return;
        }

        generation.checkpoint = checkpoint;
        thread.updatedAt = Date.now();

        console.log(`[ChatStateStorage] Added checkpoint ${checkpoint.id} to generation ${generationId}`);

        // Enforce maxCount limit by removing oldest checkpoints
        await this.enforceCheckpointLimit(workspaceId, threadId);
    }

    /**
     * Enforce checkpoint limit by removing oldest checkpoints beyond maxCount
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     */
    private async enforceCheckpointLimit(workspaceId: string, threadId: string): Promise<void> {
        // Dynamic import to avoid circular dependencies
        const { getCheckpointConfig } = await import('../../views/ai-panel/checkpoint/checkpointConfig');
        const config = getCheckpointConfig();

        if (!config.enabled) {
            return;
        }

        const thread = this.getOrCreateThread(workspaceId, threadId);

        // Collect all generations with checkpoints
        const generationsWithCheckpoints = thread.generations
            .map((gen, index) => ({ generation: gen, index }))
            .filter(item => item.generation.checkpoint !== undefined);

        // If we're within the limit, nothing to do
        if (generationsWithCheckpoints.length <= config.maxCount) {
            return;
        }

        // Calculate how many checkpoints to remove
        const checkpointsToRemove = generationsWithCheckpoints.length - config.maxCount;

        // Remove checkpoints from oldest generations (keep the most recent maxCount)
        for (let i = 0; i < checkpointsToRemove; i++) {
            const { generation } = generationsWithCheckpoints[i];
            const checkpointId = generation.checkpoint?.id;

            console.log(`[ChatStateStorage] Removing old checkpoint ${checkpointId} (exceeds maxCount: ${config.maxCount})`);
            generation.checkpoint = undefined;
        }

        thread.updatedAt = Date.now();
    }

    /**
     * Restore thread to a checkpoint (truncate generations after checkpoint)
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param checkpointId Checkpoint identifier
     * @returns true if restored, false if checkpoint not found
     */
    restoreThreadToCheckpoint(
        workspaceId: string,
        threadId: string,
        checkpointId: string
    ): boolean {
        const thread = this.getOrCreateThread(workspaceId, threadId);

        // Find the generation containing this checkpoint
        let checkpointGenerationIndex = -1;
        for (let i = 0; i < thread.generations.length; i++) {
            if (thread.generations[i].checkpoint?.id === checkpointId) {
                checkpointGenerationIndex = i;
                break;
            }
        }

        if (checkpointGenerationIndex === -1) {
            console.error(`[ChatStateStorage][RESTORE] Checkpoint ${checkpointId} not found in thread ${threadId}`);
            return false;
        }

        // Truncate generations at the checkpoint
        // Remove the generation WITH the checkpoint and everything after it
        // This restores to the state BEFORE the user submitted this message
        thread.generations = thread.generations.slice(0, checkpointGenerationIndex);
        thread.updatedAt = Date.now();

        return true;
    }

    // ============================================
    // Utilities
    // ============================================

    /**
     * Generate a unique ID
     * @returns Unique string ID
     */
    private generateId(): string {
        return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    }

    /**
     * Get storage statistics
     */
    getStats(): {
        workspaceCount: number;
        totalThreads: number;
        totalGenerations: number;
        estimatedSizeMB: number;
    } {
        let totalThreads = 0;
        let totalGenerations = 0;
        let estimatedSize = 0;

        for (const workspace of this.storage.values()) {
            totalThreads += workspace.threads.size;

            for (const thread of workspace.threads.values()) {
                totalGenerations += thread.generations.length;
            }

            // Rough estimate of size (serialize to JSON)
            estimatedSize += JSON.stringify({
                workspaceId: workspace.workspaceId,
                threads: Array.from(workspace.threads.values()),
            }).length;
        }

        return {
            workspaceCount: this.storage.size,
            totalThreads,
            totalGenerations,
            estimatedSizeMB: estimatedSize / (1024 * 1024)
        };
    }

    // ============================================
    // Active Execution Management (for abort functionality)
    // ============================================

    /**
     * Register active execution for a thread
     * Auto-aborts existing execution if present
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @param execution Active execution handle
     */
    setActiveExecution(
        workspaceId: string,
        threadId: string,
        execution: ActiveExecution
    ): void {
        // Abort any existing execution for this thread first
        this.abortActiveExecution(workspaceId, threadId);

        let threadMap = this.activeExecutions.get(workspaceId);
        if (!threadMap) {
            threadMap = new Map();
            this.activeExecutions.set(workspaceId, threadMap);
        }

        threadMap.set(threadId, execution);
        console.log(`[ChatStateStorage] Registered active execution: ${execution.generationId} for thread: ${threadId}`);
    }

    /**
     * Abort active execution for a thread
     * Called by RPC abort handler
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @returns true if execution was aborted, false if no active execution found
     */
    abortActiveExecution(workspaceId: string, threadId: string): boolean {
        const threadMap = this.activeExecutions.get(workspaceId);
        if (!threadMap) {
            return false;
        }

        const execution = threadMap.get(threadId);
        if (!execution) {
            return false;
        }

        console.log(`[ChatStateStorage] Aborting execution: ${execution.generationId} for thread: ${threadId}`);
        approvalManager.cancelAllPending("Agent execution aborted by user");
        execution.abortController.abort();

        // Cleanup
        threadMap.delete(threadId);
        if (threadMap.size === 0) {
            this.activeExecutions.delete(workspaceId);
        }

        return true;
    }

    /**
     * Clear active execution when completed normally
     * Called in finally block of AICommandExecutor.run()
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     */
    clearActiveExecution(workspaceId: string, threadId: string): void {
        const threadMap = this.activeExecutions.get(workspaceId);
        if (!threadMap) {
            return;
        }

        threadMap.delete(threadId);
        if (threadMap.size === 0) {
            this.activeExecutions.delete(workspaceId);
        }

        console.log(`[ChatStateStorage] Cleared active execution for thread: ${threadId}`);
    }

    /**
     * Get active execution (for debugging/inspection)
     *
     * @param workspaceId Workspace identifier
     * @param threadId Thread identifier
     * @returns Active execution or undefined
     */
    getActiveExecution(workspaceId: string, threadId: string): ActiveExecution | undefined {
        return this.activeExecutions.get(workspaceId)?.get(threadId);
    }
}

// Singleton export
export const chatStateStorage = new ChatStateStorage();
