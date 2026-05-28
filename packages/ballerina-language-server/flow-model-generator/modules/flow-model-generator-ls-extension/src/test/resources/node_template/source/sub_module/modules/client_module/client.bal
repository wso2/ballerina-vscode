import ballerina/http;

public isolated client class CustomClient {
    private final http:Client httpClient;

    public isolated function init(string url) returns error? {
        self.httpClient = check new (url);
    }

    remote function getData(string path) returns string|error {
        json response = check self.httpClient->get(path);
        return response.toString();
    }

    resource function get users/[string userId]() returns json|error {
        return self.httpClient->/users/[userId].get();
    }
}
