import ballerina/ai;

final ai:Wso2ModelProvider aiWso2modelprovider = check ai:getDefaultModelProvider();

public function main() {
    ai:Prompt llmPrompt = `Hello World!`;
    string|error td = aiWso2modelprovider->generate(llmPrompt);
}
