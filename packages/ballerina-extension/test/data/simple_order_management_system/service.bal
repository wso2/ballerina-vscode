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
import ballerina/http;
import ballerina/log;

// The service is attached to a listener on the configured port.
@http:ServiceConfig {
    cors: {
        allowOrigins: ["https://grc.com"],
        allowMethods: ["GET", "POST"]
    }
}
service /v1 on new http:Listener(SERVICE_PORT) {

    // POST /v1/orders
    // Creates a new order and initiates the order creation saga.
    resource function post orders(@http:Payload OrderCreatePayload payload) returns OrderCreationResponse|http:InternalServerError|http:BadRequest {
        // Basic validation
        if payload.orderLines.length() == 0 {
            log:printWarn("Create order attempt with no order lines", customerId = payload.customerId);
            return <http:BadRequest>{body: {message: "Order must contain at least one line item."}};
        }

        // Delegate to the business logic function
        var result = createNewOrder(payload);
        
        if result is OrderCreationResponse {
            log:printInfo("Order creation process initiated", orderId = result.orderId);
            return result;
        } else {
            log:printError("Failed to initiate order creation", result);
            return <http:InternalServerError>{body: {message: "An internal error occurred while creating the order."}};
        }
    }

    resource function get orders/[string orderId]() returns Order|http:NotFound|http:InternalServerError {
        var 'order = getOrderById(orderId);

        if 'order is Order {
            return 'order;
        } else if 'order is OrderNotFoundError {
            log:printWarn("Order not found", orderId = orderId);
            return <http:NotFound>{body: {message: string `Order with ID ${orderId} not found.`}};
        }
    }
}

public type OrderCreationResponse record {|
    string orderId;
    string status = "PENDING";
    string message = "Order received and is being processed.";
|};
