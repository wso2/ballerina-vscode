import ballerina/ai;
import ballerina/http;

listener ai:Listener salesAgentListener = new (listenOn = check http:getDefaultListener());

service /salesAgent on salesAgentListener {
    final ai:Wso2ModelProvider _salesAgentModel;
    final ai:Agent _salesAgentAgent;

    function init() {
        self._salesAgentModel = check ai:getDefaultModelProvider();
        self._salesAgentAgent = check new (
            systemPrompt = {role: "", instructions: string ``}, model = self._salesAgentModel, tools = []
        );
    }

    resource function post chat(@http:Payload ai:ChatReqMessage request) returns ai:ChatRespMessage|error {

    }
}
