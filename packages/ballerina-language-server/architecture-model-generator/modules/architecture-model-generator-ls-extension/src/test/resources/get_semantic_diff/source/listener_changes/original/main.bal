import ballerina/http;

listener http:Listener httpListener = new (8080);

service /api on httpListener {
    resource function get greeting() returns string {
        return "Hello";
    }
}
