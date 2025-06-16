import { ChatEntry, ChatNotify, GenerateOpenAPIRequest, onChatNotify } from "@wso2/ballerina-core";
import { CreateMessageRequest, Message, MessageRole, SystemMessage, TextBlock } from "../types";
import { BACKEND_URL } from "../../utils";
import { RPCLayer } from "../../../../../src/RPCLayer";
import { AiPanelWebview } from "../../../../views/ai-panel/webview";
import { CoreMessage, generateText, streamText } from "ai";
import { anthropic } from "../connection";
import { getErrorMessage, populateHistory } from "../utils";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";

// Core OpenAPI generation function that emits events
export async function generateOpenAPISpecCore(params: GenerateOpenAPIRequest, eventHandler: CopilotEventHandler): Promise<void> {
    // Populate chat history and add user message
    const historyMessages = populateHistory(params.chatHistory);
    
    try {
        const { fullStream } = streamText({
            model: anthropic("claude-3-5-haiku-20241022"),
            maxTokens: 8192,
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content: getSystemPrompt(),
                    providerOptions: {
                        anthropic: { cacheControl: { type: "ephemeral" } },
                    },
                },
                ...historyMessages,
                {
                    role: "user",
                    content: getUserPrompt(params.query),
                },
            ],
        });

        eventHandler({ type: 'start' });

        for await (const part of fullStream) {
            switch (part.type) {
                case "text-delta": {
                    const textPart = part.textDelta;
                    eventHandler({ type: 'content_block', content: textPart });
                    break;
                }
                case "error": {
                    const error = part.error;
                    console.error("Error during OpenAPI generation:", error);
                    eventHandler({ type: 'error', content:getErrorMessage(error) });
                    break;
                }
                case "finish": {
                    const finishReason = part.finishReason;
                    eventHandler({ type: 'stop'});
                    break;
                }
            }
        }
    } catch (error) {
        console.log("Error during OpenAPI generation:", error);
        eventHandler({ type: 'error', content: getErrorMessage(error) });
    }
}


// Main public function that uses the default event handler
export async function generateOpenAPISpec(params: GenerateOpenAPIRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler();
    await generateOpenAPISpecCore(params, eventHandler);
}

function getSystemPrompt() {
    return `You are an expert architect who specializes in API Design.  
For a given user scenario, you need to design the optimal OpenAPI Specification. 

Think step by step to design the perfect OpenAPI Spec.
1. Analyze the given scenario and understand the scenario.
2. Identify the resources, input types, and output types needed.
3. Write the OpenAPI Spec according to REST conventions.

Politely reject any queries which are not related to OpenAPI Specification Design.

* Always generate the Complete self contained OpenAPI Spec even if the user ask to modify part of the spec.

Begin with a short description on the response and end with the OpenAPI spec. 

Example Output:
Short description about the response.
<code filename="openapi.yaml">
${"```"}yaml
//openapi spec goes here
${"```"}
</code>
`;
}

function getUserPrompt(query: string): string {
    return `User Scenario:
${query}`;
}


