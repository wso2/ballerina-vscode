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
