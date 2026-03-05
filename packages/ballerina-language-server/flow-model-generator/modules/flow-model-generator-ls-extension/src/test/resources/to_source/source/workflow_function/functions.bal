import ballerina/io;
import ballerina/workflow;

type OrderInput record {
    readonly string orderId;
    string customerName;
};

type NotificationInput record {
    string message;
    string recipient;
};

# Process an order workflow
@workflow:Workflow
function orderWorkflow(workflow:Context context, OrderInput input) returns error? {

}

# Send notification activity
@workflow:Activity
function sendNotification(int time, NotificationInput input) returns int|error {
    io:println("Sending notification: " + input.message);
    return 1;
}

# Simple activity with no parameters
@workflow:Activity
function myActivity() returns int {
    io:println("hello from activity");
    return 5;
}

# Process an order workflow
@workflow:Workflow
function orderWorkflow2(OrderInput input) returns error? {

}

@workflow:Workflow
function workflowWithNoInput() returns error? {

}