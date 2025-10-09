import ballerinax/kafka;
import ballerina/log;
import ballerina/lang.value as value;

const string SUCCESS = "SUCCESS";
const string ORDERS_TOPIC = "orders-topic";

listener kafka:Listener orderKafkaListener = check new (
    bootstrapServers = "localhost:9092",
    groupId = "order-group",
    topics = ["orders"]
);

kafka:Producer kafkaProducer = check new (bootstrapServers = "localhost:9092");

type Order record {
    string status;
};

function getOrdersFromRecords(kafka:BytesConsumerRecord[] records) returns Order[]|error {
    Order[] orders = [];
    foreach var rec in records {
        Order 'order = check value:fromJsonStringWithType(check string:fromBytes(rec.value));
        orders.push('order);
    }
    return orders;
}

service kafka:Service on orderKafkaListener {

    remote function onConsumerRecord(kafka:Caller caller, kafka:BytesConsumerRecord[] records) returns error? {
        error? err = from Order 'order in check getOrdersFromRecords(records)
            where 'order.status == SUCCESS
            do {
                log:printInfo("Sending successful order to " + ORDERS_TOPIC + " " + 'order.toString());
                check kafkaProducer->send({topic: ORDERS_TOPIC, value: 'order.toString().toBytes()});
            };
        if err is error {
            log:printError("Unknown error occured", err);
        }
    }
}