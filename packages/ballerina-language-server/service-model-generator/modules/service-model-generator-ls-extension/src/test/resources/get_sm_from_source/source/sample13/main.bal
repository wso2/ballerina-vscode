import ballerinax/solace;

listener solace:Listener solaceListener = new ("smf://localhost:55554", messageVpn = "default", auth = {username: "asdf"});

@solace:ServiceConfig {
    queueName: "test-queue",
    sessionAckMode: "AUTO_ACKNOWLEDGE"
}
service solace:Service on solaceListener {
    remote function onMessage(solace:Message message) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
