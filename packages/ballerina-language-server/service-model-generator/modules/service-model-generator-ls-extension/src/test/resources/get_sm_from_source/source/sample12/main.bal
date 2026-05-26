import ballerinax/kafka;

listener kafka:Listener kafkaListener = check new (bootstrapServers = "localhost:9092", groupId = "unique-group-id", topics = "my-topic");

service on kafkaListener {
    remote function onConsumerRecord(KafkaAnydataConsumer[] messages) returns error? {
        do {
        } on fail error err {
            // handle error
        }
    }
}
