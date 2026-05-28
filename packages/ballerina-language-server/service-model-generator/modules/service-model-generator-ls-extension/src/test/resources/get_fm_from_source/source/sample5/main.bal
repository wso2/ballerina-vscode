import ballerinax/kafka;

listener kafka:Listener kafkaListener = new (bootstrapServers = "localhost");

service kafka:Service on kafkaListener {
    remote function onConsumerRecord(Person[] personStream, kafka:Caller myCaller) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

    remote function onError(kafka:Error kafkaError) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}

type Person record {|
    string name;
    int age;
    string address;
|};
