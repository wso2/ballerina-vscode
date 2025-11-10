import ballerinax/rabbitmq;
import ballerinax/solace;

listener rabbitmq:Listener orderListener = new (rabbitmq:DEFAULT_HOST, 5671);
listener rabbitmq:Listener deliveryListener = new (rabbitmq:DEFAULT_HOST, 5671);
listener solace:Listener solaceListener = new ("smf://localhost:55554", messageVpn = "default");
