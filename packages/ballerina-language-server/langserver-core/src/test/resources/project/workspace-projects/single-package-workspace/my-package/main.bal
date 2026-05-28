import ballerina/io;

public function main() {
    io:println("Single package workspace");
}

public function add(int a, int b) returns int {
    return a + b;
}
