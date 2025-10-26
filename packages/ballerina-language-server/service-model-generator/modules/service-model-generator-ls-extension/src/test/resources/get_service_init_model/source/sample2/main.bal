import ballerinax/rabbitmq;

listener rabbitmq:Listener orderListener = new (rabbitmq:DEFAULT_HOST, 5671);
listener rabbitmq:Listener deliveryListener = new (rabbitmq:DEFAULT_HOST, 5671);
