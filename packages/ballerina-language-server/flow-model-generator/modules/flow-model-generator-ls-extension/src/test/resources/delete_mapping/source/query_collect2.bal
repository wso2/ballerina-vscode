import ballerina/io;
import ballerina/log;

public function main() returns error? {
    do {
        int[] input2 = [1, 2, 3];
        InArrType output = {
            p2: from var input2Item in input2
                let var temp = input2Item * 2
                collect sum(temp),
            p1: "Example",
            p3: 10
        };
        io:println(output);
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}

// Types
type InArrType record {|
    string p1?;
    int p2;
    int p3;
|};
