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

import { createAnthropic } from "@ai-sdk/anthropic";
import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";
import { getAccessToken, getLoginMethod, getRefreshedAccessToken, getAwsBedrockCredentials, getVertexAiCredentials } from "../../../utils/ai/auth";
import { AIStateMachine } from "../../../views/ai-panel/aiMachine";
import { BACKEND_URL } from "../utils";
import { LLM_API_BASE_PATH } from "../constants";
import { AIMachineEventType, AnthropicKeySecrets, LoginMethod, BIIntelSecrets } from "@wso2/ballerina-core";

export const ANTHROPIC_HAIKU = "claude-haiku-4-5-20251001";
export const ANTHROPIC_SONNET_4 = "claude-sonnet-4-5-20250929";

type AnthropicModel =
    | typeof ANTHROPIC_HAIKU
    | typeof ANTHROPIC_SONNET_4;

/**
 * Maps AWS regions to their corresponding Bedrock inference profile prefixes
 * @param region - AWS region string (e.g., 'us-east-1', 'eu-west-1', 'ap-southeast-1')
 * @returns The appropriate regional prefix for Bedrock model IDs
 */
export function getBedrockRegionalPrefix(region: string): string {
    const regionPrefix = region.split('-')[0].toLowerCase();
    
    switch (regionPrefix) {
        case 'us':
            return region.startsWith('us-gov-') ? 'us-gov' : 'us';
        case 'eu':
            return 'eu';
        case 'ap':
            return 'apac';
        case 'ca':
        case 'sa':
            return 'us'; // Canada and South America regions use US prefix
        default:
            console.warn(`Unknown region prefix: ${regionPrefix}, defaulting to 'us'`);
            return 'us';
    }
}

let cachedAnthropic: ReturnType<typeof createAnthropic> | null = null;
let cachedAuthMethod: LoginMethod | null = null;

/**
 * Reusable fetch function that handles authentication with token refresh.
 * Uses tiered refresh strategy for BI_INTEL:
 * 1. Try STS token re-exchange via platform extension
 * 2. If both fail, logout the user
 *
 * @param input - The URL, Request object, or string to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function fetchWithAuth(input: string | URL | Request, options: RequestInit = {}): Promise<Response | undefined> {
    try {
        const credentials = await getAccessToken();
        const loginMethod = credentials.loginMethod;

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            'User-Agent': 'Ballerina-VSCode-Plugin',
            'Connection': 'keep-alive',
            'x-product': 'bi',
            'x-usage-context': 'copilot',
            'x-metadata': JSON.stringify({ isCloudEditor: !!process.env.CLOUD_ENV }),
        };

        if (credentials && loginMethod === LoginMethod.BI_INTEL) {
            // For BI_INTEL, use Bearer token
            const secrets = credentials.secrets as BIIntelSecrets;
            headers["Authorization"] = `Bearer ${secrets.accessToken}`;
        }

        // Ensure headers object exists and merge with existing headers
        options.headers = {
            ...options.headers,
            ...headers,
        };

        let response = await fetch(input, options);
        console.log("Response status: ", response.status);

        // Handle token expiration for BI_INTEL method with tiered refresh
        if (response.status === 401) {
            if (loginMethod === LoginMethod.BI_INTEL) {
                console.log("Token expired. Attempting tiered refresh for BI_INTEL...");

                try {
                    // Tiered refresh: STS token re-exchange via platform extension
                    const newToken = await getRefreshedAccessToken();
                    if (newToken) {
                        console.log("Token refreshed via STS exchange");
                        options.headers = {
                            ...options.headers,
                            'Authorization': `Bearer ${newToken}`,
                        };
                        response = await fetch(input, options);

                        // If still 401 after refresh, logout
                        if (response.status === 401) {
                            console.log("Still unauthorized after token refresh. Logging out.");
                            AIStateMachine.service().send(AIMachineEventType.SILENT_LOGOUT);
                            return;
                        }
                    } else {
                        console.log("Token refresh returned null. Logging out.");
                        AIStateMachine.service().send(AIMachineEventType.SILENT_LOGOUT);
                        return;
                    }
                } catch (refreshError) {
                    console.error("Token refresh failed:", refreshError);
                    AIStateMachine.service().send(AIMachineEventType.SILENT_LOGOUT);
                    return;
                }
            }
        }

        // Handle usage limit exceeded
        if (response.status === 429) {
            console.log("Usage limit exceeded (429)");
            const error = new Error("Usage limit exceeded.");
            error.name = "UsageLimitError";
            (error as any).statusCode = 429;
            throw error;
        }

        return response;
    } catch (error: any) {
        if (error?.message === "TOKEN_EXPIRED") {
            AIStateMachine.service().send(AIMachineEventType.SILENT_LOGOUT);
        } else {
            throw error;
        }
    }
}

/**
 * Returns a singleton Anthropic client instance.
 * Re-initializes the client if the login method has changed.
 */
