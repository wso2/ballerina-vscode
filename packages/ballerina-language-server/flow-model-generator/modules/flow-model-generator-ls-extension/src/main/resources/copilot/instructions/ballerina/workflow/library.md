# Ballerina Workflow Library Instructions

The `ballerina/workflow` library provides support for creating and managing durable, fault-tolerant workflows in Ballerina applications. It is backed by [Temporal](https://temporal.io/) as the workflow engine.

## Key Concepts

1. **Process**: Durable workflow orchestration with automatic state persistence. The main workflow logic function annotated with `@workflow:Process`.
2. **Activity**: A function annotated with `@workflow:Activity` that performs reliable execution of side effects functions (I/O, database calls, external APIs). 
3. **Context (`workflow:Context`)**: provides workflow execution capabilities — call activities, durable sleep, inspect workflow state.
4. **Signals (Events)**: Future-based event handling with correlation. External events sent to a running workflow using `workflow:sendEvent`. Received as `future<T>` fields and awaited using Ballerina's `wait` action.
5. **Correlation Keys**: `readonly` fields in record types that are used to generate composite workflow IDs and route signals without an explicit `id` field.

## Configuration

The workflow module is configured via `Config.toml`. It defaults to a local Temporal server:

```toml
[ballerina.workflow.workflowConfig]
provider = "TEMPORAL"
url = "localhost:7233"
namespace = "default"

[ballerina.workflow.workflowConfig.params]
taskQueue = "MY_TASK_QUEUE"
maxConcurrentWorkflows = 100
maxConcurrentActivities = 100
```

## Defining Activities

Activities perform non-deterministic operations. Annotate with `@workflow:Activity`. Return type must be `T|error`. Activity functions must be defined in `functions.bal`.

```ballerina
import ballerina/workflow;

@workflow:Activity
function checkInventory(string item, int quantity) returns InventoryStatus|error {
    // External system calls, database operations, API invocations
    return database->query(`SELECT * FROM inventory WHERE item = ${item}`);
}
```

**Important**: Activities must be called via ctx->callActivity() within process functions. Direct activity calls are not allowed and will produce a compiler error.

## Defining Process Functions

A process function defines the workflow logic. It must be annotated with `@workflow:Process`. Process functions must be defined in `functions.bal`.

Use `workflow:Context` as the first parameter to call activities via `ctx->callActivity(activityFn, args)`. The `args` record keys must match the activity function's parameter names exactly.

```ballerina

@workflow:Process
function processOrder(workflow:Context ctx, OrderRequest request) returns OrderResult|error {
    // Deterministic workflow orchestration logic
    InventoryStatus inventory = check ctx->callActivity(checkInventory, {item: request.item, quantity: request.quantity});
    
    if inventory.available {
        string reservationId = check ctx->callActivity(reserveStock, {orderId: request.orderId, item: request.item});
        return {status: "completed", reservationId};
    }
    return {status: "insufficient_stock"};
}
```

**Important**: Activity arguments are passed as a `map<anydata>` record where keys match the activity function's parameter names.

## Signal Handling (Events)

Signals allow external systems to send data to a running workflow. The workflow declares expected signals as a `record {| future<SignalType> signalName; |}` parameter and awaits them using Ballerina's `wait` action.

### Process Signature with Signals

```ballerina
public type OrderInput record {|
    readonly string orderId;  // Correlation key
    string item;
|};

public type PaymentEvent record {|
    readonly string orderId;  // Matches correlation key
    decimal amount;
|};

@workflow:Process
function processOrderWithPayment(
    workflow:Context ctx, 
    OrderInput input,
    record {| future<PaymentEvent> payment; |} events
) returns OrderResult|error {
    // Check inventory
    check ctx->callActivity(checkInventory, {item: input.item, quantity: input.quantity});
    
    // Wait for payment signal
    PaymentEvent payment = check wait events.payment;
    
    // Complete order
    return {status: "paid", amount: payment.amount};
}
```

### Sending Signals

Use `workflow:sendEvent` to send a signal to a running workflow. The `signalName` must match the field name in the signals record:

```ballerina
    // Send payment signal
    // The field name 'paymentReceived' in the events record determines the signal name
    PaymentConfirmation payment = {orderId: orderId, amount: paymentData.amount};
    boolean sent = check workflow:sendEvent(processOrderWithPayment, payment, "paymentReceived");
```

## Starting a Workflow

Use `workflow:createInstance` to start a workflow. It returns the workflow ID:

```ballerina
// Start workflow using @workflow:Process function
string workflowId = check workflow:createInstance(processOrderWithPayment, request);
```

## Correlation Keys

When `readonly` fields are used in the process input record, they become correlation keys. This allows the workflow engine to:
- Generate a composite workflow ID (e.g., `orderWorkflow-customerId=C123-orderId=O456`)
- Route signals by matching correlation keys instead of a plain `id` field
- Signal types must have the same `readonly` fields (same name **and** type) as the process input

```ballerina
public type OrderInput record {|
    readonly string orderId;  // Correlation key
    string item;
|};

public type PaymentEvent record {|
    readonly string orderId;  // Matches correlation key
    decimal amount;
|};

@workflow:Process
function processOrderWithPayment(
    workflow:Context ctx, 
    OrderInput input,
    record {| future<PaymentEvent> payment; |} events
) returns OrderResult|error {
    // Check inventory
    check ctx->callActivity(checkInventory, {item: input.item, quantity: input.quantity});
    
    // Wait for payment signal
    PaymentEvent payment = check wait events.payment;
    
    // Complete order
    return {status: "paid", amount: payment.amount};
}
```

Sending a signal with correlation keys (no explicit signal name needed if type is distinct):

```ballerina
// No "id" field needed — correlation keys are used for routing
boolean sent = check workflow:sendEvent(correlatedOrderWorkflow, {
    customerId: "C123",
    orderId: "O456",
    txnId: "TXN-789",
    amount: 99.99d
});
```

## Context APIs

The `workflow:Context` provides:

| Method | Description |
|---|---|
| `ctx->callActivity(fn, args)` | Execute activities with automatic retry and result caching |
| `ctx.sleep(duration)` | Durable sleep that survives worker restarts |
| `ctx.isReplaying()` | Returns `true` if the workflow is replaying history |
| `ctx.getWorkflowId()` | Returns the unique workflow ID |
| `ctx.getWorkflowType()` | Returns the workflow type name |

### Durable Sleep

```ballerina
import ballerina/time;
import ballerina/workflow;

@workflow:Process
function reminderWorkflow(workflow:Context ctx, ReminderInput input) returns string|error {
    // Send initial notification
    _ = check ctx->callActivity(sendEmailActivity, {"to": input.email, "subject": "Reminder scheduled"});

    // Durable sleep for 24 hours — survives worker restarts
    check ctx.sleep({hours: 24, minutes: 0, seconds: 0d});

    // Send reminder
    _ = check ctx->callActivity(sendEmailActivity, {"to": input.email, "subject": "Your reminder"});
    return "Reminder sent";
}
```

### Conditional Side Effects with isReplaying

```ballerina
@workflow:Process
function trackedWorkflow(workflow:Context ctx, TrackInput input) returns string|error {
    // Skip logging during replay to avoid duplicate log entries
    if !ctx.isReplaying() {
        // log:printInfo("Starting workflow: " + input.id);
    }
    string result = check ctx->callActivity(processActivity, {"data": input.data});
    return result;
}
```

