type OrderInput record {
    readonly string orderId;
    string customerName;
};

type BookingInput record {
    readonly string orderId;
    string customerName;
};

type ExpenseClaimInput record {
    readonly string orderId;
    string customerName;
};

type BookingWorkflowEvents record {
    future<PaymentConfirmation> paymentConfirmed;
};

type PaymentConfirmation record {
    string confirmationId;
    decimal amount;
};
