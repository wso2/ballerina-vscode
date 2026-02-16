import ballerina/workflow;
import ballerina/io;

type OrderInput record {
    readonly string orderId;
    string customerName;
};

type ApprovalEvent record {
    *OrderInput;
    boolean approved;
};

type Events record {
    future<ApprovalEvent> approval;
};

# Process an order workflow
@workflow:Process
function orderWorkflow(workflow:Context ctx, OrderInput input, Events events) returns error? {
    io:println("Processing order: " + input.orderId);
    ApprovalEvent approval = check wait events.approval;
    if approval.approved {
        io:println("Order approved");
    }
}

# Simple workflow without events
@workflow:Process
function simpleWorkflow(workflow:Context ctx, string taskId) returns string|error {
    io:println("Processing task: " + taskId);
    return "completed";
}

@workflow:Activity
function sendNotification(string message) returns boolean|error {
    io:println("Sending notification: " + message);
    return true;
}

@workflow:Activity
function sendEmail(string message) returns boolean|error {
    io:println("Sending email: " + message);
    return true;
}
