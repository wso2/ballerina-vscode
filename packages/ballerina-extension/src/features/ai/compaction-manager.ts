/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
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

import { CompactionEngine, CompactionMetadata, CompactionResult, ProjectStateContext } from '@wso2/copilot-utilities/compaction';
import { generateText, LanguageModel } from 'ai';
import * as path from 'path';
import * as fs from 'fs';
import { chatStateStorage } from '../../views/ai-panel/chatStateStorage';

/**
 * CompactionManager — Ballerina-specific wrapper around CompactionEngine.
 *
 * Responsibilities:
 * - Constructs a CompactionEngine with Ballerina-specific token counting
 * - Bridges the compaction results into chatStateStorage (clear old generations,
 *   create synthetic compacted generation)
 * - Backs up pre-compaction history to disk (M07)
 * - Provides bindModel() for M02: model instance reuse
 *
 * Design note (M02): This class does NOT resolve its own model.
 * The caller (AgentExecutor for auto-compact, rpc-manager for manual compact)
 * passes in the already-authenticated model via bindModel() or manualCompact().
 * This avoids duplicate getAnthropicClient() calls and provider-specific ID mismatches.
 */
export class CompactionManager {
    private engine: CompactionEngine;

    constructor() {
        this.engine = new CompactionEngine({
            modelConfig: {
                maxContextWindow: 200_000,
                maxOutputTokens: 8_192,  // C02: Must match AgentExecutor.ts streamText maxOutputTokens
                autoCompactBuffer: 13_000,
            },
            // Token counting using character estimation (fallback when no actual usage data)
            tokenCountCallback: async (messages: any[]) => {
                const totalChars = messages.reduce((sum, msg) => {
                    const content = typeof msg.content === 'string'
                        ? msg.content
                        : JSON.stringify(msg.content);
                    return sum + content.length;
                }, 0);
                return Math.ceil(totalChars / 4);  // ~4 chars per token
            },
            // M02: summarizationCallback is NOT set here — bound per-call via bindModel()
        });
    }

    /**
     * Expose the underlying CompactionEngine for CompactionGuard (Section 9).
     */
    getEngine(): CompactionEngine {
        return this.engine;
    }

    /**
     * C04: Update token estimation context with actual usage data from streamText.
     * Call this after each step response to improve threshold accuracy.
     */
    updateTokenContext(
        actualInputTokens: number,
        systemPromptEstimate: number,
        toolDefinitionsEstimate: number
    ): void {
        this.engine.updateTokenContext({
            lastActualInputTokens: actualInputTokens,
            systemPromptTokenEstimate: systemPromptEstimate,
            toolDefinitionsTokenEstimate: toolDefinitionsEstimate,
        });
    }

    /**
     * M02: Bind the summarization callback with the caller's authenticated model instance.
     *
     * Must be called before checkAndCompact() or the engine will refuse to compact.
     * This reuses the SAME model instance as the agent, avoiding:
     * - Duplicate getAnthropicClient() calls (double rate limit exposure)
     * - Concurrent token refresh in fetchWithAuth
     * - Provider-specific model ID mismatches (Bedrock ARN, Vertex AI)
     */
    bindModel(model: LanguageModel): void {
        this.engine.setSummarizationCallback(
            async (messages: any[], systemPrompt: string, abortSignal?: AbortSignal) => {
                console.log(`[CompactionManager] Calling summarization LLM with ${messages.length} messages`);
                console.log(`[CompactionManager] System prompt length: ${systemPrompt.length} chars`);
                console.log(`[CompactionManager] Message roles: ${messages.map((m: any) => m.role).join(', ')}`);
                try {
                    const result = await generateText({
                        model,
                        maxOutputTokens: 8192,
                        temperature: 0,
                        system: systemPrompt,
                        messages,
                        abortSignal,  // M05: Propagate abort
                    });
                    console.log(`[CompactionManager] LLM returned ${result.text?.length ?? 0} chars, finishReason: ${result.finishReason}`);
                    if (!result.text || result.text.trim().length === 0) {
                        console.error(`[CompactionManager] LLM returned empty text! finishReason: ${result.finishReason}, usage: ${JSON.stringify(result.usage)}`);
                    }
                    return result.text;
                } catch (error) {
                    console.error(`[CompactionManager] generateText threw:`, error);
                    throw error;
                }
            }
        );
    }

