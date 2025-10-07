// main.bal
import ballerinax/postgresql;
import ballerinax/kafka;
import ballerina/log;
import ballerina/lang.runtime as runtime;

// Initialize the PostgreSQL client globally.
// This client manages a connection pool for efficiency.
public final postgresql:Client dbClient = check new (
    host = DB_HOST,
    port = DB_PORT,
    username = DB_USER,
    password = DB_PASSWORD,
    database = DB_NAME
);

// Initialize the Kafka producer globally.
public final kafka:Producer kafkaProducer = check new (
    bootstrapServers = [KAFKA_BROKER_URL]
);

public function main() {
    // The service is defined in service.bal and will start automatically
    // as it's attached to a listener. We just log that the service is starting.
    log:printInfo("Order Service starting up...", port = SERVICE_PORT, db = DB_HOST, kafka = KAFKA_BROKER_URL);

    // Graceful shutdown hook
    runtime:onGracefulStop(function () {
        log:printInfo("Shutting down Order Service...");
        checkpanic kafkaProducer->close();
        checkpanic dbClient.close();
        log:printInfo("Shutdown complete.");
    });
}
