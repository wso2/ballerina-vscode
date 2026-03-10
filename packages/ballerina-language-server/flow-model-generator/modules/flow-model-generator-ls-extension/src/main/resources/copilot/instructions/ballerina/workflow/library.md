# Ballerina Workflow Library Instructions

The `ballerina/workflow` library provides support for creating and managing durable, fault-tolerant workflow orchestrations in Ballerina applications. It is backed by [Temporal](https://temporal.io/) as the workflow engine.

## Key Features

1. **Workflow**: Durable workflow orchestration with automatic state persistence. The main workflow logic function annotated with `@workflow:Workflow`.
2. **Activity**: A function annotated with `@workflow:Activity` that performs reliable execution of side effects functions (I/O, database calls, external APIs). 
3. **Context (`workflow:Context`)**: provides workflow execution capabilities — call activities, durable sleep, inspect workflow state.
4. **Data Handling**: Future-based data handling for waiting on external data/signals using `workflow:sendData`
Received as `future<T>` fields and awaited using Ballerina's `wait` action.
5. **Run Workflows**: workflowConfiginConfig.toml is required to run workflows.


## Defining Activities

Activities perform non-deterministic operations. Annotate with `@workflow:Activity`. Return type must be `T|error`.

**All activity functions must be placed in the `functions.bal` file in the project.**

```ballerina
import ballerina/workflow;

@workflow:Activity
function checkInventory(string item, int quantity) returns InventoryStatus|error {
    // External system calls, database operations, API invocations
    return database->query(`SELECT * FROM inventory WHERE item = ${item}`);
}
```

**Important**: Activities must be called via `ctx->callActivity()` within workflow functions. Direct activity calls are not allowed and will produce a compiler error.

## Defining Workflow Functions

A workflow function defines the workflow logic. It must be annotated with `@workflow:Workflow`.

**All workflow functions must be placed in the `functions.bal` file in the project.**

**Important**: Workflow functions should only contain orchestration logic (control flow, waiting for data). All business logic, computations, non-deterministic operations (database calls, external API calls, I/O operations) must be implemented in activity functions and called via `ctx->callActivity()`.

Use `workflow:Context` as the first parameter to call activities.

**Important**: When calling activities, pass args as a record where keys exactly match the activity function's parameter names.

```ballerina
type OrderRequest record {|
    string orderId;
    string item;
|};

@workflow:Workflow
function processOrder(workflow:Context ctx, OrderRequest request) returns OrderResult|error {
    // Deterministic workflow orchestration logic
    int stock = check ctx->callActivity(checkInventory, {"item": request.item});
    
    if stock <= 0 {
        return {orderId: request.orderId, status: "FAILED", message: "Out of stock"};
    }
    return {orderId: request.orderId, status: "COMPLETED", message: "Order completed successfully"};
}
```

## Starting a Workflow

Use `workflow:run()` to start a workflow. Returns the workflow ID. **Store the workflow ID so you can send signals to the workflow when calling the `workflow:sendData()`.**

```ballerina
import ballerina/workflow;

// Tracks running workflow IDs keyed by orderId so payment signals can be
// routed to the correct workflow instance.
map<string> orderWorkflowIds = {};

resource function post .(OrderRequest request) returns json|error {
    string workflowId = check workflow:run(processOrderWithPayment, request);
    orderWorkflowIds[request.orderId] = workflowId;

    return {
        "status": "success",
        "workflowId": workflowId,
        "orderId": request.orderId,
        "message": "Order placed. Awaiting payment."
    };
}
```

## Data Handling

Workflows can wait for external data using future-based events. Declare data as a `record {| future<DataType> dataName; |} data` parameter and await with Ballerina's `wait` action.

```ballerina
type OrderRequest record {|
    string orderId;
    string item;
|};

type PaymentConfirmation record {|
    decimal amount;
|};

type OrderResult record {|
    string orderId;
    string status;
    string message;
|};

@workflow:Workflow
function processOrderWithPayment(
    workflow:Context ctx, 
    OrderRequest request,
    record {| future<PaymentConfirmation> paymentReceived; |} dataEvents
) returns OrderResult|error {
    // Check inventory
    int stock = check ctx->callActivity(checkInventory, {"item": request.item});
    
    if stock <= 0 {
        return {orderId: request.orderId, status: "FAILED", message: "Out of stock"};
    }

    // Wait for payment data event using Ballerina's native wait
    PaymentConfirmation payment = check wait dataEvents.paymentReceived;
    
    return {orderId: request.orderId, status: "COMPLETED", message: "Order completed successfully"};
}
```

Send data to a running workflow with `workflow:sendData()`.  

**The first argument must be the workflow function reference, and the second argument must be the workflow ID returned by `workflow:run()`.**  

The `dataName`:  the name identifying the data. Must match a field name in the workflow's events record parameter.

```ballerina
// Start the workflow and keep the workflow ID
string workflowId = check workflow:run(processOrderWithPayment, request);

// ... later, to send data to the running workflow
PaymentConfirmation payment = {amount: paymentData.amount};
check workflow:sendData(processOrderWithPayment, workflowId, "paymentReceived", payment);
```

## Activity Options

Configure retry behavior and error handling per activity call using `ActivityOptions`:

```ballerina
// Custom retry policy
string result = check ctx->callActivity(sendEmailActivity, 
    {email: recipientEmail}, 
    options = {retryPolicy: {maximumAttempts: 3, initialIntervalInSeconds: 2}});

// Treat errors as normal completion (no retry on error)
string|error result = ctx->callActivity(riskyActivity, 
    {data: input}, 
    options = {failOnError: false});
```

## Context APIs

| Method | Description |
|---|---|
| `ctx->callActivity(fn, args, options?)` | Execute an activity with exactly-once semantics |
| `ctx.sleep(duration)` | Durable sleep that survives worker restarts |
| `ctx.isReplaying()` | Returns `true` if the workflow is replaying history |
| `ctx.getWorkflowId()` | Returns the unique workflow ID |
| `ctx.getWorkflowType()` | Returns the workflow type name |

Use `ctx.sleep()` for durable delays and `ctx.isReplaying()` to skip side effects (e.g., logging) during replay.


## Testing Workflows

When generating workflow code, also update `Config.toml` in the project with the `workflowConfig` section shown below. This enables in-memory mode for easy local testing without requiring a Temporal server.

```toml
[ballerina.workflow.workflowConfig]
mode = "IN_MEMORY"
```

Other supported modes: `LOCAL`, `CLOUD`, `SELF_HOSTED`.

