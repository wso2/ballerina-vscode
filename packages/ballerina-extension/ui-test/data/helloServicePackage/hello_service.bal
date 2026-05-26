import ballerina/http;
import ballerina/io;

// By default, Ballerina exposes an HTTP service via HTTP/1.1.
service /hello on new http:Listener(9091) {

    // Resource functions are invoked with the HTTP caller and the
    // incoming request as arguments.
    resource function get sayHello(http:Caller caller, http:Request req) returns error? {
        // Send a response back to the caller.
        io:println("request received");
        check caller->respond("Hello, World!");
    }
}
