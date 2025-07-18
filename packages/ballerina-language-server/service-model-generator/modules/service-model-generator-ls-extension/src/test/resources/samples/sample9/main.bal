import ballerinax/kafka;
import ballerinax/rabbitmq;

listener ai:Listener aiListener = new (listenOn = check http:getDefaultListener());
