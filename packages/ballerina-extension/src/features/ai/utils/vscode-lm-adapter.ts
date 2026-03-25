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

/**
 * Adapter that wraps a VS Code Language Model (vscode.lm) chat model into
 * a Vercel AI SDK-compatible LanguageModel so it can be used with `streamText()`.
 *
 * The VS Code LM API (`vscode.lm.selectChatModels()`) exposes models contributed
 * by extensions like GitHub Copilot. This adapter bridges the gap between the
 * VS Code LM interface and the Vercel AI SDK interface expected by AgentExecutor.
 *
 * Usage:
 *   import { getVSCodeLMModel } from './vscode-lm-adapter';
 *   const model = await getVSCodeLMModel();
 *   // Pass to AgentExecutor config.model or streamText({ model })
 *
 * Note: This is a simplified adapter. The VS Code LM API returns streamed
 * `LanguageModelTextPart` / `LanguageModelToolCallPart` chunks whereas
 * the Vercel AI SDK expects a specific `LanguageModelV1` interface.
 * A full adapter would implement the complete LanguageModelV1 protocol.
 * For now, this provides a thin compatibility layer for basic text streaming.
 */

import * as vscode from "vscode";
import { ReadableStream } from "stream/web";

/**
 * Selects a VS Code Language Model chat model by family/vendor filter.
 * Returns the raw vscode.LanguageModelChat which can be used directly or
 * wrapped for Vercel AI SDK compatibility.
 *
 * @param options Selection criteria for the model
 */
export async function selectVSCodeChatModel(options?: {
    vendor?: string;
    family?: string;
    id?: string;
}): Promise<vscode.LanguageModelChat | undefined> {
    const models = await vscode.lm.selectChatModels({
        vendor: options?.vendor,
        family: options?.family,
        id: options?.id,
    });

    if (models.length === 0) {
        console.warn("[VSCodeLMAdapter] No matching language models found for:", options);
        return undefined;
    }

    // Return the first matching model
    console.log(`[VSCodeLMAdapter] Selected model: ${models[0].name} (${models[0].id})`);
    return models[0];
}

/**
 * Lists all available VS Code Language Models for display in model selectors.
 */
export async function listAvailableModels(): Promise<
    Array<{ id: string; name: string; vendor: string; family: string }>
> {
    const models = await vscode.lm.selectChatModels();
    return models.map((m) => ({
        id: m.id,
        name: m.name,
        vendor: m.vendor,
        family: m.family,
    }));
}

/**
 * Creates a Vercel AI SDK-compatible wrapper around a VS Code Language Model.
 *
 * This is a minimal adapter that implements enough of the LanguageModelV1
 * interface to work with `streamText()`. It translates between:
 * - Vercel AI SDK messages → VS Code LM messages
 * - VS Code LM response stream → Vercel AI SDK stream protocol
 *
 * LIMITATIONS:
 * - Tool calling support is partial (depends on the VS Code LM model capabilities)
 * - Provider-specific options are not forwarded
 * - Token counting is estimated, not exact
 */
export function createVSCodeLMAdapter(chatModel: vscode.LanguageModelChat): any {
    return {
        specificationVersion: "v1" as const,
        provider: `vscode-lm:${chatModel.vendor}`,
        modelId: chatModel.id,
        defaultObjectGenerationMode: undefined,

        async doGenerate(options: any) {
            const messages = convertToVSCodeMessages(options.prompt);
            const response = await chatModel.sendRequest(
                messages,
                {},
                new vscode.CancellationTokenSource().token
            );

            let text = "";
            for await (const part of response.stream) {
                if (part instanceof vscode.LanguageModelTextPart) {
                    text += part.value;
                }
            }

            return {
                text,
                toolCalls: [],
                finishReason: "stop" as const,
                usage: { promptTokens: 0, completionTokens: 0 },
                rawCall: { rawPrompt: null, rawSettings: {} },
            };
        },

        async doStream(options: any) {
            const messages = convertToVSCodeMessages(options.prompt);

            const cancellationSource = new vscode.CancellationTokenSource();

            // Wire up abort signal
            if (options.abortSignal) {
                options.abortSignal.addEventListener("abort", () => {
                    cancellationSource.cancel();
                });
            }

            const response = await chatModel.sendRequest(
                messages,
                {},
                cancellationSource.token
            );

            // Convert VS Code LM stream to Vercel AI SDK stream format
            const stream = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const part of response.stream) {
                            if (part instanceof vscode.LanguageModelTextPart) {
                                controller.enqueue({
                                    type: "text-delta",
                                    textDelta: part.value,
                                });
                            } else if (part instanceof vscode.LanguageModelToolCallPart) {
                                controller.enqueue({
                                    type: "tool-call",
                                    toolCallType: "function",
                                    toolCallId: part.callId,
                                    toolName: part.name,
                                    args: JSON.stringify(part.input),
                                });
                            }
                        }

                        controller.enqueue({
                            type: "finish",
                            finishReason: "stop",
                            usage: { promptTokens: 0, completionTokens: 0 },
                        });
                        controller.close();
                    } catch (error: any) {
                        if (error?.code === "Canceled" || error?.name === "CancellationError") {
                            controller.enqueue({
                                type: "finish",
                                finishReason: "abort",
                                usage: { promptTokens: 0, completionTokens: 0 },
                            });
                            controller.close();
                        } else {
                            controller.error(error);
                        }
                    }
                },
            });

            return {
                stream,
                rawCall: { rawPrompt: null, rawSettings: {} },
            };
        },
    };
}

/**
 * Converts Vercel AI SDK message format to VS Code Language Model messages.
 */
function convertToVSCodeMessages(
    prompt: Array<{ role: string; content: any }>
): vscode.LanguageModelChatMessage[] {
    const messages: vscode.LanguageModelChatMessage[] = [];

    for (const msg of prompt) {
        const textContent = typeof msg.content === "string"
            ? msg.content
            : Array.isArray(msg.content)
                ? msg.content
                    .filter((p: any) => p.type === "text")
                    .map((p: any) => p.text)
                    .join("\n")
                : String(msg.content);

        switch (msg.role) {
            case "system":
                messages.push(vscode.LanguageModelChatMessage.Assistant(textContent));
                break;
            case "user":
                messages.push(vscode.LanguageModelChatMessage.User(textContent));
                break;
            case "assistant":
                messages.push(vscode.LanguageModelChatMessage.Assistant(textContent));
                break;
            default:
                messages.push(vscode.LanguageModelChatMessage.User(textContent));
                break;
        }
    }

    return messages;
}

/**
 * Convenience: selects a VS Code LM model and wraps it for Vercel AI SDK.
 * Returns `undefined` if no model is available.
 */
export async function getVSCodeLMModel(options?: {
    vendor?: string;
    family?: string;
    id?: string;
}): Promise<any | undefined> {
    const model = await selectVSCodeChatModel(options);
    if (!model) {
        return undefined;
    }
    return createVSCodeLMAdapter(model);
}
