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

// Represents the public-facing Order resource.
public type Order record {
    string orderId;
    string customerId;
    OrderStatus status;
    string createdAt;
    decimal totalAmount;
    string currency;
    Address shippingAddress;
    Address billingAddress;
    OrderLine[] orderLines;
    Payment[] payments;
    Shipment[] shipments;
};

// Represents an order as stored in the database, including internal fields.
public type OrderModel record {|
    string orderId;
    string customerId;
    OrderStatus status;
    string createdAt;
    decimal totalAmount;
    string currency;
    json shippingAddress;
    json billingAddress;
    json orderLines;
|};

// Input payload for creating a new order.
public type OrderCreatePayload record {|
    string customerId;
    string currency;
    Address shippingAddress;
    Address billingAddress;
    OrderLinePayload[] orderLines;
    PaymentInfo paymentInfo;
|};

public type OrderLinePayload record {|
    string sku;
    int quantity;
|};

public type OrderLine record {|
    string lineId;
    string sku;
    int quantity;
    decimal unitPrice;
    decimal lineTotal;
|};

public type Address record {|
    string line1;
    string? line2;
    string city;
    string state;
    string zipCode;
    string country;
|};

public type Payment record {|
    string paymentId;
    string status;
    decimal amount;
|};

public type PaymentInfo record {|
    string paymentMethodToken;
    decimal amount;
|};

public type Shipment record {|
    string shipmentId;
    string trackingNumber;
    string carrier;
    string status;
|};

public type OrderStatus "PENDING"|"CONFIRMED"|"AWAITING_PAYMENT"|"FULFILLING"|"SHIPPED"|"DELIVERED"|"CANCELLED"|"RETURNED"|"FAILED";

// Event payloads for Kafka
public type OrderCreatedEvent record {|
    string eventId;
    string eventType = "OrderCreated";
    string timestamp;
    OrderCreatedEventData data;
|};

public type OrderCreatedEventData record {|
    string orderId;
    string customerId;
    string currency;
    decimal totalAmount;
    OrderLinePayload[] orderLines;
    PaymentInfo paymentInfo;
|};

type OrderNotFoundError error;
