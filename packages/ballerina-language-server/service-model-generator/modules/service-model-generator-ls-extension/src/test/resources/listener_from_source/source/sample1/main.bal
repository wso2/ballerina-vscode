import ballerina/http;

listener http:Listener listener1 = new (port = 9090);
listener http:Listener listener2 = new (9090);
listener http:Listener listener3 = new (9090, {});
listener http:Listener listener4 = new (port = 9090, socketConfig = {}, server = "0.0.0.0");

service / on new http:Listener(9090) {
    resource function get hello1() returns string {
        return "Hello from listener1";
    }
}
