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

import { generateObject } from "ai";
import { PayloadContext } from "@wso2/ballerina-core";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../utils/ai-client";
import { ExamplePayloadSchema, ExamplePayload } from "./schema";
import { getPayloadGenerationSystemPrompt, getPayloadGenerationUserPrompt } from "./prompts";

/**
 * Generates an example JSON payload for a service resource using AI
 *
 * @param context - The payload context containing service and resource details
 * @returns Promise<object> - The generated JSON payload
 * @throws Error if generation fails or response cannot be parsed
 */
export async function generateExamplePayload(context: PayloadContext): Promise<object> {
    const systemPrompt = getPayloadGenerationSystemPrompt(context);
    const userPrompt = getPayloadGenerationUserPrompt(context);

    try {
        const { object } = await generateObject({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            maxOutputTokens: 4096*2,
            temperature: 0,
            system: systemPrompt,
            prompt: userPrompt,
            schema: ExamplePayloadSchema,
            abortSignal: new AbortController().signal,
        });

        const result = object as ExamplePayload;
        return result.payload;
    } catch (error) {
        console.error("Failed to generate example payload:", error);
        throw new Error(`Failed to generate example payload: ${error}`);
    }
}
