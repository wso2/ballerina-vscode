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

import { Command, GenerateAgentCodeRequest, ProjectSource, SourceFiles, AIChatMachineEventType} from "@wso2/ballerina-core";
import { convertToModelMessages, ModelMessage, stepCountIs, streamText } from "ai";
import { getAnthropicClient, getProviderCacheControl, ANTHROPIC_SONNET_4 } from "../connection";
import { getErrorMessage, populateHistoryForAgent, transformProjectSource } from "../utils";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../rpc-managers/ai-panel/utils";
import { createTaskWriteTool, TASK_WRITE_TOOL_NAME, TaskWriteResult } from "../libs/task_write_tool";
import { getProjectSource } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { createBatchEditTool, createEditExecute, createEditTool, createMultiEditExecute, createReadExecute, createReadTool, createWriteExecute, createWriteTool, FILE_BATCH_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME } from "../libs/text_editor_tool";
import { getLibraryProviderTool } from "../libs/libraryProviderTool";
import { GenerationType, getAllLibraries } from "../libs/libs";
import { Library } from "../libs/libs_types";
import { AIChatStateMachine } from "../../../../views/ai-panel/aiChatMachine";
import { getTempProject, FileModificationInfo } from "../../utils/temp-project-utils";
import { formatCodebaseStructure } from "./utils";

export async function generateDesignCore(params: GenerateAgentCodeRequest, eventHandler: CopilotEventHandler): Promise<void> {
    const assistantMessageId = params.assistantMessageId;
    const project: ProjectSource = await getProjectSource(params.operationType);
    const historyMessages = populateHistoryForAgent(params.chatHistory);
    const hasHistory = historyMessages.length > 0;
    const { path: tempProjectPath, modifications } = await getTempProject(project, hasHistory);
    const cacheOptions = await getProviderCacheControl();

    const modifiedFiles: string[] = [];

    const allMessages: ModelMessage[] = [
        {
            role: "system",
            content: getSystemPrompt(),
            providerOptions: cacheOptions,
        },
        ...historyMessages,
        {
            role: "user",
            content: getUserPrompt(params.usecase, modifications, hasHistory, tempProjectPath),
            providerOptions: cacheOptions,
        },
    ];

    const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
    const libraryDescriptions = allLibraries.length > 0
        ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
        : "- No libraries available";

    const tools = {
        [TASK_WRITE_TOOL_NAME]: createTaskWriteTool(eventHandler, tempProjectPath, modifiedFiles),
        LibraryProviderTool: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(tempProjectPath, modifiedFiles)),
        [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(tempProjectPath, modifiedFiles)),
        [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(createMultiEditExecute(tempProjectPath, modifiedFiles)),
        [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(tempProjectPath)),
    };

    const { fullStream, response, steps } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 8192,
        temperature: 0,
        messages: allMessages,
        stopWhen: stepCountIs(50),
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
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

                if (toolName === "LibraryProviderTool") {
                    selectedLibraries = (part.input as any)?.libraryNames || [];
                } else if ([FILE_WRITE_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_BATCH_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME].includes(toolName)) {
                    const input = part.input as any;
                    if (input && input.file_path) {
                        let fileName = input.file_path;
                    }
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
                } else if (toolName === "LibraryProviderTool") {
                    const libraryNames = (part.output as Library[]).map((lib) => lib.name);
                    const fetchedLibraries = libraryNames.filter((name) => selectedLibraries.includes(name));
                }
                else if ([FILE_WRITE_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_BATCH_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME].includes(toolName)) {
                } else {
                    eventHandler({ type: "tool_result", toolName });
                }
                break;
            }
            case "error": {
                const error = part.error;
                console.error("[Design] Error:", error);
                eventHandler({ type: "error", content: getErrorMessage(error) });
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
                // TODO: Need to send both user message and assistant message here
                if (messagesToSave.length > 0) {
                    AIChatStateMachine.sendEvent({
                        type: AIChatMachineEventType.UPDATE_ASSISTANT_MESSAGE,
                        payload: {
                            id: assistantMessageId,
                            modelMessages: messagesToSave,
                        },
                    });
                }

                eventHandler({ type: "abort", command: Command.Design });
                eventHandler({ type: "save_chat", command: Command.Design, assistantMessageId });
                AIChatStateMachine.sendEvent({
                    type: AIChatMachineEventType.FINISH_EXECUTION,
                });
                break;
            }
            case "text-start": {
                currentAssistantContent.push({ type: "text", text: "" });
                eventHandler({ type: "content_block", content: " \n" });
                break;
            }
            case "finish": {
                const finishReason = part.finishReason;
                const finalResponse = await response;
                const assistantMessages = finalResponse.messages || [];

                console.log(`[Design] Finished with reason: ${finishReason}`);

                // TODO: Need to send both user message and assistant message here
                AIChatStateMachine.sendEvent({
                    type: AIChatMachineEventType.UPDATE_ASSISTANT_MESSAGE,
                    payload: {
                        id: assistantMessageId,
                        modelMessages: assistantMessages,
                    },
                });

                eventHandler({ type: "stop", command: Command.Design });
                eventHandler({ type: "save_chat", command: Command.Design, assistantMessageId });
                AIChatStateMachine.sendEvent({
                    type: AIChatMachineEventType.FINISH_EXECUTION,
                });
                break;
            }
            }
        }
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

/**
 * Generates the system prompt for the design agent
 */
