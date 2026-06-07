import ballerina/ai;
import ballerinax/ai.anthropic;
import ballerinax/ai.azure;
import ballerinax/ai.deepseek;
import ballerinax/ai.mistral;
import ballerinax/ai.ollama;
import ballerinax/ai.openai;

final openai:ModelProvider openAiModel = check new ("key", openai:GPT_4O);
final azure:OpenAiModelProvider azureOpenaiModel = check new ("url", "key", "deployment-id", "api-version");
final deepseek:ModelProvider deepSeekModel = check new ("key", deepseek:DEEPSEEK_CHAT);
final mistral:ModelProvider mistralModel = check new ("key", mistral:MINISTRAL_3B_2410);
final ollama:ModelProvider ollamaModel = check new ("model");
final anthropic:ModelProvider anthropicModel = check new ("key", anthropic:CLAUDE_3_5_HAIKU_20241022);
final ai:Wso2ModelProvider wso2Model = check new ("key", "url");
final ai:Wso2ModelProvider wso2DefaultModel = check ai:getDefaultModelProvider();
