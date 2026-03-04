import ballerina/io;
import ballerina/workflow;

# Process an order workflow
@workflow:Workflow
function orderWorkflow(workflow:Context ctx, OrderInput input) returns error? {

}

# Process an booking workflow
@workflow:Workflow
function bookingWorkflow(workflow:Context ctx, BookingInput input, BookingWorkflowEvents events) returns error? {
    PaymentConfirmation paymentConfirm = check wait events.paymentConfirmed;

}

# Process an booking workflow
@workflow:Workflow
function bookingWorkflow1(BookingInput input, BookingWorkflowEvents events) returns error? {
    PaymentConfirmation paymentConfirm = check wait events.paymentConfirmed;

}
