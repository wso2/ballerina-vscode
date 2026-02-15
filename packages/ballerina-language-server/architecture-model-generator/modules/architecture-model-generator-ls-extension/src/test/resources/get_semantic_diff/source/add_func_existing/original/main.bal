import ballerina/http;

listener http:Listener httpListener = check new (8080);

service / on httpListener {
    resource function get .() returns string {
        return "Hello, World!";
    }
}
