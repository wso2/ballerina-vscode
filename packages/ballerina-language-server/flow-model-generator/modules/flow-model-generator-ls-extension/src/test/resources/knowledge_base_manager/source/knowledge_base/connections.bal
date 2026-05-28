import ballerina/ai;

ai:VectorKnowledgeBase vectorKnowledgeBase = new (check new ai:InMemoryVectorStore(),
    check ai:getDefaultEmbeddingProvider()
);
