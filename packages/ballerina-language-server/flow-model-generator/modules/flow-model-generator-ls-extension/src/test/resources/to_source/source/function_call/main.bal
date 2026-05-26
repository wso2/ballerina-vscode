import ballerina/lang.array;
import ballerina/log;

public type CSV record {
    string name;
    int age;
};

public function main() returns error? {
    do {
        CSV[] records = [
            {name: "Alice", age: 30},
            {name: "Bob", age: 25},
            {name: "Charlie", age: 35}
        ];

    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}
