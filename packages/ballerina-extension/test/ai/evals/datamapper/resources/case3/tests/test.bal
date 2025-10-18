import ballerina/test;

Customer customer = {
    customerId: "C456",
    name: "Bob Smith",
    address: {
        street: "123 Main St",
        city: "New York",
        zipCode: "10001"
    },
    contact: {
        email: "bob.smith@example.com",
        phone: "555-1234"
    }
};

CustomerInfo info = transformCustomer(customer);

@test:Config {}
function testCustomerId() {
    test:assertEquals(info.id, "C456");
}

@test:Config {}
function testCustomerName() {
    test:assertEquals(info.customerName, "Bob Smith");
}

@test:Config {}
function testLocation() {
    test:assertEquals(info.location, "New York");
}

@test:Config {}
function testEmailAddress() {
    test:assertEquals(info.emailAddress, "bob.smith@example.com");
}
