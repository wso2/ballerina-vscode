import ballerina/module1;

public function testClientCompletion() {
    module1:Client cl = new ("http://localhost:9090");
    cl
}