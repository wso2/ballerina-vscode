import ballerina/http;
import ballerina/workflow;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service /api on httpDefaultListener {

    resource function post submit(OrderInput input) returns string|error {
        return check workflow:run(orderWorkflow, input);
    }

    resource function post approve(ApprovalInput input) returns string|error {
        return check workflow:run(approvalWorkflow, input);
    }
}
