import ballerina/log;

public function main() returns error? {
    do {

    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}

function foo(string[] args) returns error? {
    do {
        // Some code that may throw an error
    } on fail error e {
        log:printError("Error in foo function", 'error = e);
        return e;
    }
}

