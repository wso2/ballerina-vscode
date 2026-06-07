import ballerina/workflow;

@workflow:Workflow
function orderWorkflow(workflow:Context ctx, OrderInput input) returns string|error {
    return input.orderId;
}

@workflow:Workflow
function approvalWorkflow(workflow:Context ctx, ApprovalInput input) returns string|error {
    return input.requestId;
}

@workflow:Workflow
function unusedWorkflow(workflow:Context ctx) returns string|error {
    return "unused";
}
