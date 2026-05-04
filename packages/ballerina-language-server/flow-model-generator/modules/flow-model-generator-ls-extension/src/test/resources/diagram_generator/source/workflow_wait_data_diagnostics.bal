import ballerina/workflow;

type ApprovalEvents record {|
    future<string> reviewerNote;
    future<boolean> compliancePass;
|};

# Approval process whose tuple binding pattern uses non-nilable members with minCount < length —
# the workflow compiler plugin should report WORKFLOW_123 on each tuple member type.
@workflow:Workflow
function approvalProcess(workflow:Context ctx, ApprovalEvents events) returns error? {
    [string, boolean] [note, pass] = check ctx->await([events.reviewerNote, events.compliancePass], minCount = 1);
}
