import ballerina/workflow;

@workflow:Workflow
function wfSimpleWait(workflow:Context ctx, WfInput input, WfData1 data) returns error? {
    boolean a = check wait data.a;
    string b = check wait data.b;
}

@workflow:Workflow
function wfAwait(workflow:Context ctx, WfInput input, WfData2 data) returns error? {
    [string] [b] = check ctx->await([data.b]);
    boolean a = check wait data.a;
}

@workflow:Workflow
function wfSingleField(workflow:Context ctx, WfInput input, WfData3 data) returns error? {
    boolean a = check wait data.a;
}

@workflow:Workflow
function wfSingleFieldOneParam(WfData3 data) returns error? {
    boolean a = check wait data.a;
}