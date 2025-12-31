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
import { Command, GenerateAgentCodeRequest, ProjectSource } from '@wso2/ballerina-core';
import { ModelMessage, stepCountIs, streamText, TextStreamPart } from 'ai';
import { getAnthropicClient, getProviderCacheControl, ANTHROPIC_SONNET_4 } from '../utils/ai-client';
import { populateHistoryForAgent, getErrorMessage } from '../utils/ai-utils';
import { sendAgentDidOpenForProjects, sendAgentDidCloseForProjects } from '../utils/project/ls-schema-notifications';
import { getSystemPrompt, getUserPrompt } from './prompts';
import { GenerationType, getAllLibraries } from '../utils/libs/libraries';
import { createToolRegistry } from './tool-registry';
import { getProjectSource, cleanupTempProject } from '../utils/project/temp-project';
import { StreamContext } from './stream-handlers/stream-context';
import { checkCompilationErrors } from './tools/diagnostics-utils';
import { updateAndSaveChat } from '../utils/events';
import { chatStateStorage } from '../../../views/ai-panel/chatStateStorage';

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
        const projectPath = this.config.executionContext.projectPath;
        const params = this.config.params; // Access params from config
        const modifiedFiles: string[] = [];

        try {
            // 1. Get project sources from temp directory
            const projects: ProjectSource[] = await getProjectSource(
                params.operationType,
                this.config.executionContext
            );

            // 2. Send didOpen only if creating NEW temp (not reusing for review continuation)
            if (!this.config.lifecycle?.existingTempPath) {
                sendAgentDidOpenForProjects(tempProjectPath, projectPath, projects);
            } else {
                console.log(`[AgentExecutor] Skipping didOpen (reusing temp for review continuation)`);
            }

            // 3. Add generation to chat storage (if enabled)
            this.addGeneration(params.usecase, {
                isPlanMode: params.isPlanMode,
                operationType: params.operationType,
                generationType: 'agent',
            });

            // 4. Get chat history from storage (if enabled)
            const chatHistory = this.getChatHistory();
            console.log(`[AgentExecutor] Using ${chatHistory.length} chat history messages`);

            // 5. Build LLM messages with history
            const historyMessages = populateHistoryForAgent(chatHistory);
            const cacheOptions = await getProviderCacheControl();
            const userMessageContent = getUserPrompt(params, tempProjectPath, projects);

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

            // Get libraries for library provider tool
            const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
            const libraryDescriptions = allLibraries.length > 0
                ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
                : "- No libraries available";

            // Create tools
            const tools = createToolRegistry({
                eventHandler: this.config.eventHandler,
                tempProjectPath,
                projectPath,
                modifiedFiles,
                projects,
                libraryDescriptions,
                generationType: GenerationType.CODE_GENERATION,
                workspaceId: this.config.executionContext.projectPath,
                generationId: this.config.messageId,
                threadId: 'default',
            });

            // Stream LLM response
            const { fullStream, response } = streamText({
                model: await getAnthropicClient(ANTHROPIC_SONNET_4),
                maxOutputTokens: 8192,
                temperature: 0,
                messages: allMessages,
                stopWhen: stepCountIs(50),
                tools,
                abortSignal: this.config.abortController.signal,
            });

            // Send start event to frontend
            this.config.eventHandler({ type: "start" });

            // Create stream context for handlers
            const streamContext: StreamContext = {
                eventHandler: this.config.eventHandler,
                modifiedFiles,
                projects,
                shouldCleanup: false, // Review mode - don't cleanup immediately
                messageId: this.config.messageId,
                userMessageContent,
                response,
                ctx: this.config.executionContext,
            };

            // Process stream events - NATIVE V6 PATTERN
            for await (const part of fullStream) {
                await this.handleStreamPart(part, streamContext);
            }

            return {
                tempProjectPath,
                modifiedFiles,
            };
        } catch (error) {
            // Error handling is done by base class in run()
            // Just return result with error
            return {
                tempProjectPath,
                modifiedFiles,
                error: error as Error,
            };
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

            default:
                // Tool calls/results handled automatically by SDK
                break;
        }
    }

    /**
     * Handles stream errors with cleanup.
     */
    private async handleStreamError(error: Error, context: StreamContext): Promise<void> {
        console.error("[Agent] Stream error:", error);

        const tempProjectPath = context.ctx.tempProjectPath!;
        if (context.shouldCleanup) {
            sendAgentDidCloseForProjects(tempProjectPath, context.projects);
            cleanupTempProject(tempProjectPath);
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

        // Run final diagnostics
        const finalDiagnostics = await checkCompilationErrors(tempProjectPath);
        context.eventHandler({
            type: "diagnostics",
            diagnostics: finalDiagnostics.diagnostics
        });

        // Update chat state storage
        await this.updateChatState(context, assistantMessages, tempProjectPath);

        // Emit UI events
        await this.emitReviewActions(context);
    }

    /**
     * Updates chat state storage with generation results.
     */
    private async updateChatState(
        context: StreamContext,
        assistantMessages: any[],
        tempProjectPath: string
    ): Promise<void> {
        const workspaceId = context.ctx.projectPath;
        const threadId = 'default';

        chatStateStorage.updateReviewState(workspaceId, threadId, context.messageId, {
            status: 'under_review',
            tempProjectPath,
            modifiedFiles: context.modifiedFiles,
        });

        chatStateStorage.updateGeneration(workspaceId, threadId, context.messageId, {
            modelMessages: assistantMessages,
        });
    }

    /**
     * Emits review actions and chat save events to UI.
     */
    private async emitReviewActions(context: StreamContext): Promise<void> {
        context.eventHandler({ type: "review_actions" });
        updateAndSaveChat(context.messageId, Command.Agent, context.eventHandler);
        context.eventHandler({ type: "stop", command: Command.Agent });
    }

    protected getCommandType(): Command {
        return Command.Agent;
    }
}
