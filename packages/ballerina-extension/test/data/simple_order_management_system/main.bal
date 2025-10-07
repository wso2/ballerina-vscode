// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.
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
