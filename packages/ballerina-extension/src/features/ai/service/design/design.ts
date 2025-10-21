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

import { Command, GenerateCodeRequest } from "@wso2/ballerina-core";
import { ModelMessage, stepCountIs, streamText } from "ai";
import { getAnthropicClient, ANTHROPIC_HAIKU, getProviderCacheControl } from "../connection";
import { getErrorMessage, populateHistory } from "../utils";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../rpc-managers/ai-panel/utils";
import { createTaskWriteTool, TASK_WRITE_TOOL_NAME, resolveTaskApproval } from "../libs/task_write_tool";

// Re-export for RPC manager to use
export { resolveTaskApproval as resolveApproval };

export async function generateDesignCore(params: GenerateCodeRequest, eventHandler: CopilotEventHandler): Promise<void> {
    // Populate chat history and add user message
    const historyMessages = populateHistory(params.chatHistory);
    const cacheOptions = await getProviderCacheControl();

    const allMessages: ModelMessage[] = [
            {
                role: "system",
                content: `You are an expert assistant specializing in Ballerina code generation. You should ONLY answer Ballerina related queries.

Your primary responsibility is to generate a high-level design for a Ballerina integration based on the user's requirements, and then implement it.

IMPORTANT: Before executing any other actions to fulfill the user's query, you MUST first design a comprehensive plan.

When creating a design, provide a structured outline that includes:

1. **Overview**: A brief summary of the integration's purpose and goals
2. **Components**: List all major components/modules needed (e.g., HTTP services, clients, data models, connectors)
3. **Data Flow**: Describe how data moves through the system
   - Input sources and formats
   - Transformation steps
   - Output destinations and formats
4. **Interactions**: Detail the interactions between components
   - API endpoints and their purposes
   - External service integrations
   - Database or storage interactions
5. **Error Handling**: Outline error handling strategy
6. **Security Considerations**: Note any authentication, authorization, or data security requirements

After creating the high-level design, if the implementation requires MORE THAN THREE distinct steps, break it down into specific implementation tasks and execute them step by step. Do NOT mention internal tool names to the user - just naturally describe what you're doing (e.g., "I'll now break this down into implementation tasks" instead of "I'll use the TaskWrite tool").

Format your design plan clearly using markdown with appropriate headings and bullet points for readability.`,
                providerOptions: cacheOptions,
            },
            {
                role: "system",
                content: ` if you are generating code, ensure to:
   - Decide which libraries need to be imported (Avoid importing lang.string, lang.boolean, lang.float, lang.decimal, lang.int, lang.map langlibs as they are already imported by default).
   - Determine the necessary client initialization.
   - Define Types needed for the query in the types.bal file.
   - Outline the service OR main function for the query.
   - Outline the required function usages as noted in Step 2.
   - Based on the types of identified functions, plan the data flow. Transform data as necessary.
    - Finally, provide a
        Example Codeblock segment:
        <code filename="main.bal">
        \`\`\`ballerina
        //code goes here
        \`\`\`
        </code>
`,
            },
            ...historyMessages,
            {
                role: "user",
                content: params.usecase,
            },
        ];

    // Create TaskWrite tool with event handler
    const tools = {
        [TASK_WRITE_TOOL_NAME]: createTaskWriteTool(eventHandler)
    };

    const { fullStream } = streamText({
        model: await getAnthropicClient(ANTHROPIC_HAIKU),
        maxOutputTokens: 8192,
        temperature: 0,
        messages: allMessages,
        stopWhen: stepCountIs(50),
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

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
                    const taskResult = result as any;
                    eventHandler({
                        type: "tool_result",
                        toolName,
                        toolOutput: {
                            success: taskResult.success,
                            message: taskResult.message,
                            allTasks: taskResult.tasks // Tool returns complete task list
                        }
                    });
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
}

// Main public function that uses the default event handler
export async function generatDesign(params: GenerateCodeRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Design);
    try {
        await generateDesignCore(params, eventHandler);
    } catch (error) {
        console.error("Error during design generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}
