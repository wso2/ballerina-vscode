import ff.testDB;

import ballerina/log;
import ballerina/persist;
import ballerina/sql;

public function main() returns error? {
    do {
        Person[] var1 = check testDB->/users.get();
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}

