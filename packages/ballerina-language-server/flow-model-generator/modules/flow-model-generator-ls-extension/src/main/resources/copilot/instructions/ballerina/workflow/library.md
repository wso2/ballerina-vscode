# Ballerina Workflow Library Instructions

The `ballerina/workflow` library provides support for creating and managing durable, fault-tolerant workflows in Ballerina applications. It is backed by [Temporal](https://temporal.io/) as the workflow engine.

## Key Concepts

1. **Workflow**: Durable workflow orchestration with automatic state persistence. The main workflow logic function annotated with `@workflow:Workflow`.
2. **Activity**: A function annotated with `@workflow:Activity` that performs reliable execution of side effects functions (I/O, database calls, external APIs). 
3. **Context (`workflow:Context`)**: provides workflow execution capabilities — call activities, durable sleep, inspect workflow state.
4. **Data**: External data sent to a running workflow using `workflow:sendData`. Received as `future<T>` fields and awaited using Ballerina's `wait` action.
5. **Inputs**: A parameter which is type of `anydata` passed when starting a workflow. The workflow function can declare the input parameter to receive this data.

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

## Defining Workflow Functions

A workflow function defines the workflow logic. It must be annotated with `@workflow:Workflow`. Workflow functions must be defined in `functions.bal`.

Use `workflow:Context` as the first parameter to call activities via `ctx->callActivity(activityFn, args)`. The `args` record keys must match the activity function's parameter names exactly.

```ballerina

@workflow:Workflow
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

## Data Handling

Data allow external systems to send data to a running workflow. The workflow declares expected data as a `record {| future<DataType> dataName; |} data` parameter and awaits them using Ballerina's `wait` action.

### Workflow Signature with Data

```ballerina
public type OrderInput record {|
    readonly string orderId;
|};

public type PaymentEvent record {|
    readonly string orderId;
    decimal amount;
|};

@workflow:Workflow
function processOrderWithPayment(
    workflow:Context ctx, 
    OrderInput input,
    record {| future<PaymentEvent> payment; |} data
) returns OrderResult|error {
    // Check inventory
    check ctx->callActivity(checkInventory, {item: input.item, quantity: input.quantity});
    
    // Wait for payment data
    PaymentEvent payment = check wait data.payment;
    
    // Complete order
    return {status: "paid", amount: payment.amount};
}
```

### Sending Data to a Running Workflow

Use `workflow:sendData` to send a data to a running workflow. The `dataName` must match the field name in the Data record:

```ballerina
    // Send payment data
    // The field name 'paymentReceived' in the data record determines the data name
    PaymentConfirmation payment = {orderId: orderId, amount: paymentData.amount};
    boolean sent = check workflow:sendData(processOrderWithPayment, payment, "paymentReceived");
```

## Running a Workflow

Use `workflow:run` to run a workflow. It returns the workflow ID:

```ballerina
// Run workflow using workflow:run function
string workflowId = check workflow:run(processOrderWithPayment, request);
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

