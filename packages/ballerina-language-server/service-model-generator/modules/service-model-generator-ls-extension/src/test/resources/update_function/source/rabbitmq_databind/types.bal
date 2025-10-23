import ballerinax/rabbitmq;

type RabbitMQAnydataMessage record {|
    *rabbitmq:AnydataMessage;
    json content;
|};
