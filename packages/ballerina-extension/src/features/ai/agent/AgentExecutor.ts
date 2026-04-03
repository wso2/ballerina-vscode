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

import { AICommandExecutor, AICommandConfig, AIExecutionResult } from '../executors/base/AICommandExecutor';
import { Command, GenerateAgentCodeRequest, ProjectSource, ExecutionContext, SemanticDiff, ReviewModeData, PROJECT_KIND } from '@wso2/ballerina-core';
import { StateMachine } from '../../../stateMachine';
import { ModelMessage, stepCountIs, streamText, TextStreamPart } from 'ai';
import { getAnthropicClient, getProviderCacheControl, addCacheControlToMessages, ANTHROPIC_SONNET_4 } from '../utils/ai-client';
import { populateHistoryForAgent, getErrorMessage } from '../utils/ai-utils';
import { sendAgentDidOpenForFreshProjects } from '../utils/project/ls-schema-notifications';
import { getSystemPrompt, getUserPrompt } from './prompts';
import { GenerationType } from '../utils/libs/libraries';
import { createToolRegistry } from './tool-registry';
import { getProjectSource, cleanupTempProject } from '../utils/project/temp-project';
import { integrateCodeToWorkspace } from './utils';
import { getWorkspaceTomlValues } from '../../../utils';
import { StreamContext } from './stream-handlers/stream-context';
import { checkCompilationErrors } from './tools/diagnostics-utils';
import { updateAndSaveChat } from '../utils/events';
import { chatStateStorage } from '../../../views/ai-panel/chatStateStorage';
import * as path from 'path';
import { approvalViewManager } from '../state/ApprovalViewManager';
import { compactionManager } from '../compaction-manager';
import { CompactionGuard } from './compaction/CompactionGuard';
import { contextExhausted } from './compaction/contextExhausted';
import {
    sendTelemetryEvent,
    sendTelemetryException,
    TM_EVENT_BALLERINA_AI_GENERATION_COMPLETED,
    TM_EVENT_BALLERINA_AI_GENERATION_ABORTED,
    TM_EVENT_BALLERINA_AI_GENERATION_FAILED,
    CMP_BALLERINA_AI_GENERATION
} from "../../telemetry";
import { extension } from "../../../BalExtensionContext";
import { getProjectMetrics } from "../../telemetry/common/project-metrics";
import { getHashedProjectId } from "../../telemetry/common/project-id";
import { workspace } from 'vscode';
import { runningServicesManager } from './tools/running-service-manager';

const RESERVED_OUTPUT_TOKENS = 8_192;

/** Estimate character length of a message's content for proportional token breakdown. */
function msgCharLen(msg: ModelMessage): number {
    return JSON.stringify(msg.content).length;
}

/**
 * Estimates per-category token breakdown by scaling character-based proportions to the
 * actual API-reported inputTokens total. The grand total is always exact; per-category
 * values are ~75-85% accurate.
 */
function computeTokenBreakdown(
    baseMessages: ModelMessage[],
    tools: any,
    accToolCallChars: number,
    accToolResultChars: number,
    inputTokens: number,
): { systemInstructions: number; toolDefinitions: number; reservedOutput: number; messages: number; toolResults: number } {
    const systemChars = baseMessages.filter(m => m.role === 'system').reduce((s, m) => s + msgCharLen(m), 0);
    const baseConvChars = baseMessages.filter(m => m.role === 'user' || m.role === 'assistant').reduce((s, m) => s + msgCharLen(m), 0);
    const baseToolChars = baseMessages.filter(m => m.role === 'tool').reduce((s, m) => s + msgCharLen(m), 0);

    const convChars = baseConvChars + accToolCallChars;
    const toolChars = baseToolChars + accToolResultChars;
    const toolDefsChars = JSON.stringify(tools ?? {}).length;
    const totalChars = systemChars + convChars + toolChars + toolDefsChars || 1;

    const systemInstructions = Math.round(inputTokens * systemChars / totalChars);
    const messages = Math.round(inputTokens * convChars / totalChars);
    const toolResults = Math.round(inputTokens * toolChars / totalChars);
    const toolDefinitions = Math.max(0, inputTokens - systemInstructions - messages - toolResults);
    return { systemInstructions, toolDefinitions, reservedOutput: RESERVED_OUTPUT_TOKENS, messages, toolResults };
}

