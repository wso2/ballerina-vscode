import ballerina/io;

// The `main` function, which acts as the entry point.
public function main() {
    io:println(getMessage());
}

# Returns a message
#
# + return - 'Hello World' value
public function getMessage() returns string {
    return "Hello, World!";
}
