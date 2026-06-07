import ballerina/log;

public function main() returns error? {
    do {
        string[] var1;
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}
