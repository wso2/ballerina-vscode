import ballerinax/rabbitmq;

listener rabbitmq:Listener rabbitmqListener = new (host = "localhost", port = 5672);

service "queueName" on rabbitmqListener {
    remote function onMessage(record {*rabbitmq:AnydataMessage; Order content;} message) returns error? {
        do {
        } on fail error err {
            // handle error
        }
    }
}
