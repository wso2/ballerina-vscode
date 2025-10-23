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

import { PayloadContext } from "@wso2/ballerina-core";

/**
 * System prompt for generating example JSON payloads
 */
export function getPayloadGenerationSystemPrompt(): string {
    return `You are an expert at generating realistic and contextually appropriate example JSON payloads for REST API services.

Your task is to analyze the provided service context and generate a meaningful JSON payload that:
1. Matches the semantic intent of the service and resource
2. Contains realistic sample data appropriate for the domain
3. Respects the parameter types and constraints provided
4. Uses proper naming conventions and data types
5. Includes nested structures when appropriate for the context
6. Avoid reintroducing existing parameters unless necessary for completeness

Guidelines:
- For string fields: Use realistic examples (e.g., "John Doe" for names, "john.doe@example.com" for emails)
- For numeric fields: Use reasonable values within expected ranges
- For boolean fields: Choose the most common or expected default
- For arrays: Include 2-3 example items to show the structure
- For dates: Use ISO 8601 format (e.g., "2024-01-15T10:30:00Z")
- Consider the HTTP method and resource path to infer the payload structure
- If parameter details suggest specific types, ensure the payload respects those types

Return ONLY the JSON payload object in the specified format.`;
}

/**
 * User prompt for generating example JSON payloads
 */
export function getPayloadGenerationUserPrompt(context: PayloadContext): string {
    let prompt = `Generate an example JSON payload for the following HTTP service resource:\n\n`;

    prompt += `**Service Name:** ${context.serviceName}\n`;
    prompt += `**Service Base Path:** ${context.serviceBasePath}\n`;

    if (context.resourceBasePath) {
        prompt += `**Resource Path:** ${context.resourceBasePath}\n`;
    }

    if (context.resourceMethod) {
        prompt += `**HTTP Method:** ${context.resourceMethod}\n`;
    }

    if (context.resourceDocumentation) {
        prompt += `**Resource Documentation:** ${context.resourceDocumentation}\n`;
    }

    if (context.paramDetails && context.paramDetails.length > 0) {
        prompt += `\n**Existing Parameters:**\n`;
        context.paramDetails.forEach(param => {
            prompt += `- **${param.name}** (${param.type})`;
            if (param.defaulValue) {
                prompt += ` - Default: ${param.defaulValue}`;
            }
            prompt += `\n`;
        });
    }

    prompt += `\nBased on the above context, generate a realistic and meaningful example JSON payload that would be appropriate for this service resource.`;

    return prompt;
}