function getSystemPrompt(): string {
    return `You are an expert assistant to help with writing ballerina integrations. You will be helping with designing a solution for user query in a step-by-step manner.

ONLY answer Ballerina-related queries.

# Plan Mode Approach

## Step 1: Create High-Level Design
Create a very high-level and concise design plan for the given user requirement.

## Step 2: Break Down Into Tasks and Execute

**REQUIRED: Use Task Management**
You have access to ${TASK_WRITE_TOOL_NAME} tool to create and manage tasks.
This plan will be visible to the user and the execution will be guided on the tasks you create.

- Break down the implementation into specific, actionable tasks.
- Each task should have a type. This type will be used to guide the user through the generation proccess.
- Track each task as you work through them
- Mark tasks as you start and complete them
- This ensures you don't miss critical steps
- Each task should be concise and high level as they are visible to a very high level user. During the implementation, you will break them down further as needed and implement them.

**Task Types**:
1. 'service_design'
- Responsible for creating the http listener, service, and its resource function signatures.
- The signature should only have path, query, payload, header paramters and the return types. This step should contain types relevant to the service contract as well.
2. 'connections_init'
- Responsible for initializing connections/clients
- This step should only contain the Client initialization.
3. 'implementation'
- for all the other implementations. Have resource function implementations in its own task.

**Task Breakdown Example**:
1. Create the HTTP service contract
2. Create the MYSQL Connection
3. Implement the resource functions

**Critical Rules**:
- Task management is MANDATORY for all implementations
- When using ${TASK_WRITE_TOOL_NAME}, always send ALL tasks on every call
- Do NOT mention internal tool names to users

**Execution Flow**:
1. Think about and explain your high-level design plan to the user
2. After explaining the plan, output: <toolcall>Planning...</toolcall>
3. Then immediately call ${TASK_WRITE_TOOL_NAME} with the broken down tasks (DO NOT write any text after the toolcall tag)
4. The tool will wait for PLAN APPROVAL from the user
5. Once plan is APPROVED (success: true in tool response), IMMEDIATELY start the execution cycle:

   **For each task:**
   - Mark task as in_progress using ${TASK_WRITE_TOOL_NAME} (send ALL tasks)
   - Implement the task completely (write the Ballerina code)
   - Mark task as completed using ${TASK_WRITE_TOOL_NAME} (send ALL tasks)
   - The tool will wait for TASK COMPLETION APPROVAL from the user
   - Once approved (success: true), immediately start the next task
   - Repeat until ALL tasks are done

6. **Critical**: After each approval (both plan and task completions), immediately proceed to the next step without any delay or additional prompting

**User Communication**:
- Using the task_write tool will automatically show progress to the user via a task list
- Keep language simple and non-technical when responding
- No need to add manual progress indicators - the task list shows what you're working on

## Code Generation Guidelines

When generating Ballerina code:

1. **Imports**: Import required libraries
   - Do NOT import these (already available by default): lang.string, lang.boolean, lang.float, lang.decimal, lang.int, lang.map

2. **Structure**:
   - Define types in types.bal file
   - Initialize necessary clients
   - Create service OR main function
   - Plan data flow and transformations

3. **Service Design Phase** ('service_design' tasks):
   - Create resource function signatures with comprehensive return types covering all possible scenarios
   - For unimplemented function bodies, use http:NOT_IMPLEMENTED as the placeholder return value

4. **Implementation Phase** ('implementation' tasks):
   - Implement the complete logic for resource functions
   - **CRITICAL**: After implementation, refine the function signature to ONLY include return types that are actually returned in the implementation
   - Remove any unused return types from the signature to keep it clean and precise
`;
}

/**
 * Generates user prompt content array with optional modifications or codebase structure
 * @param usecase User's query/requirement
 * @param modifications File modifications detected (used when hasHistory is true)
 * @param hasHistory Whether chat history exists
 * @param tempProjectPath Path to temp project (used when hasHistory is false)
 */
function getUserPrompt(usecase: string, modifications: FileModificationInfo[], hasHistory: boolean, tempProjectPath: string) {
    const content = [];

    if (hasHistory) {
        if (modifications.length > 0) {
            content.push({
                type: 'text' as const,
                text: formatModifications(modifications)
            });
        }
    } else {
        content.push({
            type: 'text' as const,
            text: formatCodebaseStructure(tempProjectPath)
        });
    }
    content.push({
        type: 'text' as const,
        text: `<User Query>
${usecase}
</User Query>`
    });

    return content;
}

/**
 * Formats file modifications into XML structure for Claude
 */
function formatModifications(modifications: FileModificationInfo[]): string {
    if (modifications.length === 0) {
        return '';
    }

    const modifiedFiles = modifications.filter(m => m.type === 'modified').map(m => m.filePath);
    const newFiles = modifications.filter(m => m.type === 'new').map(m => m.filePath);
    const deletedFiles = modifications.filter(m => m.type === 'deleted').map(m => m.filePath);

    let text = '<workspace_changes>\n';
    text += 'The following changes were detected in the workspace since the last session. ';
    text += 'You do not need to acknowledge or repeat these changes in your response. ';
    text += 'This information is provided for your awareness only.\n\n';

    if (modifiedFiles.length > 0) {
        text += '<modified_files>\n' + modifiedFiles.join('\n') + '\n</modified_files>\n\n';
    }
    if (newFiles.length > 0) {
        text += '<new_files>\n' + newFiles.join('\n') + '\n</new_files>\n\n';
    }
    if (deletedFiles.length > 0) {
        text += '<deleted_files>\n' + deletedFiles.join('\n') + '\n</deleted_files>\n\n';
    }

    text += '</workspace_changes>';
    return text;
}

