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

import { CompactionEngine, ProjectStateContext } from '@wso2/copilot-utilities/compaction';
import { ModelMessage } from 'ai';
import { ChatNotify } from '@wso2/ballerina-core';

/**
 * Configuration for CompactionGuard.
 */
export interface CompactionGuardConfig {
    /** The shared CompactionEngine instance (from CompactionManager.getEngine()) */
    engine: CompactionEngine;
    /** Token count at which mid-stream compaction is triggered (e.g. 160_000 = 80% of 200K) */
    tokenThreshold: number;
    /** Maximum compaction attempts per generation before giving up (default: 3) */
    maxCompactionAttempts: number;
    /** Number of recent messages to preserve verbatim after split (default: 6) */
    preserveRecentMessageCount: number;
    /** Event handler for sending compaction status events to the UI */
    eventHandler: (event: ChatNotify) => void;
    /** Original user request content — re-injected after compaction for task continuity */
    originalUserMessage: string;
    /** Project state for continuation messages */
    projectState: ProjectStateContext;
    /** AbortSignal to propagate cancellation into the summarization LLM call */
    abortSignal?: AbortSignal;
    /**
     * Called after successful mid-stream compaction to persist the compacted summary
     * to chatStateStorage. Receives only compactionResult.compactedMessages (the LLM
     * summary pair), NOT the full replacement array with recentMessages — those are
     * saved normally when the generation completes via updateGeneration.
     */
    persistCallback?: (compactedMessages: ModelMessage[], metadata?: any) => Promise<void>;
}

function areMessagesEqual(a: ModelMessage[], b: ModelMessage[]): boolean {
    if (a.length !== b.length) { return false; }
    for (let i = 0; i < a.length; i++) {
        if (a[i].role !== b[i].role || a[i].content !== b[i].content) {
            return false;
        }
    }
    return true;
}

/**
 * CompactionGuard — mid-stream compaction logic for Vercel AI SDK's `prepareStep` hook.
 *
 * Called from `prepareStep` before each LLM step. Reads the actual inputTokens from
 * the last completed step, and if above threshold, summarizes the old messages and
 * returns a compacted replacement message array.
 *
 * The guard tracks compaction attempts and sets `lastCompactionFailed` when it can no
 * longer reduce context, allowing the `contextExhausted` stop condition to halt gracefully.
 */
export class CompactionGuard {
    private compactionCount: number = 0;
    private _lastCompactionFailed: boolean = false;
    /**
     * Tracks the compacted message array returned by the last compaction and the
     * length of the SDK's accumulated messages at that point.
     */
    private lastCompactedMessages: ModelMessage[] | null = null;
    private sdkMessagesCountAtLastCompaction: number = 0;

    constructor(private config: CompactionGuardConfig) {}

    /**
     * Read by the `contextExhausted` StopCondition to halt generation gracefully.
     */
    get lastCompactionFailed(): boolean {
        return this._lastCompactionFailed;
    }

