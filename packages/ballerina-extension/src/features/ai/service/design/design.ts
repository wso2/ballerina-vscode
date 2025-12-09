// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { Command, GenerateAgentCodeRequest, ProjectSource, AIChatMachineEventType} from "@wso2/ballerina-core";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { getAnthropicClient, getProviderCacheControl, ANTHROPIC_SONNET_4 } from "../connection";
import { getErrorMessage, populateHistoryForAgent } from "../utils";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../rpc-managers/ai-panel/utils";
import { createTaskWriteTool, TASK_WRITE_TOOL_NAME, TaskWriteResult } from "../libs/task_write_tool";
import { createDiagnosticsTool, DIAGNOSTICS_TOOL_NAME } from "../libs/diagnostics_tool";
import { checkCompilationErrors } from "../libs/diagnostics_utils";
import { createBatchEditTool, createEditExecute, createEditTool, createMultiEditExecute, createReadExecute, createReadTool, createWriteExecute, createWriteTool, FILE_BATCH_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME } from "../libs/text_editor_tool";
import { sendAgentDidOpenForProjects } from "../libs/agent_ls_notification_utils";
import { getLibraryProviderTool } from "../libs/libraryProviderTool";
import { GenerationType, getAllLibraries, LIBRARY_PROVIDER_TOOL } from "../libs/libs";
import { getHealthcareLibraryProviderTool, HEALTHCARE_LIBRARY_PROVIDER_TOOL } from "../libs/healthcareLibraryProviderTool";
import { Library } from "../libs/libs_types";
import { AIChatStateMachine } from "../../../../views/ai-panel/aiChatMachine";
import { getTempProject as createTempProjectOfWorkspace, cleanupTempProject } from "../../utils/project-utils";
import { integrateCodeToWorkspace } from "./utils";
import { getSystemPrompt, getUserPrompt } from "./prompts";
import { createConnectorGeneratorTool, CONNECTOR_GENERATOR_TOOL } from "../libs/connectorGeneratorTool";
import { LangfuseExporter } from 'langfuse-vercel';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { getProjectSource } from "../../utils/project-utils";

const LANGFUSE_SECRET = process.env.LANGFUSE_SECRET;
const LANGFUSE_PUBLIC = process.env.LANGFUSE_PUBLIC;

const langfuseExporter = new LangfuseExporter({
    secretKey: LANGFUSE_SECRET,
    publicKey: LANGFUSE_PUBLIC,
    baseUrl: 'https://cloud.langfuse.com', // 🇪🇺 EU region
});
const sdk = new NodeSDK({
    traceExporter: langfuseExporter,
    instrumentations: [getNodeAutoInstrumentations()],
});
sdk.start();

// TODO: Tool name, types and used in both ext and visualizer to display, either move to core or use visualizer as view only.