    /**
     * Auto-compaction check: called before streamText to prevent between-turn overflow.
     * Does nothing if context is below threshold or if compaction fails (C10).
     *
     * @param workspaceId - Workspace path (project root)
     * @param threadId - Thread identifier (usually 'default')
     * @param projectState - Current agent project state (C09)
     * @param abortSignal - M05: Propagated abort signal
     */
    async checkAndCompact(
        workspaceId: string,
        threadId: string,
        projectState?: ProjectStateContext,
        abortSignal?: AbortSignal,
        eventHandler?: (event: any) => void,
        currentTurnMessages?: any[]
    ): Promise<void> {
        const history = chatStateStorage.getChatHistoryForLLM(workspaceId, threadId);
        if (!history || history.length === 0) {
            return;
        }

        const messagesToEstimate = currentTurnMessages 
            ? [...history, ...currentTurnMessages] 
            : history;

        const shouldCompact = await this.engine.shouldCompact(messagesToEstimate);
        if (!shouldCompact) {
            return;
        }

        // M02: Ensure bindModel() was called before reaching here
        if (!this.engine.hasSummarizationCallback()) {
            console.error('[CompactionManager] No model bound — call bindModel() before checkAndCompact()');
            return;
        }

        eventHandler?.({ type: 'compaction_start' });

        // C09: Pass project state; M05: forward abortSignal; C10: handle failures
        const result = await this.engine.compact(history, {
            mode: 'auto',
            projectState,
            abortSignal,
        });

        if (!result.success) {
            console.warn('[CompactionManager] Auto-compaction failed, continuing with uncompacted history');
            eventHandler?.({ type: 'compaction_failed', reason: 'Auto-compaction failed' });
            return;
        }

        await this.replaceThreadHistory(workspaceId, threadId, result.compactedMessages, result.metadata);

        eventHandler?.({ type: 'compaction_end' });

        // Emit usage_metrics so the context usage widget reflects the reduced token count
        if (eventHandler && result.compactedTokens != null) {
            eventHandler({
                type: 'usage_metrics',
                usage: {
                    inputTokens: result.compactedTokens,
                    cacheCreationInputTokens: 0,
                    cacheReadInputTokens: 0,
                    outputTokens: 0,
                },
            });
        }

        console.log(
            `[CompactionManager] ${result.originalTokens} → ${result.compactedTokens} tokens ` +
            `(${result.reductionPercentage.toFixed(1)}% reduction, ${result.retriesUsed} retries)`
        );
    }

    /**
     * Manual compaction: called from the RPC manager when user triggers /compact.
     */
    async manualCompact(
        workspaceId: string,
        threadId: string,
        model: LanguageModel,
        userInstructions?: string,
        projectState?: ProjectStateContext
    ): Promise<CompactionResult> {
        const history = chatStateStorage.getChatHistoryForLLM(workspaceId, threadId);
        if (!history || history.length === 0) {
            throw new Error('No conversation history to compact');
        }

        // M02: Bind the model for this manual compaction call
        this.bindModel(model);

        const result = await this.engine.compact(history, {
            mode: 'manual',
            customInstructions: userInstructions,
            projectState,
        });

        if (!result.success) {
            throw new Error('Manual compaction failed');
        }

        await this.replaceThreadHistory(workspaceId, threadId, result.compactedMessages, result.metadata);

        return result;
    }

    /**
     * Get current token status for the thread.
     */
    async getTokenStatus(workspaceId: string, threadId: string) {
        const history = chatStateStorage.getChatHistoryForLLM(workspaceId, threadId);
        if (!history) {
            return null;
        }
        return this.engine.getTokenStatus(history);
    }

