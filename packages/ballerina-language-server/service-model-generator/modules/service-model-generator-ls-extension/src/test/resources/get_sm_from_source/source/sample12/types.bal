import ballerinax/kafka;

type KafkaAnydataConsumer record {|
    *kafka:AnydataConsumerRecord;
    Order value;
|};

type Order record {|
    int orderId;
    string productName;
    int quantity;
 |};