export const getAnthropicClient = async (model: AnthropicModel): Promise<any> => {
    const loginMethod = await getLoginMethod();

    // Recreate client if login method has changed or no cached instance
    if (!cachedAnthropic || cachedAuthMethod !== loginMethod) {
        let url = BACKEND_URL + LLM_API_BASE_PATH + "/claude";
        if (loginMethod === LoginMethod.BI_INTEL) {
            cachedAnthropic = createAnthropic({
                baseURL: url,
                apiKey: "xx", // dummy value; real auth is via fetchWithAuth
                fetch: fetchWithAuth,
            });
        } else if (loginMethod === LoginMethod.ANTHROPIC_KEY) {
            const credentials = await getAccessToken();
            const secrets = credentials.secrets as AnthropicKeySecrets;
            cachedAnthropic = createAnthropic({
                baseURL: "https://api.anthropic.com/v1",
                apiKey: secrets.apiKey,
            });
        } else if (loginMethod === LoginMethod.AWS_BEDROCK) {
            const awsCredentials = await getAwsBedrockCredentials();
            if (!awsCredentials) {
                throw new Error('AWS Bedrock credentials not found');
            }
            
            const bedrock = createAmazonBedrock({
                region: awsCredentials.region,
                accessKeyId: awsCredentials.accessKeyId,
                secretAccessKey: awsCredentials.secretAccessKey,
                sessionToken: awsCredentials.sessionToken,
            });
            
            // Map Anthropic model names to AWS Bedrock model IDs (base models without region prefix)
            const baseModelMap: Record<AnthropicModel, string> = {
                [ANTHROPIC_HAIKU]: "anthropic.claude-3-5-haiku-20241022-v1:0",
                [ANTHROPIC_SONNET_4]: "anthropic.claude-sonnet-4-20250514-v1:0",
            };
            
            const baseModelId = baseModelMap[model];
            if (!baseModelId) {
                throw new Error(`Unsupported model for AWS Bedrock: ${model}`);
            }
            
            // Get regional prefix based on AWS region
            const regionalPrefix = getBedrockRegionalPrefix(awsCredentials.region);
            const bedrockModelId = `${regionalPrefix}.${baseModelId}`;
            
            return bedrock(bedrockModelId);
        } else if (loginMethod === LoginMethod.VERTEX_AI) {
            const vertexCredentials = await getVertexAiCredentials();
            if (!vertexCredentials) {
                throw new Error('Vertex AI credentials not found');
            }

            const vertexAnthropic = createVertexAnthropic({
                project: vertexCredentials.projectId,
                location: vertexCredentials.location,
                googleAuthOptions: {
                    credentials: {
                        client_email: vertexCredentials.clientEmail,
                        private_key: vertexCredentials.privateKey,
                    },
                },
            });

            const vertexModelMap: Record<AnthropicModel, string> = {
                [ANTHROPIC_HAIKU]: "claude-3-5-haiku@20241022",
                [ANTHROPIC_SONNET_4]: "claude-sonnet-4-5@20250929",
            };

            const vertexModelId = vertexModelMap[model];
            if (!vertexModelId) {
                throw new Error(`Unsupported model for Vertex AI: ${model}`);
            }

            return vertexAnthropic(vertexModelId);
        } else {
            throw new Error(`Unsupported login method: ${loginMethod}`);
        }

        cachedAuthMethod = loginMethod;
    }

    // For AWS Bedrock, we return directly above, so this is for other methods
    return cachedAnthropic!(model);
};

/**
 * Type definition for provider-specific cache options
 */
export type ProviderCacheOptions = 
    | { anthropic: { cacheControl: { type: string } } } 
    | { bedrock: { cachePoint: { type: string } } };

/**
 * Returns provider-aware cache control options for prompt caching
 * @returns Cache control options based on the current login method
 */
export const getProviderCacheControl = async (): Promise<ProviderCacheOptions> => {
    const loginMethod = await getLoginMethod();
    
    switch (loginMethod) {
        case LoginMethod.AWS_BEDROCK:
            return { bedrock: { cachePoint: { type: 'default' } } };
        case LoginMethod.VERTEX_AI:
        case LoginMethod.ANTHROPIC_KEY:
        case LoginMethod.BI_INTEL:
        default:
            return { anthropic: { cacheControl: { type: "ephemeral" } } };
    }
};
