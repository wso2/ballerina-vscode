type Customer record {|
    string customerId;
    string name;
    string email;
    string phone;
|};

type ShippingAddress record {|
    string street;
    string city;
    string state;
    string zipCode;
    string country;
|};

type ItemsItem record {|
    string itemId;
    string productName;
    int quantity;
    decimal unitPrice;
    decimal subtotal;
|};

type Items ItemsItem[];

type Summary record {|
    decimal subtotal;
    decimal tax;
    decimal shipping;
    decimal total;
|};

type Order record {|
    string orderId;
    string orderDate;
    string status;
    Customer customer;
    ShippingAddress shippingAddress;
    Items items;
    Summary summary;
    string paymentMethod;
    string notes;
|};

type KafkaAnydataConsumer record {|
    *kafka:AnydataConsumerRecord;
    Order value;
|};

type RabbitMQAnydataMessage record {|
    *rabbitmq:AnydataMessage;
    Order content;
|};
