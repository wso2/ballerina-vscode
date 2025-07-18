import ballerina/io;
import ballerina/lang.regexp;
import ballerina/ai;
import ballerinax/ai.ollama;

configurable string apiKey = ?;
configurable string deploymentId = ?;
configurable string apiVersion = ?;
configurable string serviceUrl = ?;

final ollama:ModelProvider agentModel =check new ("llama3.2:latest");
final ai:Agent agent = check new (
    systemPrompt = {
        role: "Telegram Assistant",
        instructions: "Assist the users with their requests, whether it's for information, " +
            "tasks, or troubleshooting. Provide clear, helpful responses in a friendly and professional manner."
    },
    model = agentModel,
    tools = [sum, multiply]
);
