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
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;
import ballerina/log;
import ballerina/lang.value as value;

// --- Business Logic Functions ---

// Orchestrates the creation of a new order.
public function createNewOrder(OrderCreatePayload payload) returns OrderCreationResponse|error {
    // 1. Generate a unique order ID
    string orderId = uuid:createType4AsString();
    
    // 2. TODO: Call Catalog/Pricing service to get prices and calculate total.
    // This would be a synchronous blocking call. For now, we mock it.
    decimal totalAmount = calculateTotal(payload.orderLines);

    // 3. Persist the initial order record to the database in 'PENDING' state
    sql:ExecutionResult|sql:Error dbResult = insertInitialOrder(orderId, payload, totalAmount);

    if dbResult is sql:Error {
        log:println("Database error on initial order insert", dbResult);
        return dbResult;
    }

    // 4. Create the OrderCreated event payload
    OrderCreatedEvent eventPayload = {
        eventId: uuid:createType4AsString(),
        timestamp: time:utcToString(time:utcNow()),
        data: {
            orderId: orderId,
            customerId: payload.customerId,
            currency: payload.currency,
            totalAmount: totalAmount,
            orderLines: payload.orderLines,
            paymentInfo: payload.paymentInfo
        }
    };

    // 5. Publish the event to Kafka to kick off the saga
    error kafkaResult = publishOrderEvent(eventPayload);

    if kafkaResult is error {
        log:printError("Kafka publish error", kafkaResult);
        // CRITICAL: Handle this failure. Maybe move to a DLQ or retry.
        // For now, we return an error. A compensating transaction to cancel the DB entry would be needed here.
        return kafkaResult;
    }
    
    return {orderId: orderId};
}

// Retrieves an order by its ID from the database.
public function getOrderById(string orderId) returns Order|OrderNotFoundError|error {
    int query = `SELECT orderId, customerId, status, createdAt, totalAmount, currency, shippingAddress, billingAddress, orderLines FROM orders WHERE orderId = ${orderId};`;
    
    stream<OrderModel, sql:Error?> resultStream = dbClient->query(query);
    
    record {|OrderModel value;|}? row = check resultStream.next();
    check resultStream.close();
    
    if row is () {
        return error OrderNotFoundError("Order not found: " + orderId);
    }
    
    OrderModel dbOrder = row.value;

    // Convert JSON fields back to proper types
    Address shippingAddress = check value:cloneWithType(dbOrder.shippingAddress, Address);
    Address billingAddress = check value:cloneWithType(dbOrder.billingAddress, Address);
    OrderLine[] orderLines = check value:cloneWithType(dbOrder.orderLines);

    // Convert status string to OrderStatus
    OrderStatus orderStatus = check value:ensureType(dbOrder.status, OrderStatus);

    // The data is stored as JSON in the DB, so we need to convert it back to Ballerina records.
    Order finalOrder = {
        orderId: dbOrder.orderId,
        customerId: dbOrder.customerId,
        status: orderStatus,
        createdAt: dbOrder.createdAt,
        totalAmount: dbOrder.totalAmount,
        currency: dbOrder.currency,
        shippingAddress: shippingAddress,
        billingAddress: billingAddress,
        orderLines: orderLines,
        payments: [], // TODO: Fetch from payment service or join table
        shipments: []  // TODO: Fetch from shipment service or join table
    };

    return finalOrder;
}

// --- Database Helper Functions ---

function insertInitialOrder(string orderId, OrderCreatePayload payload, decimal totalAmount) returns sql:ExecutionResult|sql:Error {
    // NOTE: In a real system, prices would come from a pricing service.
    OrderLine[] linesWithPrices = from var line in payload.orderLines
        select {
            lineId: uuid:createType4AsString(),
            sku: line.sku,
            quantity: line.quantity,
            unitPrice: 99.99, // Mock price
            lineTotal: 99.99 * line.quantity
        };

    json shippingAddressJson = value:toJson(payload.shippingAddress);
    json billingAddressJson = value:toJson(payload.billingAddress);
    json orderLinesJson = value:toJson(linesWithPrices);

    string shippingAddressStr = value:toJsonString(shippingAddressJson);
    string billingAddressStr = value:toJsonString(billingAddressJson);
    string orderLinesStr = value:toJsonString(orderLinesJson);

    sql:ParameterizedQuery insertQuery = `INSERT INTO orders (orderId, customerId, status, createdAt, totalAmount, currency, shippingAddress, billingAddress, orderLines) VALUES (${orderId}, ${payload.customerId}, ${"PENDING"}, ${time:utcToString(time:utcNow())}, ${totalAmount}, ${payload.currency}, ${shippingAddressStr}, ${billingAddressStr}, ${orderLinesStr});`;
    
    return dbClient->execute(insertQuery);
}

// --- Kafka Helper Functions ---

private function publishOrderEvent(OrderCreatedEvent eventPayload) returns error? {
    json eventJson = value:toJson(eventPayload);
    string eventString = value:toJsonString(eventJson);
    
    // The Kafka producer sends the message asynchronously.
    // The `flush()` call ensures it's sent before the function returns.
    check kafkaProducer->send({
        topic: KAFKA_ORDER_EVENTS_TOPIC,
        key: eventPayload.data.orderId,
        value: eventString.toBytes()
    });
    
    check kafkaProducer->'flush();
    log:printInfo("Published OrderCreated event to Kafka", orderId = eventPayload.data.orderId);
}

// --- Utility and Error Types ---

function calculateTotal(OrderLinePayload[] lines) returns decimal {
    decimal total = 0.0;
    foreach var line in lines {
        total += <string>99.99 * line.quantity; // Use mocked price
    }
    return total;
}
