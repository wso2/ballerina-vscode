import ballerina/http;
import ballerina/workflow;

final http:Client inventoryClient = check new ("http://localhost:9090");

@workflow:Activity
function reserveInventory(OrderInput input) returns string|error {
    string result = check inventoryClient->/reserve.post(input);
    return result;
}

@workflow:Activity
function notifyCustomer(string orderId) returns string|error {
    return "notified: " + orderId;
}