export async function generateDesignCore(
    params: GenerateAgentCodeRequest,
    eventHandler: CopilotEventHandler
): Promise<string> {
    const isPlanModeEnabled = params.isPlanMode;
    const messageId = params.messageId;

    const tempProjectPath = (await createTempProjectOfWorkspace()).path;
    const shouldCleanup = !process.env.AI_TEST_ENV;

    const projects: ProjectSource[] = await getProjectSource(params.operationType); // TODO: Fix multi project

    // Send didOpen for all initial project files
    sendAgentDidOpenForProjects(tempProjectPath, projects);

    const historyMessages = populateHistoryForAgent(params.chatHistory);

    const cacheOptions = await getProviderCacheControl();

    const modifiedFiles: string[] = [];

    const userMessageContent = getUserPrompt(params.usecase, tempProjectPath, projects, isPlanModeEnabled, params.codeContext);
    const allMessages: ModelMessage[] = [
        {
            role: "system",
            content: getSystemPrompt(),
            providerOptions: cacheOptions,
        },
        ...historyMessages,
        {
            role: "user",
            content: userMessageContent,
            // providerOptions: cacheOptions,
        },
    ];

    const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
    const libraryDescriptions = allLibraries.length > 0
        ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
        : "- No libraries available";

    const tools = {
        [TASK_WRITE_TOOL_NAME]: createTaskWriteTool(eventHandler, tempProjectPath, modifiedFiles),
        [LIBRARY_PROVIDER_TOOL]: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
        [HEALTHCARE_LIBRARY_PROVIDER_TOOL]: getHealthcareLibraryProviderTool(libraryDescriptions),
        [CONNECTOR_GENERATOR_TOOL]: createConnectorGeneratorTool(eventHandler, tempProjectPath, projects[0].projectName, modifiedFiles),
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(tempProjectPath, modifiedFiles)),
        [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(tempProjectPath, modifiedFiles)),
        [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(createMultiEditExecute(tempProjectPath, modifiedFiles)),
        [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(tempProjectPath)),
        [DIAGNOSTICS_TOOL_NAME]: createDiagnosticsTool(tempProjectPath),
    };

    const { fullStream, response } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 8192,
        temperature: 0,
        messages: allMessages,
        stopWhen: stepCountIs(50),
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
        experimental_telemetry: { isEnabled: true },
    });


    AIChatStateMachine.sendEvent({
        type: AIChatMachineEventType.PLANNING_STARTED
    });

    eventHandler({ type: "start" });

    let selectedLibraries: string[] = [];

    let accumulatedMessages: any[] = [];
    let currentAssistantContent: any[] = [];

    for await (const part of fullStream) {
        switch (part.type) {
            case "text-delta": {
                const textPart = part.text;
                eventHandler({ type: "content_block", content: textPart });
                accumulateTextContent(currentAssistantContent, textPart);
                break;
            }
            case "tool-call": {
                const toolName = part.toolName;
                accumulateToolCall(currentAssistantContent, part);

                if (toolName === "LibraryProviderTool" || toolName === HEALTHCARE_LIBRARY_PROVIDER_TOOL) {
                    selectedLibraries = (part.input as any)?.libraryNames || [];
                    eventHandler({ type: "tool_call", toolName });

                } else if (
                    [
                        FILE_WRITE_TOOL_NAME,
                        FILE_SINGLE_EDIT_TOOL_NAME,
                        FILE_BATCH_EDIT_TOOL_NAME,
                    ].includes(toolName)
                ) {
                    const input = part.input as any;
                    const fileName = input?.file_path ? input.file_path.split('/').pop() : 'file';
                    eventHandler({
                        type: "tool_call",
                        toolName,
                        toolInput: { fileName }
                    });
                } else {
                    eventHandler({ type: "tool_call", toolName });
                }
                break;
            }
            case "tool-result": {
                const toolName = part.toolName;
                const result = part.output;
                saveToolResult(part, accumulatedMessages, currentAssistantContent);

                if (toolName === TASK_WRITE_TOOL_NAME && result) {
                    const taskResult = result as TaskWriteResult;
                    eventHandler({
                        type: "tool_result",
                        toolName,
                        toolOutput: {
                            success: taskResult.success,
                            message: taskResult.message,
                            allTasks: taskResult.tasks,
                        },
                    });
                } else if (toolName === "LibraryProviderTool" || toolName === HEALTHCARE_LIBRARY_PROVIDER_TOOL) {
                    const libraryNames = (part.output as Library[]).map((lib) => lib.name);
                    const fetchedLibraries = libraryNames.filter((name) => selectedLibraries.includes(name));
                    eventHandler({ type: "tool_result", toolName, toolOutput: fetchedLibraries });

                } else if (
                    [
                        FILE_WRITE_TOOL_NAME,
                        FILE_SINGLE_EDIT_TOOL_NAME,
                        FILE_BATCH_EDIT_TOOL_NAME,
                    ].includes(toolName)
                ) {
                    // Extract action from result message for file_write
                    let action = undefined;
                    if (toolName === FILE_WRITE_TOOL_NAME && result) {
                        const message = (result as any).message || '';
                        if (message.includes('updated')) {
                            action = 'updated';
                        } else if (message.includes('created')) {
                            action = 'created';
                        }
                    }

                    eventHandler({
                        type: "tool_result",
                        toolName,
                        toolOutput: { success: true, action }
                    });
                } else if (toolName === DIAGNOSTICS_TOOL_NAME) {
                    eventHandler({
                        type: "tool_result",
                        toolName,
                        toolOutput: result
                    });
                } else {
                    eventHandler({ type: "tool_result", toolName });
                }
                break;
            }
            case "error": {
                const error = part.error;
                console.error("[Design] Error:", error);
                if (shouldCleanup) {
                    cleanupTempProject(tempProjectPath);
                }
                eventHandler({ type: "error", content: getErrorMessage(error) });
                return tempProjectPath;
            }
            case "text-start": {
                eventHandler({ type: "content_block", content: " \n" });
                break;
            }
            case "abort": {
                console.log("[Design] Aborted by user.");
                let messagesToSave: any[] = [];
                try {
                    const partialResponse = await response;
                    messagesToSave = partialResponse.messages || [];
                } catch (error) {
                    if (currentAssistantContent.length > 0) {
                        accumulatedMessages.push({
                            role: "assistant",
                            content: currentAssistantContent,
                        });
                    }
                    messagesToSave = accumulatedMessages;
                }

                // Add user message to inform about abort and file reversion
                messagesToSave.push({
                    role: "user",
                    content: `<abort_notification>
Generation stopped by user. The last in-progress task was not saved. Files have been reverted to the previous completed task state. Please redo the last task if needed.
</abort_notification>`,
                });

                if (shouldCleanup) {
                    cleanupTempProject(tempProjectPath);
                }

                updateAndSaveChat(messageId, userMessageContent, messagesToSave, eventHandler);
                eventHandler({ type: "abort", command: Command.Design });
                AIChatStateMachine.sendEvent({
                    type: AIChatMachineEventType.FINISH_EXECUTION,
                });
                return tempProjectPath;
            }
            case "text-start": {
                currentAssistantContent.push({ type: "text", text: "" });
                eventHandler({ type: "content_block", content: " \n" });
                break;
            }
            case "finish": {
                const finalResponse = await response;
                const assistantMessages = finalResponse.messages || [];

                const finalDiagnostics = await checkCompilationErrors(tempProjectPath);
                if (finalDiagnostics.diagnostics && finalDiagnostics.diagnostics.length > 0) {
                    eventHandler({
                        type: "diagnostics",
                        diagnostics: finalDiagnostics.diagnostics
                    });
                }

                if (!process.env.AI_TEST_ENV && modifiedFiles.length > 0) {
                    const modifiedFilesSet = new Set(modifiedFiles);
                    await integrateCodeToWorkspace(tempProjectPath, modifiedFilesSet);
                }

                if (shouldCleanup) {
                    cleanupTempProject(tempProjectPath);
                }

                updateAndSaveChat(messageId, userMessageContent, assistantMessages, eventHandler);
                eventHandler({ type: "stop", command: Command.Design });
                AIChatStateMachine.sendEvent({
                    type: AIChatMachineEventType.FINISH_EXECUTION,
                });
                await langfuseExporter.forceFlush();
                return tempProjectPath;
            }
        }
        }

    return tempProjectPath;
}

