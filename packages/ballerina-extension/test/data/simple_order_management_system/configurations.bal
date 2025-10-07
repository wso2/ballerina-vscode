// Database Configurations
configurable string DB_HOST = "localhost";
configurable int DB_PORT = 5432;
configurable string DB_USER = "user";
configurable string DB_PASSWORD = "password";
configurable string DB_NAME = "order_db";

// Kafka Producer Configurations
configurable string KAFKA_BROKER_URL = "localhost:9092";
configurable string KAFKA_ORDER_EVENTS_TOPIC = "order.events";

// Service Port
configurable int SERVICE_PORT = 9090;
