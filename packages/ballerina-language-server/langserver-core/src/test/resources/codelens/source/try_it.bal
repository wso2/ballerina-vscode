import ballerina/module1;

listener module1:Listener helloListener = new(9090);

service / on helloListener {
    resource function get name() returns string {
        return "Hello, World!";
    }
}

service /api/path on new module1:Listener(9091) {
    resource function get greeting() returns string {
        return "Hello from API!";
    }
}
