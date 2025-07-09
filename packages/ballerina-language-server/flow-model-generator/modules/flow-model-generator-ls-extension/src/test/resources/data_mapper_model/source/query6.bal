import ballerina/log;

type MyType record {|
    int[] k;
    MyType2[] l;
|};

type MyType2 record {|
    record {|
        int p;
        record {|
            int r;
        |} q;
    |}[] arr;
    record {|
        record {|
            int Ccc;
        |} Bb;
    |} Aa;
|};

type MyType3 record {|
    int p;
    MyType2 q;
|};

type MyType4 record {
    record {
        record {
            int l3;
            record {
                int l4_1;
                string l4_2;
            }[] l3Arr;
        }[] l2;
    } l1;
};

public function main() returns error? {
    do {
        MyType4 var1 = {
            l1: {
                l2: [
                    {
                        l3: 0,
                        l3Arr: []
                    }
                ]
            }
        };
        MyType4 var2 = {
            l1: {
                l2: from var l2Item in var1.l1.l2
                    select {
                        l3: 0,
                        l3Arr: from var l3ArrItem in l2Item.l3Arr
                            select {l4_1: 0, l4_2: "aaa"}
                    }
            }
        };

    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}