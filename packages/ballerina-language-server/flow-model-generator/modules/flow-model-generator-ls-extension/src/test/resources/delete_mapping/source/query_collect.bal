import ballerina/log;

public function main() returns error? {
    do {
        int[] input2 = [];
        InArrType output = {
            p2: from var input2Item in input2
                collect sum(input2Item)
        };
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}

// Types
type InArrType record {|
    string p1?;
    int p2;
    int p3?;
|};
