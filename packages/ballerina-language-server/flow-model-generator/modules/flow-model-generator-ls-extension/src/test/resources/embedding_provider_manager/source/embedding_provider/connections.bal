import ballerina/ai;
import ballerinax/ai.openai;

final openai:EmbeddingProvider openAiEmbeddingModel = check new ("key", openai:TEXT_EMBEDDING_3_LARGE);
final ai:Wso2EmbeddingProvider wso2EmbeddingModel = check new ("key", "url");
final ai:Wso2EmbeddingProvider wso2DefaultEmbeddingModel = check ai:getDefaultEmbeddingProvider();
