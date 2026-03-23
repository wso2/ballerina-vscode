import ballerina/http;
import ballerina/workflow;

type OrderInput record {
    readonly string orderId;
    string customerName;
};

final http:Client httpClient = check new ("http://localhost:9090");

# Process an order workflow
@workflow:Workflow
function orderWorkflow(workflow:Context context, OrderInput input) returns error? {

}
