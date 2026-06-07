import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service / on httpDefaultListener {
    resource function post transform(@http:Payload Input input) returns http:InternalServerError|error|Output {
        do {
            Output output = transform(input);
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
