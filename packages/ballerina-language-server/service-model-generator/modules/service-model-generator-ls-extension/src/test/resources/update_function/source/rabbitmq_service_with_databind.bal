import ballerinax/rabbitmq;

listener rabbitmq:Listener rabbitmqListener = new ("localhost", 1231);

service "testqueue" on rabbitmqListener {
    remote function onMessage(record {*rabbitmq:AnydataMessage; Order content;} message) returns error? {
        do {

        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

    remote function onError(rabbitmq:AnydataMessage message, rabbitmq:Error rabbitmqError) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
