import { createAnthropic } from "@ai-sdk/anthropic";
import { getAccessToken, getRefreshedAccessToken } from "../../../utils/ai/auth";
import { AIStateMachine } from "../../../views/ai-panel/aiMachine";
import { AIMachineEventType } from "@wso2/ballerina-core";

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

let url = "https://e95488c8-8511-4882-967f-ec3ae2a0f86f-prod.e1-us-east-azure.choreoapis.dev/ballerina-copilot/intelligence-api/v1.0/claude";

export const anthropic = createAnthropic({
    baseURL: url,
    apiKey: "xx", //TODO: Gives error without this. see if we can remove,
    fetch: fetchWithAuth,
});

export const ANTHROPIC_HAIKU = "claude-3-5-haiku-20241022";
export const ANTHROPIC_SONNET_4 = "claude-sonnet-4-20250514";
export const ANTHROPIC_SONNET_3_5 = "claude-3-5-sonnet-20241022";
