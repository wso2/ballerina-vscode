import ballerinax/rabbitmq;

listener rabbitmq:Listener rabbitmqListener = new (host = "localhost", port = 5672);

service "queueName" on rabbitmqListener {
    remote function onMessage(RabbitMQAnydataMessage message) returns error? {
        do {
        } on fail error err {
            // handle error
        }
    }
}
