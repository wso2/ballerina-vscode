import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service / on httpDefaultListener {
    resource function post users(@http:Payload UsersPayload payload) returns error|json {
        do {
            if payload.role == "admin" {

            }
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

}