    /**
     * Called from `prepareStep`. Decides whether to compact and performs it.
     *
     * @returns Replacement `{ messages }` object for prepareStep, or `undefined` to proceed normally.
     */
    async maybeCompact(options: {
        steps: any[];
        stepNumber: number;
        messages: ModelMessage[];
    }): Promise<{ messages: ModelMessage[] } | undefined> {
        const { steps, messages } = options;

        // Skip on the very first step — no usage data available yet
        if (steps.length === 0) {
            return undefined;
        }

        // Respect abort signal
        if (this.config.abortSignal?.aborted) {
            return undefined;
        }

        // Build effective messages: if a previous compaction was done, merge the
        // compacted base with any new additions the SDK has accumulated since then.
        // This prevents the SDK from reverting to its full accumulated history.
        const effectiveMessages = this.buildEffectiveMessages(messages);

        // Read actual token count from the most recent completed step.
        // usage.inputTokens is the ground truth — it's what the LLM API actually consumed.
        const lastStep = steps[steps.length - 1];
        const lastInputTokens: number = lastStep.usage?.inputTokens ?? 0;

        if (lastInputTokens < this.config.tokenThreshold) {
            // Even when below threshold, return effectiveMessages if a previous compaction
            // shrank the history — otherwise the SDK would silently undo our compaction by
            // feeding its full accumulated messages to the next API call.
            if (this.lastCompactedMessages && !areMessagesEqual(effectiveMessages, messages)) {
                return { messages: effectiveMessages };
            }
            return undefined;
        }

        // Calculate the exact boundary we would use to split 'old' messages from 'recent' preserved messages
        const targetSplitIndex = Math.max(0, effectiveMessages.length - this.config.preserveRecentMessageCount);
        const summarizableMessages = effectiveMessages.slice(0, targetSplitIndex);
        const summarizableUserMessages = summarizableMessages.filter(m => m.role === 'user').length;

        // If the portion of the chat we are allowed to summarize doesn't contain a sufficient batch of user messages,
        // we skip compaction to avoid firing the summarizer on every single turn. This "batches" the summarizations.
        const MIN_MESSAGES_TO_BATCH = 3;
        if (summarizableUserMessages < MIN_MESSAGES_TO_BATCH) {
            console.warn(`[CompactionGuard] Threshold reached (${lastInputTokens} >= ${this.config.tokenThreshold}), but skipping compaction due to insufficient older conversation history (${summarizableUserMessages}/${MIN_MESSAGES_TO_BATCH} summarizable user messages needed for a batch). Allowing generation to continue.`);
            return undefined;
        }

        console.log(
            `[CompactionGuard] Token threshold reached: ${lastInputTokens} >= ${this.config.tokenThreshold} ` +
            `(step ${options.stepNumber}, attempt ${this.compactionCount + 1}/${this.config.maxCompactionAttempts})`
        );

        // If we've exhausted all attempts, give up — let contextExhausted stop the generation
        if (this.compactionCount >= this.config.maxCompactionAttempts) {
            console.error(
                `[CompactionGuard] Max compaction attempts (${this.config.maxCompactionAttempts}) reached.`
            );
            this._lastCompactionFailed = true;
            return undefined;
        }

        try {
            return await this.performCompaction(effectiveMessages, messages.length);
        } catch (error) {
            console.error('[CompactionGuard] Mid-stream compaction failed:', error);
            this._lastCompactionFailed = true;
            this.config.eventHandler({
                type: 'compaction_failed',
                reason: error instanceof Error ? error.message : 'Unknown compaction error',
            });
            return undefined;
        }
    }

    /**
     * Builds the effective message array from the compacted base + new SDK additions.
     *
     * The Vercel AI SDK tracks `messages` as:
     *   initialMessages + allStepResponses (grows monotonically)
     */
    private buildEffectiveMessages(sdkMessages: ModelMessage[]): ModelMessage[] {
        if (!this.lastCompactedMessages) {
            return sdkMessages;
        }
        const newAdditions = sdkMessages.slice(this.sdkMessagesCountAtLastCompaction);
        return [...this.lastCompactedMessages, ...newAdditions];
    }

