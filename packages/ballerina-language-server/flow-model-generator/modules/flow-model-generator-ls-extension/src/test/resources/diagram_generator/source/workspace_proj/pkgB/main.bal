import ballerina/http;

public client class CustomerApiClient {
    private final http:Client httpClient;

    public function init(string serviceUrl) returns error? {
        self.httpClient = check new (serviceUrl);
    }

    remote function getCustomer(string id) returns ExternalCustomer|error {
        return self.httpClient->get("/customers/" + id);
    }

    remote function createCustomer(ExternalCustomer customer) returns string|error {
        http:Response response = check self.httpClient->post("/customers", customer);
        return response.getTextPayload();
    }

    resource function get customers/[string id]() returns ExternalCustomer|error {
        return self->getCustomer(id);
    }
}
