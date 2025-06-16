import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropic = createAnthropic({
    baseURL: "http://localhost:9090/intel/claude/v2",
    apiKey: "xx", //TODO: Gives error without this. see if we can remove,
});


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

