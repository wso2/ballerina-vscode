import ballerina/log;

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

        MyType4 v1 = {
            l1: {
                l2: [
                    {
                        l3: 10,
                        l3Arr: [
                            {
                                l4_1: 20,
                                l4_2: "example"
                            }
                        ]
                    }
                ]
            }
        };

        MyType4 v2 = {
            l1: {l2: from var l2Item in v1.l1.l2
                    select {l3: 0, l3Arr: []}}
        };

    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}