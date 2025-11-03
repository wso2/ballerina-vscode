import ballerina/http;
import ballerinax/ai;

final ai:OpenAiProvider _WorkflowAgentModel = check new ("", ai:GPT_4O);
final ai:Agent _WorkflowAgentAgent = check new (systemPrompt = {role: string `Role with ${"`"}backticks${"`"}`, instructions: string `Instructions with ${"`"}backticks${"`"}`},
    model = _WorkflowAgentModel,
    tools = []
);

listener ai:Listener WorkflowAgentListener = new (listenOn = check http:getDefaultListener());

service /WorkflowAgent on WorkflowAgentListener {
    resource function post chat(@http:Payload ai:ChatReqMessage request) returns ai:ChatRespMessage|error {

        string stringResult = check _WorkflowAgentAgent->run(request.message, request.sessionId);
        return {message: stringResult};
    }
}
