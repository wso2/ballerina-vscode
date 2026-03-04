import ballerina/io;
import ballerina/workflow;

type OrderInput record {
    readonly string orderId;
    string customerName;
};

type ApprovalData record {
    boolean approved;
    string approverName;
};

type PaymentData record {
    decimal amount;
    string currency;
};

// Events type for orderWorkflow
type OrderWorkflowEvents record {|
    future<ApprovalData> approve;
    future<PaymentData> paymentReceived;
|};

# Process an order workflow with events
@workflow:Workflow
function orderWorkflow(workflow:Context ctx, OrderInput input, OrderWorkflowEvents events) returns error? {
    io:println("Processing order: " + input.orderId);
    ApprovalData approval = check wait events.approve;
    io:println("Approved by: " + approval.approverName);
}

type SimpleInput record {
    readonly int id;
};

# Simple workflow without events
@workflow:Workflow
function simpleWorkflow(workflow:Context ctx, SimpleInput input) returns error? {
    io:println("Simple workflow: " + input.id.toString());
}

