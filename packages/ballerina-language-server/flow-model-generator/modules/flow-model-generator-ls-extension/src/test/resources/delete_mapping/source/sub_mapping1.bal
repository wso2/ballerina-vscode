import ballerina/log;

type Detail record {|
    string id;
    string batchNo;
|};

type Items Detail[];

public function main() returns error? {
    do {
        Items var1 = [];
        Detail detail = let Input1 input1 = {age: 0} in input1;
        Items var2 = var1;
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}
