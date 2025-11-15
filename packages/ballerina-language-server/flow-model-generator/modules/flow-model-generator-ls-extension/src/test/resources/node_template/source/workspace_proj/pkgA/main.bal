import ballerina/io;

import wso2/pkgB;

public function main() {
    string greeting = pkgB:greetUser("World");
    io:println(greeting);
}
