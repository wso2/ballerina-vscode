import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropic = createAnthropic({
    baseURL: "https://e95488c8-8511-4882-967f-ec3ae2a0f86f-prod.e1-us-east-azure.choreoapis.dev/ballerina-copilot/intelligence-api/v1.0/claude",
    apiKey: "xx", //TODO: Gives error without this. see if we can remove,
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

