import ballerina/ai;

final ai:Wso2ModelProvider aiWso2modelprovider = check ai:getDefaultModelProvider();

public function main() {
    string|error td = aiWso2modelprovider->generate(`Hello World!`);
}