    /**
     * Core compaction: splits messages, summarizes old portion, preserves recent messages.
     */
    private async performCompaction(
        messages: ModelMessage[],
        sdkMessagesCount: number
    ): Promise<{ messages: ModelMessage[] }> {
        this.config.eventHandler({ type: 'compaction_start' });

        // === SPLIT: determine boundary between old (to summarize) and recent (to keep) ===
        const preserveCount = this.config.preserveRecentMessageCount;
        const targetSplitIndex = Math.max(0, messages.length - preserveCount);
        let cleanSplitIndex = this.findCleanSplitPoint(messages, targetSplitIndex);

        if (cleanSplitIndex === messages.length) {
            console.warn('[CompactionGuard] No safe split point found (too few messages to summarize). Treating as compaction failure.');
            this._lastCompactionFailed = true;
            this.config.eventHandler({
                type: 'compaction_failed',
                reason: 'No safe split point found'
            });
            return { messages };
        }

        const oldMessages = messages.slice(0, cleanSplitIndex);
        const recentMessages = messages.slice(cleanSplitIndex);

        console.log(
            `[CompactionGuard] Split: ${oldMessages.length} messages → summarize, ` +
            `${recentMessages.length} messages → preserve verbatim`
        );

        // === SUMMARIZE old messages ===
        // MID_STREAM_INSTRUCTIONS injected via customInstructions — flows through
        // SummarizationService as "## Additional Summarization Instructions from User".
        // This keeps a single prompt source of truth (Section 9.6).
        const MID_STREAM_INSTRUCTIONS = `## Mid-Stream Compaction Context

CRITICAL: This compaction is happening MID-TASK. The assistant is in the middle of executing a task and will continue immediately after reading this summary. Prioritize:

1. **Original User Request**: Include the EXACT user request verbatim
2. **Task Progress**: What has been accomplished vs what remains
3. **Files Modified**: List ALL file paths created, read, or modified
4. **Current State**: What was being worked on at the moment of compaction
5. **Pending Work**: Specific next steps needed to complete the task
6. **Errors**: Any unresolved errors or blockers

The assistant MUST be able to seamlessly continue the task from this summary alone.`;

        let compactionResult = await this.config.engine.compact(oldMessages, {
            mode: 'auto',
            projectState: this.config.projectState,
            abortSignal: this.config.abortSignal,
            customInstructions: MID_STREAM_INSTRUCTIONS,
        });

        if (!compactionResult.success) {
            throw new Error('CompactionEngine.compact() returned success: false');
        }

        // === EXTRACT unresolved failures from the compacted portion ===
        // Tool failures that happened in oldMessages won't be in the verbatim preserved
        // window, so the model might blindly repeat the same failing input. We extract
        // them deterministically (not relying on LLM summarization) and inject them as
        // an explicit warning block.
        const failureNotes = this.extractFailureNotes(oldMessages);

        // === BUILD replacement message array ===
        // Structure: [summary pair] + [failure notes?] + [task reminder] + [recent tool interactions]
        
        const taskReminderMessages: ModelMessage[] = [
            {
                role: 'user' as const,
                content: `[Mid-stream compaction occurred. The context was approaching token limits. ` +
                    `Your conversation history has been compacted. Continue working on the original task below.]\n\n` +
                    `Original request: ${this.config.originalUserMessage}`,
            },
            {
                role: 'assistant' as const,
                content: 'Understood. I will continue working on the task. Let me pick up where I left off based on the recent context.',
            }
        ];
        
        let compactedMessages: ModelMessage[] = [
            ...compactionResult.compactedMessages,
            // Inject unresolved tool failures so the model avoids repeating them
            ...(failureNotes
                ? [{
                    role: 'user' as const,
                    content: failureNotes,
                }]
                : []),
            // Re-inject original request so the model remembers what it was working on
            ...taskReminderMessages,
            // Preserved recent messages — verbatim (last N tool interactions)
            ...recentMessages,
        ];

        let tokenStatus = await this.config.engine.getTokenStatus(compactedMessages);
        let recompactAttempts = 0;
        const maxRecompactIterations = 3;

        while (tokenStatus.currentTokens >= this.config.tokenThreshold) {
            if (recompactAttempts >= maxRecompactIterations) {
                console.warn(`[CompactionGuard] Exceeded max recompaction iterations (${maxRecompactIterations}). Breaking loop.`);
                break;
            }

            // NEW CHECK: If the summarizer barely shrank the payload (less than 5% reduction),
            // it means we hit an unshrinkable static block (like massive codebase files).
            // Break immediately.
            if (compactionResult.reductionPercentage < 5) {
                console.warn(`[CompactionGuard] Only ${compactionResult.reductionPercentage.toFixed(1)}% reduction achieved. Payload is likely unshrinkable static context. Breaking loop.`);
                break;
            }

            recompactAttempts++;
            console.warn(`[CompactionGuard] Built messages exceed threshold (${tokenStatus.currentTokens} >= ${this.config.tokenThreshold}). Re-compacting full content (attempt ${recompactAttempts}).`);
            
            compactionResult = await this.config.engine.compact(compactedMessages, {
                mode: 'auto',
                projectState: this.config.projectState,
                abortSignal: this.config.abortSignal,
                customInstructions: MID_STREAM_INSTRUCTIONS,
            });

            if (!compactionResult.success) {
                throw new Error('Fallback CompactionEngine.compact() returned success: false');
            }

            // Do NOT discard supplemental reminders and recent messages
            compactedMessages = [
                ...compactionResult.compactedMessages,
                ...(failureNotes
                    ? [{
                        role: 'user' as const,
                        content: failureNotes,
                    }]
                    : []),
                ...taskReminderMessages,
                ...recentMessages,
            ];
            tokenStatus = await this.config.engine.getTokenStatus(compactedMessages);
        }

        // Persist the summary of old history to chatStateStorage so the next turn
        // doesn't need to compact again (eliminates double compaction).
        // Non-fatal: if this fails, the in-memory compaction still works for this turn.
        if (this.config.persistCallback) {
            try {
                await this.config.persistCallback(compactionResult.compactedMessages, compactionResult.metadata);
            } catch (err) {
                console.error('[CompactionGuard] Failed to persist mid-stream compaction to storage:', err);
            }
        }

        this.compactionCount++;

        // Persist the compacted base so buildEffectiveMessages() can prepend it to
        // any new SDK additions on subsequent prepareStep calls.
        this.lastCompactedMessages = compactedMessages;
        this.sdkMessagesCountAtLastCompaction = sdkMessagesCount;

        this.config.eventHandler({
            type: 'compaction_end',
            metadata: compactionResult.metadata,
        });

        console.log(
            `[CompactionGuard] Mid-stream compaction #${this.compactionCount} complete. ` +
            `Messages: ${messages.length} → ${compactedMessages.length} ` +
            `(${compactionResult.reductionPercentage.toFixed(1)}% reduction)`
        );

        return { messages: compactedMessages };
    }

