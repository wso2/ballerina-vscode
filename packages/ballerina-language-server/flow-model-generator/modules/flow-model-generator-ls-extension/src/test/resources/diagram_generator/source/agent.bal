import ballerina/ai;
import ballerina/http;

listener ai:Listener MathTutorListener = new (listenOn = check http:getDefaultListener());

service /MathTutor on MathTutorListener {
    resource function post chat(@http:Payload ai:ChatReqMessage request) returns ai:ChatRespMessage|error {
        ai:Context agentContext = new ();
        agentContext.set("token", "123");
        return {message: ""};
    }
}
