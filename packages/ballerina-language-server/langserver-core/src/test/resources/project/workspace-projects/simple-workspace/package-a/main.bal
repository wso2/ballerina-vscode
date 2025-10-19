import ballerina/io;

public function main() {
    io:println("Package A - Main");
    string result = getGreeting();
    io:println(result);
}

public function getGreeting() returns string {
    return "Hello from Package A";
}