/**
 * Determines which packages have been affected by analyzing modified files
 * Returns temp directory package paths for use with Language Server semantic diff API
 * @param modifiedFiles Array of relative file paths that were modified
 * @param projects Array of project sources with package information
 * @param ctx Execution context with project and workspace paths
 * @param tempProjectPath Temp project root path
 * @returns Array of temp package paths that have changes
 */
async function determineAffectedPackages(
    modifiedFiles: string[],
    projects: ProjectSource[],
    ctx: ExecutionContext,
    tempProjectPath: string
): Promise<string[]> {
    const affectedPackages = new Set<string>();

    console.log(`[determineAffectedPackages] Analyzing ${modifiedFiles.length} modified files across ${projects.length} projects`);
    console.log(`[determineAffectedPackages] Temp project path: ${tempProjectPath}`);

    // For non-workspace scenario (single package)
    if (!ctx.workspacePath) {
        console.log(`[determineAffectedPackages] Non-workspace scenario, using temp project path: ${tempProjectPath}`);
        affectedPackages.add(tempProjectPath);
        return Array.from(affectedPackages);
    }

    // Re-read workspace Ballerina.toml from temp to get the current package list
    // (the agent may have added new packages during the session)
    const workspaceToml = await getWorkspaceTomlValues(tempProjectPath);
    const packagePaths: string[] = workspaceToml?.workspace?.packages ?? projects.map(p => p.packagePath).filter(p => p !== "");

    // For workspace scenario with multiple packages
    // We need to map modified files to their temp package paths
    for (const modifiedFile of modifiedFiles) {
        let matched = false;

        for (const pkgPath of packagePaths) {
            if (modifiedFile.startsWith(pkgPath + '/') || modifiedFile === pkgPath) {
                const tempPackagePath = path.join(tempProjectPath, pkgPath);
                affectedPackages.add(tempPackagePath);
                matched = true;
                console.log(`[determineAffectedPackages] File '${modifiedFile}' belongs to package '${pkgPath}' (temp): ${tempPackagePath}`);
                break;
            }
        }

        if (!matched) {
            // File at workspace root (e.g. root Ballerina.toml)
            affectedPackages.add(tempProjectPath);
            console.log(`[determineAffectedPackages] File '${modifiedFile}' is at workspace root (temp): ${tempProjectPath}`);
        }
    }

    const result = Array.from(affectedPackages);
    console.log(`[determineAffectedPackages] Found ${result.length} affected temp package paths:`, result);
    return result;
}

/**
 * AgentExecutor - Executes agent-based code generation with tools and streaming
 *
 * Features:
 * - Multi-turn conversation with LLM using chat storage
 * - Review mode (temp project persists until user accepts/declines)
 * - Tool execution (TaskWrite, FileEdit, Diagnostics, etc.)
 * - Stream event processing
 * - Plan approval workflow (via ApprovalManager in TaskWrite tool)
 */
export class AgentExecutor extends AICommandExecutor<GenerateAgentCodeRequest> {
    /** Tracks in-flight tool-call start times keyed by toolCallId for duration logging. */
    private readonly _pendingToolCalls = new Map<string, number>();

    constructor(config: AICommandConfig<GenerateAgentCodeRequest>) {
        super(config);
    }

