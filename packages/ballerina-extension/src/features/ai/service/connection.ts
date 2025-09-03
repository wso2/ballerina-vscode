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
import { getAccessToken, getLoginMethod, getRefreshedAccessToken } from "../../../utils/ai/auth";
import { AIStateMachine } from "../../../views/ai-panel/aiMachine";
import { BACKEND_URL, DEVANT_API_KEY_FOR_ASK } from "../utils";
import { AIMachineEventType, AnthropicKeySecrets, LoginMethod, BIIntelSecrets, DevantEnvSecrets } from "@wso2/ballerina-core";

export const ANTHROPIC_HAIKU = "claude-3-5-haiku-20241022";
export const ANTHROPIC_SONNET_4 = "claude-sonnet-4-20250514";
export const ANTHROPIC_SONNET_3_5 = "claude-3-5-sonnet-20241022";

type AnthropicModel =
    | typeof ANTHROPIC_HAIKU
    | typeof ANTHROPIC_SONNET_4
    | typeof ANTHROPIC_SONNET_3_5;

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
        }
        return;
    }
}

/**
 * Returns a singleton Anthropic client instance.
 * Re-initializes the client if the login method has changed.
 */
export const getAnthropicClient = async (model: AnthropicModel) => {
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
        } else {
            throw new Error(`Unsupported login method: ${loginMethod}`);
        }

        cachedAuthMethod = loginMethod;
    }

    return cachedAnthropic(model);
};
