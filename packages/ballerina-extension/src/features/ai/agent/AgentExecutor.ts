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

import { AICommandExecutor, AIExecutionConfig, AIExecutionResult } from '../executors/base/AICommandExecutor';
import { Command, GenerateAgentCodeRequest, ProjectSource, AIChatMachineEventType } from '@wso2/ballerina-core';
import { ModelMessage, stepCountIs, streamText } from 'ai';
import { getAnthropicClient, getProviderCacheControl, ANTHROPIC_SONNET_4 } from '../utils/ai-client';
import { populateHistoryForAgent } from '../utils/ai-utils';
import { sendAgentDidOpenForProjects } from '../utils/project/ls-schema-notifications';
import { getSystemPrompt, getUserPrompt } from './prompts';
import { GenerationType, getAllLibraries } from '../utils/libs/libraries';
import { createToolRegistry } from './tool-registry';
import { getProjectSource } from '../utils/project/temp-project';
import { createAgentEventRegistry } from './stream-handlers/create-agent-event-registry';
import { StreamContext } from './stream-handlers/stream-context';
import { StreamErrorException, StreamAbortException, StreamFinishException } from './stream-handlers/stream-event-handler';

/**
 * AgentExecutor - Executes agent-based code generation with tools and streaming
 *
 * Features:
 * - Multi-turn conversation with LLM
 * - Tool execution (TaskWrite, FileEdit, Diagnostics, etc.)
 * - Stream event processing
 * - Plan approval workflow (via ApprovalManager in TaskWrite tool)
 */
export class AgentExecutor extends AICommandExecutor {
    private params: GenerateAgentCodeRequest;

    constructor(config: AIExecutionConfig, params: GenerateAgentCodeRequest) {
        super(config);
        this.params = params;
    }

    /**
     * Execute agent code generation
     *
     * Flow:
     * 1. Get project sources from temp directory
     * 2. Send didOpen notifications to Language Server
     * 3. Build LLM messages (system + history + user)
     * 4. Create tools (TaskWrite, FileEdit, Diagnostics, etc.)
     * 5. Stream LLM response and process events
     * 6. Return modified files
     */
    async execute(): Promise<AIExecutionResult> {
        const tempProjectPath = this.config.executionContext.tempProjectPath!;
        const projectPath = this.config.executionContext.projectPath;
        const modifiedFiles: string[] = [];

        try {
            // Get project sources from temp directory
            const projects: ProjectSource[] = await getProjectSource(
                this.params.operationType,
                this.config.executionContext
            );

            // Send didOpen for all initial project files
            sendAgentDidOpenForProjects(tempProjectPath, projectPath, projects);

            // Build messages
            const historyMessages = populateHistoryForAgent(this.params.chatHistory);
            const cacheOptions = await getProviderCacheControl();
            const userMessageContent = getUserPrompt(this.params, tempProjectPath, projects);

            const allMessages: ModelMessage[] = [
                {
                    role: "system",
                    content: getSystemPrompt(projects, this.params.operationType),
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
                tempProjectPath,
                projects,
                shouldCleanup: this.shouldCleanup,
                messageId: this.config.messageId,
                userMessageContent,
                response,
                ctx: this.config.executionContext,
            };

            // Create event registry
            const registry = createAgentEventRegistry();

            // Process stream events
            try {
                for await (const part of fullStream) {
                    // Let registry handle all events
                    // Message history is tracked automatically by SDK in response.messages
                    await registry.handleEvent(part, streamContext);
                }
            } catch (e) {
                // Handle stream exceptions (error, abort, finish)
                if (e instanceof StreamErrorException ||
                    e instanceof StreamAbortException ||
                    e instanceof StreamFinishException) {
                    // These are expected flow control exceptions
                    console.log(`[AgentExecutor] Stream ended: ${e.constructor.name}`);
                } else {
                    throw e;
                }
            }

            return {
                tempProjectPath,
                modifiedFiles,
            };
        } catch (error) {
            this.handleError(error);
            return {
                tempProjectPath,
                modifiedFiles,
                error: error as Error,
            };
        }
    }

    protected getCommandType(): Command {
        return Command.Agent;
    }
}