    /**
     * Execute agent code generation
     *
     * Flow:
     * 1. Get project sources from temp directory
     * 2. Send didOpen notifications (skip if reusing temp)
     * 3. Add generation to chat storage (if enabled)
     * 4. Get chat history from storage (if enabled)
     * 5. Build LLM messages (system + history + user)
     * 6. Create tools (TaskWrite, FileEdit, Diagnostics, etc.)
     * 7. Stream LLM response and process events
     * 8. Return modified files
     */
    async execute(): Promise<AIExecutionResult> {
        const tempProjectPath = this.config.executionContext.tempProjectPath!;
        const params = this.config.params; // Access params from config
        const modifiedFiles: string[] = [];
        const allModifiedFiles: Set<string> = new Set();
        const generationStartTime = Date.now();
        const projectId = await getHashedProjectId(this.config.executionContext.workspacePath || this.config.executionContext.projectPath);

        try {
            // 1. Get project sources from temp directory
            const projects: ProjectSource[] = await getProjectSource(
                params.operationType,
                this.config.executionContext
            );

            // 2. Send didOpen only if creating NEW temp (not reusing for review continuation)
            if (!this.config.lifecycle?.existingTempPath) {
                // Fresh project - Both schemas - correct
                sendAgentDidOpenForFreshProjects(tempProjectPath, projects);
            } else {
                console.log(`[AgentExecutor] Skipping didOpen (reusing temp for review continuation)`);
            }

            const workspaceId = this.config.executionContext.workspacePath || this.config.executionContext.projectPath;
            const threadId = (this.config.executionContext as any).threadId || 'default';
            const projectState = {
                modifiedFiles: modifiedFiles,
                tempProjectPath,
                workingDirectory: workspaceId,
            };

            // Resolve model ONCE — reused for both agent streaming and compaction (M02)
            const model = await getAnthropicClient(ANTHROPIC_SONNET_4);

            // Bind the authenticated model to the compaction manager
            compactionManager.bindModel(model);

            const userMessageContent = getUserPrompt(params, tempProjectPath, projects);

            // PRE-TURN compaction: compact if context is already above threshold
            // failures are handled gracefully inside checkAndCompact (returns without throwing)
            // abortSignal ensures the summarization LLM call is also cancelled on user abort
            await compactionManager.checkAndCompact(
                workspaceId,
                threadId,
                projectState,
                this.config.abortController.signal,
                this.config.eventHandler,
                [ { role: "user", content: userMessageContent } ]
            );

            // 3. Add generation to chat storage (if enabled)
            this.addGeneration(params.usecase, {
                isPlanMode: params.isPlanMode,
                operationType: params.operationType,
                generationType: 'agent',
            });

            // 4. Get chat history from storage (if enabled) — AFTER pre-turn compaction
            const chatHistory = this.getChatHistory();
            console.log(`[AgentExecutor] Using ${chatHistory.length} chat history messages`);

            // 5. Build LLM messages with history
            const historyMessages = populateHistoryForAgent(chatHistory);
            const cacheOptions = await getProviderCacheControl();
            
            const allMessages: ModelMessage[] = [
                {
                    role: "system",
                    content: getSystemPrompt(projects, params.operationType),
                    providerOptions: cacheOptions,
                },
                ...historyMessages,
                {
                    role: "user",
                    content: userMessageContent,
                },
            ];

            // Resolve model and limits
            const llmModel = this.config.model ?? await getAnthropicClient(ANTHROPIC_SONNET_4);
            const maxSteps = this.config.agentLimits?.maxSteps ?? 50;
            const maxOutputTokens = this.config.agentLimits?.maxOutputTokens ?? 8192;

            // Create tools
            const tools = createToolRegistry({
                eventHandler: this.config.eventHandler,
                tempProjectPath,
                modifiedFiles,
                allModifiedFiles,
                projects,
                generationType: GenerationType.CODE_GENERATION,
                projectRootPath: this.config.executionContext.workspacePath || this.config.executionContext.projectPath || '',
                generationId: this.config.generationId,
                threadId: 'default',
                migrationSourcePath: this.config.toolOptions?.migrationSourcePath,
                runningServices: runningServicesManager,
                webSearchEnabled: params.webSearchEnabled ?? false,
                ctx: this.config.executionContext,
            });

            // Accumulate tool call/result character counts across steps for breakdown estimation
            let accToolCallChars = 0;
            let accToolResultChars = 0;

            // === MID-STREAM COMPACTION GUARD ===
            // Watches actual inputTokens between steps and compacts when threshold is reached.
            // Uses 80% of the context window as the mid-stream trigger point.
            const compactionGuard = new CompactionGuard({
                engine: compactionManager.getEngine(),
                tokenThreshold: Math.floor(200_000 * 0.80),  // 160K tokens = 80% of context window
                maxCompactionAttempts: 3,
                preserveRecentMessageCount: 6,  // Keep last 3 tool-call + tool-result pairs
                eventHandler: this.config.eventHandler,
                originalUserMessage: Array.isArray(userMessageContent) 
                    ? userMessageContent.map((c: any) => c.text || '').join('\n') 
                    : String(userMessageContent),
                projectState,
                abortSignal: this.config.abortController.signal,
                persistCallback: (compactedMessages, metadata) =>
                    compactionManager.persistMidStreamCompaction(
                        workspaceId,
                        threadId,
                        this.config.generationId,
                        compactedMessages,
                        metadata
                    ),
            });

            // Stream LLM response with mid-stream compaction and dual stop conditions
            const { fullStream, response, totalUsage } = streamText({
                model,
                maxOutputTokens: 8192,
                temperature: 0,
                messages: allMessages,
                tools,
                abortSignal: this.config.abortController.signal,

                // MID-STREAM COMPACTION + PROMPT CACHING: compact if needed, then apply
                // incremental cache control to the last message so Anthropic caches the
                // growing conversation history on each step.
                prepareStep: async ({ steps, stepNumber, messages }) => {
                    const compacted = await compactionGuard.maybeCompact({ steps, stepNumber, messages });
                    const resolvedMessages = compacted ? compacted.messages : messages;
                    return { messages: addCacheControlToMessages({ messages: resolvedMessages, model }) };
                },

                // Emit per-step token usage for context usage widget + observability
                onStepFinish: (step) => {
                    // Accumulate tool call/result chars for per-category breakdown estimation
                    accToolCallChars += JSON.stringify(step.toolCalls ?? []).length;
                    accToolResultChars += JSON.stringify(step.toolResults ?? []).length;

                    // Persist partial modelMessages after each step so chat is recoverable mid-stream
                    const stepMessages = step.response?.messages ?? [];
                    if (stepMessages.length > 0) {
                        console.log(`[AgentExecutor] Step ${step.stepNumber} saving ${stepMessages.length} message(s) to chat storage`);
                        chatStateStorage.updateGeneration(workspaceId, threadId, this.config.generationId, {
                            modelMessages: [
                                { role: "user", content: userMessageContent },
                                ...stepMessages,
                            ],
                        });
                        updateAndSaveChat(this.config.generationId, Command.Agent, this.config.eventHandler);
                    }

                    if (step.usage) {
                        const inputTokens = step.usage.inputTokens || 0;
                        const cacheReadTokens = step.usage.inputTokenDetails?.cacheReadTokens || 0;
                        const cacheWriteTokens = step.usage.inputTokenDetails?.cacheWriteTokens || 0;
                        const outputTokens = step.usage.outputTokens || 0;
                        const cacheRatio = inputTokens > 0 ? (cacheReadTokens / inputTokens * 100).toFixed(1) : '0';
                        console.log(
                            `[AgentExecutor] Step ${step.stepNumber} complete: ` +
                            `input: ${inputTokens}, output: ${outputTokens}, ` +
                            `cache read: ${cacheReadTokens}, cache write: ${cacheWriteTokens} ` +
                            `(ratio: ${cacheRatio}%), finishReason: ${step.finishReason}`
                        );
                        this.config.eventHandler({
                            type: "usage_metrics",
                            usage: {
                                inputTokens,
                                cacheCreationInputTokens: (step.usage as any).cacheCreationInputTokens || 0,
                                cacheReadInputTokens: (step.usage as any).cacheReadInputTokens || 0,
                                outputTokens: step.usage.outputTokens || 0,
                            },
                            breakdown: computeTokenBreakdown(allMessages, tools, accToolCallChars, accToolResultChars, inputTokens),
                        });
                    }
                },

                // DUAL STOP CONDITIONS: step limit OR context exhaustion
                stopWhen: [stepCountIs(50), contextExhausted(compactionGuard)],
            });

            // Send start event to frontend
            this.config.eventHandler({ type: "start" });

            // Create stream context for handlers
            const streamContext: StreamContext = {
                eventHandler: this.config.eventHandler,
                modifiedFiles,
                allModifiedFiles,
                projects,
                shouldCleanup: false, // Review mode - don't cleanup immediately
                messageId: this.config.generationId,
                userMessageContent,
                response,
                totalUsage,
                ctx: this.config.executionContext,
                generationStartTime,
                projectId,
            };

            // Process stream events - NATIVE V6 PATTERN
            try {
                for await (const part of fullStream) {
                    await this.handleStreamPart(part, streamContext);
                }

                // Check if context was exhausted mid-stream and update context BEFORE handleStreamFinish logic
                if (compactionGuard.lastCompactionFailed) {
                    streamContext.compactionFailedMidStream = true;
                }

                // Check if abort was called after stream completed
                // This handles the case where abort happens but doesn't throw an error
                if (this.config.abortController.signal.aborted) {
                    console.log("[AgentExecutor] Detected abort after stream completion");
                    const abortError = new Error('Aborted by user');
                    abortError.name = 'AbortError';
                    throw abortError;
                }
            } catch (error: any) {
                // Handle abort specifically
                if (error.name === 'AbortError' || this.config.abortController.signal.aborted) {
                    console.log("[AgentExecutor] Aborted by user.");

                    // Get partial messages from SDK
                    let partialLLMMessages: any[] = [];
                    try {
                        const partialResponse = await response;
                        partialLLMMessages = partialResponse.messages || [];
                    } catch (e) {
                        console.warn("[AgentExecutor] Could not retrieve partial response messages:", e);
                    }

                    // Only save if LLM actually responded — user message without LLM response is meaningless
                    const projectRootPath = this.config.executionContext.workspacePath || this.config.executionContext.projectPath || '';
                    const threadId = 'default';
                    if (partialLLMMessages.length > 0) {
                        chatStateStorage.updateGeneration(projectRootPath, threadId, this.config.generationId, {
                            modelMessages: [
                                { role: "user", content: streamContext.userMessageContent },
                                ...partialLLMMessages,
                                {
                                    role: "user",
                                    content: `<abort_notification>
Generation stopped by user. The last in-progress task was not saved. Files have been reverted to the previous completed task state. Please redo the last task if needed.
</abort_notification>`,
                                },
                            ],
                        });
                        updateAndSaveChat(this.config.generationId, Command.Agent, this.config.eventHandler);
                    }
                    // Clear review state
                    const pendingReview = chatStateStorage.getPendingReviewGeneration(projectRootPath, threadId);
                    if (pendingReview && pendingReview.id === this.config.generationId) {
                        console.log("[AgentExecutor] Clearing review state due to abort");
                        chatStateStorage.declineAllReviews(projectRootPath, threadId);
                    }

                    // Send telemetry for generation abort
                    const abortTime = Date.now();
                    sendTelemetryEvent(
                        extension.ballerinaExtInstance,
                        TM_EVENT_BALLERINA_AI_GENERATION_ABORTED,
                        CMP_BALLERINA_AI_GENERATION,
                        {
                            'message.id': this.config.generationId,
                            'project.id': projectId,
                            'generation.start_time': generationStartTime.toString(),
                            'generation.abort_time': abortTime.toString(),
                            'generation.modified_files_count': modifiedFiles.length.toString(),
                        }
                    );

                    // Notify caller with partial messages (wizard migration history persistence)
                    if (this.config.onMessagesAvailable) {
                        this.config.onMessagesAvailable(
                            [{ role: "user", content: streamContext.userMessageContent }, ...partialLLMMessages],
                            'aborted'
                        );
                    }

                    // Note: Abort event is sent by base class handleExecutionError()
                }

                // Re-throw for base class error handling
                throw error;
            }

            // Update token estimation context with actual total usage
            try {
                const resolvedUsage = await totalUsage;
                if (resolvedUsage) {
                    const toolDefinitionsChars = JSON.stringify(tools).length;
                    compactionManager.updateTokenContext(
                        resolvedUsage.inputTokens ?? 0,
                        Math.ceil(getSystemPrompt(projects, params.operationType).length / 4),
                        Math.ceil(toolDefinitionsChars / 4) // Dynamic estimate for tool definitions
                    );
                }
            } catch (usageError) {
                console.warn('[AgentExecutor] Could not retrieve usage for token context update:', usageError);
            }

            return {
                tempProjectPath,
                modifiedFiles,
            };
        } catch (error) {
            // For abort errors, re-throw so base class can handle them
            if ((error as any).name === 'AbortError' || this.config.abortController.signal.aborted) {
                throw error;
            }

            console.error("[AgentExecutor] Non-abort error in execute():", error);

            // Abort the controller so that any in-flight tool executions
            // managed by the AI SDK are cancelled and stop emitting events.
            if (!this.config.abortController.signal.aborted) {
                this.config.abortController.abort();
            }

            this.config.eventHandler({
                type: "error",
                content: getErrorMessage(error)
            });

            // For other errors, return result with error
            return {
                tempProjectPath,
                modifiedFiles,
                error: error as Error,
            };
        } finally {
            // Stop all services started during this agent loop
            runningServicesManager.stopAll();
        }
    }

