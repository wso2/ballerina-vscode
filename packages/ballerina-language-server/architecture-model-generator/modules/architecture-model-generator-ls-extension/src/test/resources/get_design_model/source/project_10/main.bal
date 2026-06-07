import ballerina/workflow;

public function main() returns error? {
    string _ = check workflow:run(orderWorkflow, {orderId: "o-1", quantity: 1});
}
