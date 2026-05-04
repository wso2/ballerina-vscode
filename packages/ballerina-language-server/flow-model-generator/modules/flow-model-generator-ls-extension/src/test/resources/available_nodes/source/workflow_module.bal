import ballerina/workflow;
import ballerina/http;

type Events record {
    future<Approve> approve;
};

type Input record {
    readonly int id;
};

type Approve record {
    *Input;
    boolean approved;
};

@workflow:Workflow
function startWorkflow(workflow:Context ctx, Input input, Events events) returns error? {

}

@workflow:Activity
function myActivity() returns int {
    return 5;
}

service / on new http:Listener(8081) {
    resource function post startWorkflow/[int id]() returns error? {

    }
}