    /**
     * Handles individual stream events from the AI SDK.
     */
    private async handleStreamPart(
        part: TextStreamPart<any>,
        context: StreamContext
    ): Promise<void> {
        switch (part.type) {
            case "text-delta":
                context.eventHandler({
                    type: "content_block",
                    content: part.text
                });
                break;

            case "text-start":
                context.eventHandler({
                    type: "content_block",
                    content: " \n"
                });
                break;

            case "error":
                const error = part.error instanceof Error ? part.error : new Error(String(part.error));
                await this.handleStreamError(error, context);
                throw error;

            case "finish":
                await this.handleStreamFinish(context);
                break;

            case "tool-call":
                if (this.config.debugLogger) {
                    this._pendingToolCalls.set((part as any).toolCallId, Date.now());
                }
                break;

            case "tool-result":
                if (this.config.debugLogger) {
                    const startMs = this._pendingToolCalls.get((part as any).toolCallId);
                    if (startMs !== undefined) {
                        const durationMs = Date.now() - startMs;
                        const rawResult = (part as any).result;
                        const raw = typeof rawResult === "string"
                            ? rawResult
                            : rawResult === undefined
                                ? "<no result>"
                                : JSON.stringify(rawResult) ?? "<no result>";
                        this.config.debugLogger.logToolCall((part as any).toolName, durationMs, raw);
                        this._pendingToolCalls.delete((part as any).toolCallId);
                    }
                }
                break;

            default:
                // All other stream part types (step-finish, etc.) are handled by the SDK.
                break;
        }
    }

