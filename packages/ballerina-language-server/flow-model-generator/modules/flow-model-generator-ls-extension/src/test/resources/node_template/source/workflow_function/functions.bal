import ballerina/workflow;
import ballerina/io;

type OrderInput record {
    readonly string orderId;
    string customerName;
};

# Process an order workflow
@workflow:Process
function orderWorkflow(workflow:Context ctx, OrderInput input) returns error? {
    io:println("Processing order: " + input.orderId);
}

public function main() {
    io:println("Workflow function project");
}