    /**
     * Appends `.ballerina/copilot/compaction-backups/` to the project's .gitignore
     * if the file exists and the entry is not already present.
     */
    private async ensureGitignoreEntry(workspaceId: string): Promise<void> {
        const gitignorePath = path.join(workspaceId, '.gitignore');
        const entry = '.ballerina/';
        try {
            const existing = await fs.promises.readFile(gitignorePath, 'utf-8');
            if (existing.split('\n').some(line => line.trim() === entry)) {
                return; // already present
            }
            const suffix = existing.endsWith('\n') ? '' : '\n';
            await fs.promises.appendFile(gitignorePath, `${suffix}${entry}\n`, 'utf-8');
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                // .gitignore does not exist — create it with the entry
                await fs.promises.writeFile(gitignorePath, `${entry}\n`, 'utf-8');
            } else {
                console.error(`[CompactionManager] Failed to update .gitignore:`, error);
            }
        }
    }

    /**
     * M07: Save pre-compaction thread history to a backup file.
     * Stored in `.ballerina/copilot/compaction-backups/` under the project directory.
     */
    private async backupPreCompactionHistory(
        workspaceId: string,
        threadId: string
    ): Promise<{ backupPath: string; generationIds: string[] }> {
        const thread = chatStateStorage.getOrCreateThread(workspaceId, threadId);
        const generationIds = thread.generations.map((g: any) => g.id);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(workspaceId, '.ballerina', 'copilot', 'compaction-backups');
        const backupPath = path.join(backupDir, `${threadId}-${timestamp}.json`);

        await fs.promises.mkdir(backupDir, { recursive: true });
        await this.ensureGitignoreEntry(workspaceId);

        const backupData = {
            backupVersion: 1,
            threadId,
            workspaceId,
            createdAt: Date.now(),
            generationCount: thread.generations.length,
            generations: thread.generations,
        };

        await fs.promises.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`[CompactionManager] Backed up ${generationIds.length} generations to ${backupPath}`);

        return { backupPath, generationIds };
    }

    /**
     * Replace entire thread history with compacted messages.
     *
     * Steps:
     * 1. M07: Back up pre-compaction history to disk
     * 2. Clear all old generations from the thread
     * 3. Create a synthetic 'compacted' generation with the new messages
     * 4. C15: Store compaction metadata on the generation
     *
     * @param preserveGenerationId - If provided (mid-stream case), the in-progress generation
     *   with this ID is re-added after clearing so it can be populated when the turn ends.
     */
    private async replaceThreadHistory(
        workspaceId: string,
        threadId: string,
        compactedMessages: any[],
        metadata?: CompactionMetadata,
        preserveGenerationId?: string
    ): Promise<void> {
        // M07: Backup before clearing
        const { backupPath, generationIds } = await this.backupPreCompactionHistory(workspaceId, threadId);

        if (metadata) {
            metadata.backupPath = backupPath;
            metadata.compactedGenerationIds = generationIds;
        }

        const thread = chatStateStorage.getOrCreateThread(workspaceId, threadId);

        // Capture in-progress generation before clearing (mid-stream case only)
        const preservedGen = preserveGenerationId
            ? thread.generations.find(g => g.id === preserveGenerationId)
            : undefined;

        // Clear old generations (direct mutation — getOrCreateThread returns live reference)
        thread.generations = [];

        const generationId = 'compact-' + Date.now();

        // Create synthetic generation to hold the compacted history.
        // skipCheckpoint=true: compacted generations must not create spurious checkpoints.
        chatStateStorage.addGeneration(
            workspaceId,
            threadId,
            '[Compacted History]',
            { isPlanMode: false, generationType: 'agent' },
            generationId,
            true
        );

        // Update with compacted messages, mark accepted so it's included in future LLM context
        chatStateStorage.updateGeneration(
            workspaceId,
            threadId,
            generationId,
            {
                modelMessages: compactedMessages,
                reviewState: { status: 'accepted', modifiedFiles: [] },
                // C15 + M07: Store compaction metadata (including backup path)
                metadata: {
                    isPlanMode: false,
                    generationType: 'agent',
                    compactionMetadata: metadata ? {
                        ...metadata,
                        isCompactedGeneration: true,
                    } : undefined,
                },
            }
        );

        // Re-add the in-progress generation after the compacted summary (mid-stream case).
        // Its modelMessages are still empty here — they'll be populated by updateGeneration
        // when the turn ends via AgentExecutor's stream handler.
        if (preservedGen) {
            thread.generations.push(preservedGen);
            console.log(`[CompactionManager] Re-added in-progress generation: ${preserveGenerationId}`);
        }

        console.log(
            `[CompactionManager] Replaced ${generationIds.length} generations with compacted history. ` +
            `Backup: ${backupPath}`
        );
    }

    /**
     * Called by CompactionGuard after a successful mid-stream compaction.
     * Persists the compacted summary of OLD history to chatStateStorage,
     * preserving the current in-progress generation so it can be populated
     * normally when the turn ends.
     *
     * This eliminates double compaction: because storage is updated here,
     * the next turn's pre-turn compaction will see an already-compacted
     * history and won't fire again.
     *
     * @param currentGenerationId - The in-progress generation ID to preserve
     * @param compactedMessages   - compactionResult.compactedMessages (summary only,
     *   NOT the full array with recentMessages — those are saved when the turn ends)
     */
    async persistMidStreamCompaction(
        workspaceId: string,
        threadId: string,
        currentGenerationId: string,
        compactedMessages: any[],
        metadata?: CompactionMetadata
    ): Promise<void> {
        await this.replaceThreadHistory(workspaceId, threadId, compactedMessages, metadata, currentGenerationId);
        console.log(`[CompactionManager] Mid-stream compaction persisted to storage. Preserved generation: ${currentGenerationId}`);
    }
}

/**
 * Singleton instance — shared across AgentExecutor and RPC manager.
 * This ensures a single engine with consistent token estimation state.
 */
export const compactionManager = new CompactionManager();