    /**
     * Handles stream errors with cleanup.
     * Clears review state to prevent stale data.
     */
    private async handleStreamError(error: Error, context: StreamContext): Promise<void> {
        console.error("[Agent] Stream error:", error);

        const tempProjectPath = context.ctx.tempProjectPath!;
        if (context.shouldCleanup) {
            // Note: cleanupTempProject now handles sendAgentDidClose internally
            await cleanupTempProject(tempProjectPath);
        }

        // Clear review state for this generation
        const projectRootPath = context.ctx.workspacePath || context.ctx.projectPath || '';
        const threadId = 'default';
        const pendingReview = chatStateStorage.getPendingReviewGeneration(projectRootPath, threadId);

        if (pendingReview && pendingReview.id === context.messageId) {
            console.log("[AgentExecutor] Clearing review state due to error");
            chatStateStorage.updateReviewState(projectRootPath, threadId, context.messageId, {
                status: 'error',
                errorMessage: getErrorMessage(error),
            });
        }

        // Send telemetry for generation failed
        const errorTime = Date.now();
        sendTelemetryException(
            extension.ballerinaExtInstance,
            error,
            CMP_BALLERINA_AI_GENERATION,
            {
                'event.name': TM_EVENT_BALLERINA_AI_GENERATION_FAILED,
                'message.id': context.messageId,
                'project.id': context.projectId,
                'error.message': getErrorMessage(error),
                'error.type': error.name || 'Unknown',
                'error.code': (error as any)?.code || 'N/A',
                'generation.start_time': context.generationStartTime.toString(),
                'generation.error_time': errorTime.toString(),
                'generation.duration_ms': (errorTime - context.generationStartTime).toString(),
            }
        );

        // Save partial LLM messages to storage and emit save_chat (mirrors abort path)
        let messagesToSave: any[] = [];
        try {
            const partialResponse = await context.response;
            messagesToSave = partialResponse.messages || [];
        } catch (e) {
            console.warn("[AgentExecutor] Could not retrieve partial response messages on error:", e);
        }

        if (messagesToSave.length > 0) {
            chatStateStorage.updateGeneration(projectRootPath, threadId, context.messageId, {
                modelMessages: [
                    { role: "user", content: context.userMessageContent },
                    ...messagesToSave,
                ],
            });
            updateAndSaveChat(context.messageId, Command.Agent, context.eventHandler);
        }

        context.eventHandler({
            type: "error",
            content: getErrorMessage(error)
        });
    }

