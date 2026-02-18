# Ballerina AI Library Instructions

This library provides comprehensive AI functionalities for building intelligent applications with various AI providers.

## Key Features

1. **Model Providers**: Support for multiple AI model providers (WSO2, Anthropic, etc.)
2. **Agents**: Build AI applications that can perform tasks using tools and custom instructions
3. **RAG (Retrieval Augmented Generation)**: Implement knowledge-based AI applications with vector stores
4. **Chat Interface**: Ready-to-use chat service abstractions

## Model Providers

Model providers are the primary interface for interacting with AI models. Always prefer using model providers over direct connector usage.

### Default Model Provider (WSO2)

The default model provider is the easiest way to get started. Use `ai:getDefaultModelProvider()` instead of calling `new`:

```ballerina
import ballerina/ai;

final ai:Wso2ModelProvider modelProvider = check ai:getDefaultModelProvider();
```

### Generate API

Use the `generate` API for creating structured or unstructured output from LLMs:

```ballerina
// Simple text generation
string response = check modelProvider->generate(`How are you?`);

// Structured output with custom types
Person[] persons = check modelProvider->generate(`Generate 10 person example records`);
```

**Important**: Always wrap prompts in backticks when calling the generate API.

### Chat API

Use the `chat` API for conversational interfaces with message history:

```ballerina
import ballerina/ai;

ai:ChatUserMessage userMsg = {role: "user", content: "What is the capital of France?"};
ai:ChatAssistantMessage response = check modelProvider->chat(userMsg, []);
string aiResp = check response.content.ensureType();
```

## Agents

Agents enable AI applications to perform complex tasks using tools and custom instructions.

### Creating an Agent

1. Define tool functions with `@ai:AgentTool` annotation
2. Initialize the agent with a model provider, system prompt, and tools
3. Run the agent with user queries

```ballerina
import ballerina/ai;

final ai:Wso2ModelProvider _chatModel = check ai:getDefaultModelProvider();

final ai:Agent _chatAgent = check new (
    systemPrompt = {role: "You are a math agent", instructions: "Respond only to math queries"},
    model = _chatModel,
    tools = [addTool]
);

@ai:AgentTool
isolated function addTool(int a, int b) returns int|error {
    return a + b;
}
```

### Running Agents

Agents maintain session context across multiple interactions:

```ballerina
string result = check _chatAgent.run(userMessage, sessionId);
```

## RAG (Retrieval Augmented Generation)

Use RAG abstractions to build knowledge-based AI applications.

### Ingestion

Ingest documents into a vector knowledge base. Each document should only be ingested once:

```ballerina
import ballerina/ai;
import ballerinax/ai.pinecone;

final ai:Wso2EmbeddingProvider embeddingProvider = check ai:getDefaultEmbeddingProvider();

pinecone:VectorStore vectorStore = check new (
    apiKey = "your-api-key",
    serviceUrl = "https://your-service-url.com"
);

final ai:VectorKnowledgeBase knowledgeBase = new (vectorStore, embeddingProvider, "AUTO");
final ai:TextDataLoader dataLoader = check new ("./documents.txt");

public function main() returns error? {
    ai:Document[]|ai:Document documents = check dataLoader.load();
    check knowledgeBase.ingest(documents);
}
```

### Querying

Retrieve relevant information and augment user queries:

```ballerina
ai:QueryMatch[] matches = check knowledgeBase.retrieve(userQuery);
ai:ChatUserMessage augmentedMsg = ai:augmentUserQuery(matches, userQuery);
ai:ChatAssistantMessage response = check modelProvider->chat(augmentedMsg, []);
```

## Embedding Providers

Get embedding providers for vector operations:

```ballerina
final ai:Wso2EmbeddingProvider embeddingProvider = check ai:getDefaultEmbeddingProvider();
```

## Best Practices

1. **Separate Concerns**: Keep ingestion and querying logic in separate modules
2. **Session Management**: Use unique session IDs for agent conversations to maintain context
3. **Error Handling**: Always handle potential errors from AI operations
4. **Model Selection**: Use the default WSO2 model provider unless specific model requirements exist
5. **Tool Design**: Keep agent tools focused and well-documented with clear descriptions
6. **Avoid Duplication**: Don't ingest the same document multiple times in RAG applications
