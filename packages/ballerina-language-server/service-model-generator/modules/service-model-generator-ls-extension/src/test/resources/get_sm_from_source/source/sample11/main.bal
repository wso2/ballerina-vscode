import ballerinax/kafka;
import ballerinax/rabbitmq;

listener kafka:Listener kafkaListener = new (bootstrapServers = "localhost:9092", groupId = "unique-group-id", topics = "my-topic");

service on kafkaListener {
    remote function onConsumerRecord(KafkaAnydataConsumer[] messages) returns error? {
        do {
        } on fail error err {
            // handle error
        }
    }
}

listener rabbitmq:Listener rabbitmqListener = new (host = "localhost", port = 5672);

service "queueName" on rabbitmqListener {
    remote function onMessage(RabbitMQAnydataMessage message) returns error? {
        do {
        } on fail error err {
            // handle error
        }
    }
}