    /**
     * Handles stream completion - runs diagnostics and updates chat state.
     */
    private async handleStreamFinish(context: StreamContext): Promise<void> {
        const finalResponse = await context.response;
        const assistantMessages = finalResponse.messages || [];
        const tempProjectPath = context.ctx.tempProjectPath!;

        // Check if mid-stream compaction forcefully stopped the model
        if (context.compactionFailedMidStream) {
            assistantMessages.push({
                role: 'assistant',
                content: `\n\n> **Notice:** The context window limit was reached mid-task, and the generation was paused cleanly. Please review the current state and issue a new prompt to continue where I left off.`
            });
            context.eventHandler({
                type: 'content_block',
                content: `\n\n> **Notice:** The context window limit was reached mid-task, and the generation was paused cleanly. Please review the current state and issue a new prompt to continue where I left off.`
            });
        }

        // Run final diagnostics
        const finalDiagnostics = await checkCompilationErrors(tempProjectPath);
        context.eventHandler({
            type: "diagnostics",
            diagnostics: finalDiagnostics.diagnostics
        });

        // Send telemetry for generation completion
        const generationEndTime = Date.now();
        const isPlanModeEnabled = workspace.getConfiguration('ballerina.ai').get<boolean>('planMode', false);
        const finalProjectMetrics = await getProjectMetrics(tempProjectPath);

        // Get total token usage across all agent steps (includes cache stats)
        const totalTokenUsage = await context.totalUsage;
        const inputTokens = totalTokenUsage.inputTokens || 0;
        const outputTokens = totalTokenUsage.outputTokens || 0;
        const totalTokens = totalTokenUsage.totalTokens || 0;
        const totalCacheRead = totalTokenUsage.inputTokenDetails?.cacheReadTokens || 0;
        const totalCacheWrite = totalTokenUsage.inputTokenDetails?.cacheWriteTokens || 0;
        console.log('[AgentExecutor] Generation complete — token usage:', {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens,
            cacheRead: totalCacheRead,
            cacheWrite: totalCacheWrite,
            cacheRatio: `${inputTokens > 0 ? (totalCacheRead / inputTokens * 100).toFixed(1) : '0'}%`,
        });

        // Send telemetry for generation complete
        sendTelemetryEvent(
            extension.ballerinaExtInstance,
            TM_EVENT_BALLERINA_AI_GENERATION_COMPLETED,
            CMP_BALLERINA_AI_GENERATION,
            {
                'message.id': context.messageId,
                'project.id': context.projectId,
                'generation.modified_files_count': context.modifiedFiles.length.toString(),
                'generation.start_time': context.generationStartTime.toString(),
                'generation.end_time': generationEndTime.toString(),
                'plan_mode': isPlanModeEnabled.toString(),
                'project.files_after': finalProjectMetrics.fileCount.toString(),
                'project.lines_after': finalProjectMetrics.lineCount.toString(),
                'tokens.input': inputTokens.toString(),
                'tokens.output': outputTokens.toString(),
                'tokens.total': totalTokens.toString(),
            }
        );

        // Update chat state storage
        await this.updateChatState(context, assistantMessages, tempProjectPath);

        // Emit UI events
        await this.emitReviewActions(context);
    }

