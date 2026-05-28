import ballerina/io;

public function main() {
    // Intentional error: undefined variable
    io:println(undefinedVariable);

    // Intentional error: type mismatch
    int x = "not a number";
}
