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

// Type definitions for the customer management system
type Address record {
    string street;
    string city;
    string zipCode;
    string country;
};

type Customer record {
    int id;
    string name;
    string email;
    string phone;
    Address address;
    string[] tags;
    decimal creditLimit;
};

type CustomerDTO record {|
    int id;
    string name;
    string email;
|};

type Product record {
    string sku;
    string name;
    decimal price;
    int stockQuantity;
    string category;
    boolean active;
};

type OrderItem record {
    string productSku;
    int quantity;
    decimal unitPrice;
};

type Order record {
    string orderId;
    int customerId;
    OrderItem[] items;
    decimal totalAmount;
    string status;
    string orderDate;
};

type PaymentRecord record {
    string paymentId;
    string orderId;
    decimal amount;
    string method;
    string timestamp;
};

type ConfigData record {|
    string apiKey;
    string endpoint;
    int timeout;
    boolean enableLogging;
|};

type LogEntry record {
    string timestamp;
    string level;
    string message;
    string? userId;
    map<json> metadata;
};
