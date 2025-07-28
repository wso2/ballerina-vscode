import ballerina/ai;

final ai:InMemoryVectorStore vectorStore = check new ();
final ai:Wso2EmbeddingProvider embeddingModel = check ai:getDefaultEmbeddingProvider();
final ai:VectorKnowledgeBase vectorKnowledgeBase = new (vectorStore, embeddingModel);
