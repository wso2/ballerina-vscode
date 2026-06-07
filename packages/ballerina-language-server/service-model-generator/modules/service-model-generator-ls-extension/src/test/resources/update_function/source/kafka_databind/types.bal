import ballerinax/kafka;

type KafkaAnydataConsumer record {|
    *kafka:AnydataConsumerRecord;
    json content;
|};
