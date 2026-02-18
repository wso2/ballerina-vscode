import ballerina/io;

# Process an order workflow
@workflow:Process
function orderWorkflow(workflow:Context ctx, OrderInput input, OrderWorkflowEvents events) returns error? {

}
