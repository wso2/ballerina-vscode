import ballerina/http;

listener http:Listener httpListener = check new (8080);

service / on httpListener {
    resource function get .() returns string {
        return "Hello, World!";
    }

    resource function get echo(string message) returns string {
        return message;
    }
}
