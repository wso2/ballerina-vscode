import ballerina/http;

service /api on new http:Listener(8080) {
    resource function get greeting() returns string {
        return "Hello";
    }
}
