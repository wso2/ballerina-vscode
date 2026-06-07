import ballerina/io;

public function logMessage(string msg) {
    io:println("[HELPER] " + msg);
}

public function concat(string a, string b) returns string {
    return a + " " + b;
}
