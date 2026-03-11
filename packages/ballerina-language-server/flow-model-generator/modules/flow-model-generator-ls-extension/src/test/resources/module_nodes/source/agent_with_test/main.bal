import ballerina/http;
import ballerina/ai;

final ai:Wso2ModelProvider customerSupportModel = check ai:getDefaultModelProvider();

final ai:Agent mathTutorAgent = check new (
    systemPrompt = {
        role: string `Customer Support Assistant`,
        instructions: string `You are a helpful assistant`
    }, model = customerSupportModel
);

final http:Client httpClient = check new ("http://example.com");

public function main() returns error? {
    http:Client localHttpClient = check new ("http://localhost:8080");
}
