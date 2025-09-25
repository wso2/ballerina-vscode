import ballerina/http;
import ballerina/log;

function qwertyuiop2(ArrType1 arr1) returns ArrType1 => arr1;

configurable Bar cv = {};
// define constant

const int a = 1;

type RecType record {|
    int i;
|};

type ArrType1 record {|
    RecType[][][] rec;
|};

public function main() returns error? {
    do {

        ArrType1 arr = {};

        ArrType1 arr1 = {

            rec: from var recItem in arr.rec
                select from var recItemItem in recItem
                    select from var recItemItemItem in recItemItem
                        select {}
        };

    } on fail error e {
        log:printError("Error occurred", 'error = e)
        ;
        return e;
    }


}
