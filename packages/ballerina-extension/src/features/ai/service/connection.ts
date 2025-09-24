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
import { getAccessToken, getLoginMethod, getRefreshedAccessToken, getAwsBedrockCredentials } from "../../../utils/ai/auth";
import { AIStateMachine } from "../../../views/ai-panel/aiMachine";
import { BACKEND_URL, DEVANT_API_KEY_FOR_ASK } from "../utils";
import { AIMachineEventType, AnthropicKeySecrets, LoginMethod, BIIntelSecrets, DevantEnvSecrets } from "@wso2/ballerina-core";

export const ANTHROPIC_HAIKU = "claude-3-5-haiku-20241022";
export const ANTHROPIC_SONNET_4 = "claude-sonnet-4-20250514";

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
 * Reusable fetch function that handles authentication with token refresh
 * @param input - The URL, Request object, or string to fetch
 * @param options - Fetch options
 * @param isAskRequest - TEMPORARY HACK: If true, uses DEVANT_API_KEY_FOR_ASK env variable as API key
 * @returns Promise<Response>
 */
export async function fetchWithAuth(input: string | URL | Request, options: RequestInit = {}, isAskRequest: boolean = false): Promise<Response | undefined> {
    try {
        const credentials = await getAccessToken();
        const loginMethod = credentials.loginMethod;

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            'User-Agent': 'Ballerina-VSCode-Plugin',
            'Connection': 'keep-alive',
        };

        if (credentials && loginMethod === LoginMethod.DEVANT_ENV) {
            // For DEVANT_ENV, use api-key and x-Authorization headers
            const secrets = credentials.secrets as DevantEnvSecrets;
            // TEMPORARY HACK: Use DEVANT_API_KEY_FOR_ASK env variable for ask requests
            const apiKey = isAskRequest ? DEVANT_API_KEY_FOR_ASK : secrets.apiKey;
            const stsToken = secrets.stsToken;

            if (apiKey && stsToken && apiKey.trim() !== "" && stsToken.trim() !== "") {
                headers["api-key"] = apiKey;
                headers["x-Authorization"] = stsToken;
            } else {
                console.warn("DevantEnv secrets missing, this may cause authentication issues");
            }
        } else if (credentials && loginMethod === LoginMethod.BI_INTEL) {
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

        // Handle token expiration (only for BI_INTEL method)
        if (response.status === 401 && loginMethod === LoginMethod.BI_INTEL) {
            console.log("Token expired. Refreshing token...");
            const newToken = await getRefreshedAccessToken();
            if (newToken) {
                options.headers = {
                    ...options.headers,
                    'Authorization': `Bearer ${newToken}`,
                };
                response = await fetch(input, options);
            } else {
                AIStateMachine.service().send(AIMachineEventType.LOGOUT);
                return;
            }
        }

        return response;
    } catch (error: any) {
        if (error?.message === "TOKEN_EXPIRED") {
            AIStateMachine.service().send(AIMachineEventType.LOGOUT);
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
        if (loginMethod === LoginMethod.BI_INTEL || loginMethod === LoginMethod.DEVANT_ENV) {
            cachedAnthropic = createAnthropic({
                baseURL: BACKEND_URL + "/intelligence-api/v1.0/claude",
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
        } else {
            throw new Error(`Unsupported login method: ${loginMethod}`);
        }

        cachedAuthMethod = loginMethod;
    }

    // For AWS Bedrock, we return directly above, so this is for other methods
    return cachedAnthropic!(model);
};

/**
 * Returns provider-aware cache control options for prompt caching
 * @returns Cache control options based on the current login method
 */
export const getProviderCacheControl = async () => {
    const loginMethod = await getLoginMethod();
    
    switch (loginMethod) {
        case LoginMethod.AWS_BEDROCK:
            return { bedrock: { cachePoint: { type: 'default' } } };
        case LoginMethod.ANTHROPIC_KEY:
        case LoginMethod.BI_INTEL:
        default:
            return { anthropic: { cacheControl: { type: "ephemeral" } } };
    }
};
