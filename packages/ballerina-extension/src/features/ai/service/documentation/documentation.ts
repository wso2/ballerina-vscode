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

import { Command, ProjectSource } from "@wso2/ballerina-core";
import { streamText, ModelMessage } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../connection";
import {
    getDocumentationGenerationSystemPrompt,
    createDocumentationGenMessages
} from "./prompts";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { getErrorMessage } from "../utils";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";

export type DocumentationGenerationRequest = {
    serviceName: string;
    projectSource: ProjectSource;
    openApiSpec?: string;
};

// Core documentation generation function that emits events
export async function generateDocumentationCore(
    params: DocumentationGenerationRequest,
    eventHandler: CopilotEventHandler
): Promise<void> {
    const systemPrompt = getDocumentationGenerationSystemPrompt();
    const userMessages: ModelMessage[] = createDocumentationGenMessages(params);

    const allMessages: ModelMessage[] = [
        {
            role: "system",
            content: systemPrompt,
        },
        ...userMessages
    ];

    const { fullStream } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 16384,
        temperature: 0,
        messages: allMessages,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    eventHandler({ type: "start" });
    let assistantResponse: string = "";

    for await (const part of fullStream) {
        switch (part.type) {
            case "text-delta": {
                const textPart = part.text;
                assistantResponse += textPart;
                eventHandler({ type: "content_block", content: textPart });
                break;
            }
            case "error": {
                const error = part.error;
                console.error("Error during documentation generation:", error);
                eventHandler({ type: "error", content: getErrorMessage(error) });
                break;
            }
            case "finish": {
                eventHandler({
                    type: "content_block",
                    content: `\n\n<button type="save_documentation">Save Documentation</button>`,
                });
                eventHandler({
                    type: "intermediary_state",
                    state: {
                        serviceName: params.serviceName,
                        documentation: assistantResponse,
                        projectSource: params.projectSource,
                        openApiSpec: params.openApiSpec,
                    },
                });
                eventHandler({ type: "stop", command: Command.Doc });
                break;
            }
        }
    }
}

// Main public function that uses the default event handler
export async function generateDocumentation(params: DocumentationGenerationRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Doc);
    try {
        await generateDocumentationCore(params, eventHandler);
    } catch (error) {
        console.error("Error during documentation generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}