    /**
     * Scans the compacted (old) message slice for tool failures that were NOT
     * subsequently resolved by a successful call to the same tool on the same target.
     *
     * Returns a formatted warning string to inject into the replacement messages, or
     * null if there are no unresolved failures. This is deterministic — it does not
     * rely on the LLM summarization picking up error details.
     */
    private extractFailureNotes(messages: ModelMessage[]): string | null {
        // Build toolCallId → { toolName, args } from assistant messages
        const toolCallMap = new Map<string, { toolName: string; args: Record<string, unknown> }>();
        for (const msg of messages) {
            if (msg.role !== 'assistant') { continue; }
            const parts = Array.isArray(msg.content) ? msg.content : [];
            for (const part of parts as any[]) {
                if (part?.type === 'tool-call' && part.toolCallId) {
                    toolCallMap.set(part.toolCallId, {
                        toolName: part.toolName ?? '(unknown)',
                        args: part.args ?? {},
                    });
                }
            }
        }

        // Collect all tool results in order, tagging each as error or success
        type ToolEvent = { toolCallId: string; toolName: string; target: string; isError: boolean; errorText: string };
        const events: ToolEvent[] = [];
        for (const msg of messages) {
            if (msg.role !== 'tool') { continue; }
            const parts = Array.isArray(msg.content) ? msg.content : [];
            for (const part of parts as any[]) {
                if (part?.type !== 'tool-result') { continue; }
                const call = toolCallMap.get(part.toolCallId ?? '');
                const toolName: string = part.toolName ?? call?.toolName ?? '(unknown)';
                const args: Record<string, unknown> = call?.args ?? {};
                const target = this.extractTarget(toolName, args);
                const resultText = typeof part.result === 'string'
                    ? part.result
                    : JSON.stringify(part.result ?? '');
                events.push({
                    toolCallId: part.toolCallId ?? '',
                    toolName,
                    target,
                    isError: !!part.isError,
                    errorText: resultText.slice(0, 300),
                });
            }
        }

        // A failure is "resolved" if the same (toolName, target) pair succeeded later
        const resolvedKeys = new Set<string>();
        const unresolvedFailures: ToolEvent[] = [];
        for (let i = events.length - 1; i >= 0; i--) {
            const key = `${events[i].toolName}::${events[i].target}`;
            if (!events[i].isError) {
                resolvedKeys.add(key);
            } else if (!resolvedKeys.has(key)) {
                unresolvedFailures.unshift(events[i]);
            }
        }

        if (unresolvedFailures.length === 0) { return null; }

        const lines = [
            '[Tool failures from compacted history — these exact inputs previously failed.',
            ' Read the current file state before retrying rather than repeating the same call.]',
            '',
        ];
        for (const f of unresolvedFailures) {
            const call = toolCallMap.get(f.toolCallId);
            const argSummary = call ? this.formatFailureArgs(f.toolName, call.args) : f.target;
            lines.push(`• ${f.toolName}: ${argSummary}`);
            lines.push(`  Error: ${f.errorText}`);
        }

        return lines.join('\n');
    }

    /** Extracts a short human-readable "target" string used for dedup (e.g. file path). */
    private extractTarget(toolName: string, args: Record<string, unknown>): string {
        const pathKey = ['path', 'filePath', 'file_path', 'target_file', 'file', 'name']
            .find(k => typeof args[k] === 'string');
        return pathKey ? String(args[pathKey]) : toolName;
    }

    /** Formats the key failure args for display in the warning block. */
    private formatFailureArgs(toolName: string, args: Record<string, unknown>): string {
        const target = this.extractTarget(toolName, args);
        // For edit tools, also show the old_string that failed to match
        const oldStr = args['old_string'] ?? args['old_str'] ?? args['original_snippet'];
        if (oldStr && typeof oldStr === 'string') {
            const preview = oldStr.replace(/\n/g, '\\n').slice(0, 100);
            return `${target} — old_string: "${preview}${oldStr.length > 100 ? '...' : ''}"`;
        }
        return target;
    }

    /**
     * Find a clean split point that doesn't break tool-call / tool-result pairs.
     *
     * Walks backward from targetIndex until a 'user' role message is found.
     * User messages are safe split boundaries — they are never mid-tool-call.
     *
     * Returns `messages.length` to skip compaction if too few messages (<4) remain.
     */
    private findCleanSplitPoint(messages: ModelMessage[], targetIndex: number): number {
        let index = targetIndex;

        while (index > 0) {
            if (messages[index].role === 'user') {
                break;
            }
            index--;
        }

        // Don't summarize fewer than 4 messages — not worth the latency
        if (index < 4) {
            return messages.length; // Skip compaction
        }

        return index;
    }
}