    /**
     * Updates chat state storage with generation results.
     * Includes accumulated modified files tracking across review continuations.
     */
    private async updateChatState(
        context: StreamContext,
        assistantMessages: any[],
        tempProjectPath: string
    ): Promise<void> {
        const projectRootPath = context.ctx.workspacePath || context.ctx.projectPath || '';
        const threadId = 'default';

        // Check if we're updating an existing review context
        const existingReview = chatStateStorage.getPendingReviewGeneration(projectRootPath, threadId);
        const generationModifiedFiles = Array.from(new Set([...context.allModifiedFiles, ...context.modifiedFiles]));
        let accumulatedModifiedFiles = generationModifiedFiles;

        if (existingReview && existingReview.reviewState.tempProjectPath === tempProjectPath) {
            const existingFiles = new Set(existingReview.reviewState.modifiedFiles || []);
            accumulatedModifiedFiles = Array.from(new Set([...existingFiles, ...generationModifiedFiles]));
            console.log(`[AgentExecutor] Accumulated modified files: ${accumulatedModifiedFiles.length} total (${existingReview.reviewState.modifiedFiles?.length || 0} existing + ${generationModifiedFiles.length} new)`);
        }

        // Update chat state storage with user message + assistant messages
        chatStateStorage.updateGeneration(projectRootPath, threadId, context.messageId, {
            modelMessages: [
                { role: "user", content: context.userMessageContent },
                ...assistantMessages,
            ],
        });

        // Skip review mode if no files were modified
        if (accumulatedModifiedFiles.length === 0) {
            console.log("[AgentExecutor] No modified files - skipping review mode");
            return;
        }

        // Determine which packages have been affected by the changes
        // This returns temp package paths for use with Language Server APIs
        const affectedPackagePaths = await determineAffectedPackages(
            accumulatedModifiedFiles,
            context.projects,
            context.ctx,
            tempProjectPath
        );

        // Update review state and open review mode
        chatStateStorage.updateReviewState(projectRootPath, threadId, context.messageId, {
            status: 'under_review',
            tempProjectPath,
            modifiedFiles: accumulatedModifiedFiles,
            affectedPackagePaths: affectedPackagePaths,
        });

        // ReviewMode will be opened with data from emitReviewActions
    }

