import ballerina/http;
import ballerina/workflow;
import ballerina/workflow.activity;

final http:Client httpClient = check new ("https://api.example.com");

@workflow:Workflow
function myWorkflow(workflow:Context ctx) returns error? {
    json result = check ctx->callActivity(activity:callRestAPI, {connection: httpClient, method: "GET", path: "/users/1"});
}
