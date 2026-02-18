type OrderInput record {
    readonly string orderId;
    string customerName;
};

// Events type for payment workflow - created by WorkflowBuilder
type OrderWorkflowEvents record {|
	future<string> existingEvent;
|};
