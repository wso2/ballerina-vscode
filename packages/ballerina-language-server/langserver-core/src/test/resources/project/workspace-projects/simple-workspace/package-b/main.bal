import ballerina/io;
import lstest/package_a;

public function main() {
    io:println("Package B - Main");
    string greeting = package_a:getGreeting();
    io:println(greeting);
}

public function processData(string data) returns string {
    return "Processed: " + data;
}
