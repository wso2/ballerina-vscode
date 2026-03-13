import ballerina/io;
import ballerina/workflow;

type OrderInput record {
    readonly string orderId;
    string customerName;
};

# Process an order workflow
@workflow:Workflow
function orderWorkflow(workflow:Context ctx, OrderInput input) returns error? {

    io:println("Processing order: " + input.orderId);
}
