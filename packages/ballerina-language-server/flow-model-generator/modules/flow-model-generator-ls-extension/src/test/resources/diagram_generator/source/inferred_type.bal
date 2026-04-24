import ballerina/log;
import ballerina/jballerina.java;

public type PhoneNumbers typedesc<string[]>;

public function foo3() returns error? {
    do {
        string[] str = check foo(whereClause = 3);
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}

function foo(PhoneNumbers pn = <>, int whereClause = 4) returns pn|error = @java:Method {
    'class: ""
} external;
