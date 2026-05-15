import ballerina/workflow;

type OptionalEvents record {|
    future<string> reviewerNote;
    future<boolean> compliancePass;
|};

# Optional wait — single nilable type. The CodeAnalyzer should detect `string?` and surface
# the optional FLAG property as `true` with `dataType` set to the bare type `string`.
@workflow:Workflow
function optionalSingleWait(workflow:Context ctx, OptionalEvents events) returns error? {
    string? note = check wait events.reviewerNote;
}

# Optional wait — mixed tuple. The first member is nilable (`string?`); the second is non-nilable.
# Each entry's `optional` flag must reflect that, and the `dataType` strings must be `string` / `boolean`.
@workflow:Workflow
function optionalTupleWait(workflow:Context ctx, OptionalEvents events) returns error? {
    [string?, boolean] [note, pass] = check ctx->await([events.reviewerNote, events.compliancePass], minCount = 1);
}
