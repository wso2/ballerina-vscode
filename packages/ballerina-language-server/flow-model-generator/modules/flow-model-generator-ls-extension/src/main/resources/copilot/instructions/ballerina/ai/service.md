# Overall library instructions
This library contains all the features relavant to AI functionalities which can be used to build AI powered applications.

# Service instructions
- Use this Listener the ai:Listener only if a new service needs to be created.
- This is a wrapper on top of HTTP designed for a chat interface.

```
import ballerina/ai;
import ballerina/http;
qq
listener ai:Listener chatListener = new (listenOn = check http:getDefaultListener());

service /chat on chatListener {
    resource function post chat(@http:Payload ai:ChatReqMessage request) returns ai:ChatRespMessage|error {
            string message = request.message;
            string sessionId = request.sessionId;
            return {message: "AI Response goes here"};
    }
}

```

# Agent

- Agents are used to build AI applications that can perform tasks using tools.
- They can be customized with specific instructions and tools for different use cases.
- Tool functions should be annotated with `@ai:AgentTool` to be recognized as tools.
- Tool function pointer needs to be passed to the agent during its initialization.
- Agent must need a model provider. Use default model provider unless a specific model is requested.

connections.bal
```
import ballerina/ai;

final ai:Wso2ModelProvider _chatModel = check ai:getDefaultModelProvider();
```


agent.bal
```
import ballerina/ai;

final ai:Agent _chatAgent = check new (
    systemPrompt = {role: "You are a math agent", instructions: string `Make sure to only respond to math related queries.`}, model = _chatModel, tools = [addTool]
);

# Use this tool to add two numbers.
@ai:AgentTool
isolated function addTool(int a, int b) returns int|error {
    return a + b;
}
```

main.bal

```
import ballerina/ai;
import ballerina/http;

listener ai:Listener chatListener = new (listenOn = check http:getDefaultListener());

service /chat on chatListener {
    resource function post chat(@http:Payload ai:ChatReqMessage request) returns ai:ChatRespMessage|error {
            // Run the agent for the given message and session ID.
            string stringResult = check _chatAgent.run(request.message, request.sessionId); 
            return {message: stringResult};
    }
}

```

# Model Providers

- Model providers are used to interact with different AI models. These are always preferred over using the connector directly.
- Ballerina provides a default model provider `ai:Wso2ModelProvider` which can be used to access wso2 managed model easily. Treat this as the default model provider unless a specific model is specified.
- These can be used directly to simply chat with an LLM for simple queries or can be used with agents or RAG abstractions build complex applications


## Generate API
- Use this when you want to generate structured output from the LLM.
- Make sure to include the prompt inside the backticks(eg: `How are you?`) while calling the generate API. Not strings.
- You can also generate custom types by specifying the type in the generate API call. This will automatically deserialize the response to the specified type.

```
string llmResponse = check aiWso2modelprovider->generate(`How are you?`);
Person[] persons = check aiWso2modelprovider->generate(`Generate 10 person example records`);
```

### Default Model Provider

- Always use `ai:getDefaultModelProvider()` as below instead of calling new keyword when creating the default model provider.

```
import ballerina/ai;

final ai:Wso2ModelProvider modelProvider = check ai:getDefaultModelProvider();
```

### Anthropic Model Provider
```
import ballerinax/ai.anthropic;

final anthropic:ModelProvider anthropicModelprovider = check new ("<<api_key>>", "claude-sonnet-4-20250514");
```

# RAG
- Use the below abstractions to build Retrieval Augmented Generation applications.
- Note its ideal to do ingestion and querying in seperately.

## Ingestion

- Note that one document should only be ingested once. Duplicate ingestions may lead to redundant data in the knowledge base.

connections.bal
```
import ballerina/ai;
import ballerinax/ai.pinecone;

final ai:Wso2EmbeddingProvider aiWso2embeddingprovider = check ai:getDefaultEmbeddingProvider();


pinecone:VectorStore pineconeVectorstore = check new (
    apiKey = "your-api-key",
    serviceUrl = "https://your-service-url.com"
);

final ai:VectorKnowledgeBase aiVectorknowledgebase = new (pineconeVectorstore, aiWso2embeddingprovider, "AUTO");
final ai:TextDataLoader aiTextdataloader = check new ("./foo.txt");

```

automation.bal
```
import ballerina/ai;

public function main() returns error? {
    ai:Document[]|ai:Document load = check aiTextdataloader.load();
    
    check aiVectorknowledgebase.ingest(load);
}
```

## Querying


connections.bal
```
import ballerina/ai;
import ballerinax/ai.pinecone;

final ai:Wso2EmbeddingProvider aiWso2embeddingprovider = check ai:getDefaultEmbeddingProvider();

pinecone:VectorStore pineconeVectorstore = check new (
    apiKey = "your-api-key",
    serviceUrl = "https://your-service-url.com"
);

final ai:VectorKnowledgeBase aiVectorknowledgebase = new (pineconeVectorstore, aiWso2embeddingprovider, "AUTO");
final ai:Wso2ModelProvider aiWso2modelprovider = check ai:getDefaultModelProvider();
```


main.bal

```
import ballerina/ai;
import ballerina/http;

listener ai:Listener chatListener = new (9090);

service /chat on chatListener {
    resource function post chat(@http:Payload ai:ChatReqMessage request) returns ai:ChatRespMessage|error {
        ai:QueryMatch[] aiQuerymatch = check aiVectorknowledgebase.retrieve(request.message);
        ai:ChatUserMessage aiChatusermessage = ai:augmentUserQuery(aiQuerymatch, request.message);
        ai:ChatAssistantMessage aiChatassistantmessage = check aiWso2modelprovider->chat(aiChatusermessage, []);
        string aiResp = check aiChatassistantmessage.content.ensureType();
        return {message: aiResp};
    }
}

```
