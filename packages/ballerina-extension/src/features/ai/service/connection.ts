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
    baseURL: "https://e95488c8-8511-4882-967f-ec3ae2a0f86f-prod.e1-us-east-azure.choreoapis.dev/ballerina-copilot/intelligence-api/v1.0/claude",
    apiKey: "xx", //TODO: Gives error without this. see if we can remove,
    fetch: fetchWithAuth,
});



export const ANTHROPIC_HAIKU = "claude-3-5-haiku-20241022";
export const ANTHROPIC_SONNET_4 = "claude-sonnet-4-20250514";

//Components
//TODO: Move libs into lang server API. - done
//TODO: Host claude api with Auth
//TODO: OpenAI Compatible API?
//TODO: Token based throttling?

//Auth
//TODO: send oauth header / api-key
//TODO: use apiKey if BYOK

//Migrations
//TODO: Migrate healthcare n Natural programmming
//TODO: Abort controller
//TODO: Evals?

// Why?
// As our 80% our customer base dont wanna use wso2 managed platform, we need to provide either self hosting capabilities or BYOK. BYOK is way easier for these customers. 
// Earlier, we had opininated API for the backend, but when features evolving, maintaining that API is hard while keeping backward compatibility. ex - changing llm response format without breaking frontend. 
// Agent mode, Local mcp tools needs the tools to be executed in local machine, either we'll have to go with websockets or to go with complex imlp
// As all logic is contained in ballerina-extension module, can reduce the code complexity by reducing RPC calls by more than 70%. Easier to test the full flow without relying on other variables, state management. 