/**
 * Updates chat message with model messages and triggers save
 */
function updateAndSaveChat(
    messageId: string,
    userMessageContent: any,
    assistantMessages: any[],
    eventHandler: CopilotEventHandler
): void {
    const completeMessages = [
        {
            role: "user",
            content: userMessageContent,
        },
        ...assistantMessages
    ];

    AIChatStateMachine.sendEvent({
        type: AIChatMachineEventType.UPDATE_CHAT_MESSAGE,
        payload: {
            id: messageId,
            modelMessages: completeMessages,
        },
    });

    eventHandler({ type: "save_chat", command: Command.Design, messageId });
}

export async function generateDesign(params: GenerateAgentCodeRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Design);
    try {
        await generateDesignCore(params, eventHandler);
    } catch (error) {
        console.error("Error during design generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}

function accumulateTextContent(currentAssistantContent: any[], textPart: string): void {
    const lastContent = currentAssistantContent[currentAssistantContent.length - 1];
    if (lastContent && lastContent.type === "text") {
        lastContent.text += textPart;
    }
}

function accumulateToolCall(currentAssistantContent: any[], part: any): void {
    currentAssistantContent.push({
        type: "tool-call",
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        input: part.input
    });
}

function saveToolResult(
    part: any,
    accumulatedMessages: any[],
    currentAssistantContent: any[]
): void {
    if (currentAssistantContent.length > 0) {
        accumulatedMessages.push({
            role: "assistant",
            content: [...currentAssistantContent]
        });
        currentAssistantContent.length = 0;
    }

    // Need to specify output type for tool result
    const outputType: 'json' = 'json';

    accumulatedMessages.push({
        role: "tool",
        content: [{
            type: "tool-result",
            toolCallId: part.toolCallId,
            toolName: part.toolName,
            output: {
                type: outputType,
                value: part.output
            }
        }]
    });
}
