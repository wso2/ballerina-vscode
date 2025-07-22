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
import { getAccessToken, getRefreshedAccessToken } from "../../../utils/ai/auth";
import { AIStateMachine } from "../../../views/ai-panel/aiMachine";
import { AIMachineEventType } from "@wso2/ballerina-core";
import { BACKEND_URL } from "../utils";

/**
 * Reusable fetch function that handles authentication with token refresh
 * @param input - The URL, Request object, or string to fetch
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function fetchWithAuth(input: string | URL | Request, options: RequestInit = {}): Promise<Response> {
    const accessToken = await getAccessToken();
    
    // Ensure headers object exists
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Ballerina-VSCode-Plugin',
        'Connection': 'keep-alive',
    };
    
    let response = await fetch(input, options);
    console.log("Response status: ", response.status);
    
    // Handle token expiration
    if (response.status === 401) {
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
            throw new Error('Authentication failed: Unable to refresh token');
        }
    }
    
    return response;
}

export const anthropic = createAnthropic({
    baseURL: BACKEND_URL+ "/intelligence-api/v1.0/claude",
    apiKey: "xx", //TODO: Gives error without this. see if we can remove,
    fetch: fetchWithAuth,
});

export const ANTHROPIC_HAIKU = "claude-3-5-haiku-20241022";
export const ANTHROPIC_SONNET_4 = "claude-sonnet-4-20250514";
export const ANTHROPIC_SONNET_3_5 = "claude-3-5-sonnet-20241022";
