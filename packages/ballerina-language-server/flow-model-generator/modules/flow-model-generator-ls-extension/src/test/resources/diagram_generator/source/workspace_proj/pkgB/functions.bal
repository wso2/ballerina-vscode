import ballerina/io;

public function processCustomerOrder(Customer customer, decimal orderAmount) returns string|error {
    io:println(string `Processing order for customer: ${customer.name}`);

    // Transform customer data
    ExternalCustomer externalCustomer = mapToExternalCustomer(customer);

    // Validate order amount
    if orderAmount <= 0.0d {
        return error("Invalid order amount");
    }

    io:println(string `Order amount: ${orderAmount}`);
    io:println(string `External customer ID: ${externalCustomer.customerId}`);

    return string `Order processed successfully for ${customer.name}`;
}
