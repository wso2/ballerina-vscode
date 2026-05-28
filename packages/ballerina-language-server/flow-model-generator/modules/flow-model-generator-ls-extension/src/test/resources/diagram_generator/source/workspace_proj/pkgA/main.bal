import ballerina/io;

import wso2/pkgB;

public function callProcessOrder(pkgB:Customer customer) returns error? {
    string result = check pkgB:processCustomerOrder(customer, 250.75);
    io:println(result);
}

public function callDataMapper() {
    pkgB:Customer customer = {
        id: "CUST200",
        name: "Foo Bar",
        email: "foo@example.com",
        phoneNumber: "+1122334455",
        address: "Foo St"
    };

    pkgB:ExternalCustomer externalCustomer = pkgB:mapToExternalCustomer(customer);
    io:println(string `Mapped customer: ${externalCustomer.fullName} (${externalCustomer.customerId})`);
}

public function createConnectionAndMakeRemoteCalls() returns error? {
    // Create new CustomerApiClient connection
    pkgB:CustomerApiClient apiClient = check new ("https://api.example.com");

    // Make remote call to get customer
    pkgB:ExternalCustomer|error existingCustomer = apiClient->getCustomer("CUST001");

    if existingCustomer is pkgB:ExternalCustomer {
        io:println(string `Retrieved customer via remote: ${existingCustomer.fullName}`);
    }

    // Make resource call to get customer
    pkgB:ExternalCustomer|error customerViaResource = apiClient->/customers/["CUST002"];

    if customerViaResource is pkgB:ExternalCustomer {
        io:println(string `Retrieved customer via resource: ${customerViaResource.fullName}`);
    }
}