    /**
     * Emits review actions and chat save events to UI.
     */
    private async emitReviewActions(context: StreamContext): Promise<void> {
        // Use accumulated modifiedFiles from chatStateStorage (merged across review continuations)
        const workspaceId = context.ctx.workspacePath || context.ctx.projectPath;
        const threadId = 'default';
        const pendingReview = chatStateStorage.getPendingReviewGeneration(workspaceId, threadId);
        const generationModifiedFiles = Array.from(new Set([...context.allModifiedFiles, ...context.modifiedFiles]));
        const accumulatedModifiedFiles = pendingReview
            ? Array.from(new Set([...pendingReview.reviewState.modifiedFiles, ...generationModifiedFiles]))
            : generationModifiedFiles;

        if (accumulatedModifiedFiles.length > 0) {
            const semanticDiffs: SemanticDiff[] = [];
            let loadDesignDiagrams = false;
            let affectedPackages: string[] = [];
            const diffPackageMap: string[] = [];
            const langClient = StateMachine.context().langClient;
            const tempDir = context.ctx.tempProjectPath!;
            affectedPackages = pendingReview?.reviewState.affectedPackagePaths?.length
                ? pendingReview.reviewState.affectedPackagePaths
                : await determineAffectedPackages(accumulatedModifiedFiles, context.projects, context.ctx, tempDir);
            const isWorkspace = StateMachine.context().projectInfo?.projectKind === PROJECT_KIND.WORKSPACE_PROJECT;
            for (const pkg of affectedPackages) {
                // Skip workspace root — it only contains Ballerina.toml, not a real package
                if (isWorkspace && pkg === tempDir) { continue; }
                const pkgName = path.basename(pkg);
                try {
                    const res = await langClient.getSemanticDiff({ projectPath: pkg });
                    if (res) {
                        diffPackageMap.push(...Array(res.semanticDiffs.length).fill(pkgName));
                        semanticDiffs.push(...res.semanticDiffs);
                        loadDesignDiagrams = loadDesignDiagrams || res.loadDesignDiagrams;
                    }
                } catch (err) {
                    console.error(`[AgentExecutor] getSemanticDiff failed for package ${pkg}, falling back to plain modifiedFiles`, err);
                    semanticDiffs.length = 0;
                    diffPackageMap.length = 0;
                    loadDesignDiagrams = false;
                    break;
                }
            }

            const reviewData: ReviewModeData = {
                views: [],
                currentIndex: 0,
                semanticDiffs,
                loadDesignDiagrams,
                affectedPackages,
                modifiedFiles: accumulatedModifiedFiles,
                tempProjectPath: context.ctx.tempProjectPath!,
                isWorkspace,
            };

            const hasSemanticResults = loadDesignDiagrams || semanticDiffs.length > 0;
            const isBI = StateMachine.context().isBI;
            const autoOpen = !!(isBI && hasSemanticResults);
            approvalViewManager.openReviewMode(reviewData, false);

            context.eventHandler({
                type: "chat_component",
                componentType: "review",
                data: { modifiedFiles: accumulatedModifiedFiles, semanticDiffs, loadDesignDiagrams, affectedPackages, isWorkspace, diffPackageMap }
            });
        }

        updateAndSaveChat(context.messageId, Command.Agent, context.eventHandler);
        context.eventHandler({ type: "stop", command: Command.Agent });
    }

    protected getCommandType(): Command {
        return Command.Agent;
    }
}
