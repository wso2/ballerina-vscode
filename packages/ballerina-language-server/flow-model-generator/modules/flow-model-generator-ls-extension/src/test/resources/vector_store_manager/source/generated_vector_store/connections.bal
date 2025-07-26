import ballerina/ai;
import ballerinax/ai.pinecone;

final ai:InMemoryVectorStore inMemoryVectorStore = check new ();
final pinecone:VectorStore pineconeVectorStore = check new ("url", "key");
