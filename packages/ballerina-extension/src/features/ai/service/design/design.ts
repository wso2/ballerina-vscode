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

import { Command, GenerateCodeRequest, Task } from "@wso2/ballerina-core";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { getAnthropicClient, ANTHROPIC_HAIKU, getProviderCacheControl, ANTHROPIC_SONNET_4 } from "../connection";
import { getErrorMessage, populateHistory } from "../utils";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../rpc-managers/ai-panel/utils";
import { createTaskWriteTool, TASK_WRITE_TOOL_NAME, resolveTaskApproval, TaskWriteResult } from "../libs/task_write_tool";

// Re-export for RPC manager to use
export { resolveTaskApproval as resolveApproval };

export async function generateDesignCore(params: GenerateCodeRequest, eventHandler: CopilotEventHandler): Promise<Task[]> {
    // Populate chat history and add user message
    const historyMessages = populateHistory(params.chatHistory);
    const cacheOptions = await getProviderCacheControl();

    const allMessages: ModelMessage[] = [
            {
                role: "system",
                content: `You are an expert assistant to help with writing ballerina integrations. You will be helping with designing a solution for user query in a step-by-step manner.

You have access to ${TASK_WRITE_TOOL_NAME} tool to create and manage tasks. This plan will be visible to the user and the execution will be guided on the tasks you create.

Do NOT mention internal tool names to the user - just naturally describe what you're doing (e.g., "I'll now break this down into implementation tasks" instead of "I'll use the ${TASK_WRITE_TOOL_NAME} tool").
`,
                providerOptions: cacheOptions,
            },
            ...historyMessages,
            {
                role: "user",
                content: `The first step is to create a very high level consise design plan for the following requirement. 
Then you must create the tasks using ${TASK_WRITE_TOOL_NAME} tool accoringly. Then the user will approve the tasks or ask for modifications.

                
<User Query>
${params.usecase}
</User Query>`,
            },
        ];

    // Create TaskWrite tool with event handler
    const tools = {
        [TASK_WRITE_TOOL_NAME]: createTaskWriteTool(eventHandler)
    };

    const { fullStream } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 8192,
        temperature: 0,
        messages: allMessages,
        stopWhen: stepCountIs(50),
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    // TODO: Will it call this tool multiple times? 
    let finalTasks: Task[] = [];

    eventHandler({ type: "start" });

    for await (const part of fullStream) {
        switch (part.type) {
            case "text-delta": {
                const textPart = part.text;
                eventHandler({ type: "content_block", content: textPart });
                break;
            }
            case "tool-call": {
                const toolName = part.toolName;
                console.log(`[Design] Tool call started: ${toolName}`);

                // Emit tool call event
                eventHandler({ type: "tool_call", toolName });
                break;
            }
            case "tool-result": {
                const toolName = part.toolName;
                const result = part.output;
                console.log(`[Design] Tool result received from: ${toolName}`, result);

                // Emit tool result event with full task list
                if (toolName === TASK_WRITE_TOOL_NAME && result) {
                    const taskResult = result as TaskWriteResult;
                    eventHandler({
                        type: "tool_result",
                        toolName,
                        toolOutput: {
                            success: taskResult.success,
                            message: taskResult.message,
                            allTasks: taskResult.tasks // Tool returns complete task list
                        }
                    });
                    finalTasks = taskResult.tasks;
                }
                break;
            }
            case "error": {
                const error = part.error;
                console.error("Error during design generation:", error);
                eventHandler({ type: "error", content: getErrorMessage(error) });
                break;
            }
            case "finish": {
                const finishReason = part.finishReason;
                console.log(`[Design] Finished with reason: ${finishReason}`);

                eventHandler({ type: "stop", command: Command.Design });
                break;
            }
        }
    }
    return finalTasks;
}

// Main public function that uses the default event handler
export async function generateDesign(params: GenerateCodeRequest): Promise<Task[]> {
    const eventHandler = createWebviewEventHandler(Command.Design);
    try {
        return await generateDesignCore(params, eventHandler);
    } catch (error) {
        console.error("Error during design generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}
