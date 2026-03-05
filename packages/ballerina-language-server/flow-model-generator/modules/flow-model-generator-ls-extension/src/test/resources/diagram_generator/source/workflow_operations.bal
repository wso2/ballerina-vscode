import ballerina/workflow;
import ballerina/io;

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
    // Activity call - should be ACTIVITY_CALL
    int intResult = check ctx->callActivity(calculateDiscount, {amount: 100.0});
    io:println("Discount calculated: " + intResult.toString());

    // Wait for data - should be WAIT_DATA
    ApprovalData approval = check wait events.approve;
    io:println("Approved by: " + approval.approverName);
}

# Activity function for calculating discount
@workflow:Activity
function calculateDiscount(record {decimal amount;} input) returns int|error {
    return 10;
}

public function main() returns error? {
    // Workflow run - should be WORKFLOW_RUN
    string workflowId = check workflow:run(orderWorkflow, {orderId: "123", customerName: "John"});
    io:println("Workflow started with ID: " + workflowId);

    // Send data - should be SEND_DATA
    check workflow:sendData(orderWorkflow, {approved: true, approverName: "Admin"}, "approve");
}
