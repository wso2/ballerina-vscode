import ballerina/io;
import wso2/helloproject.hello;

// The `main` function, which acts as the entry point.
public function main() {
    string message = hello:getMessage();
    io:println(message);
}
