function transform(InRoot[] input) returns OutRoot[] => let InArrType subMapping = {} in from var inputItem in input
        select {
            oArr1D: from var iArr1DItem in inputItem.iArr1D
                select {p1: 0, p2: ""}
        };


type InRoot record {|
    InArrType[] iArr1D;
    string p1;
    int p2;
|};

type InArrType record {|
    string p1;
    int p2;
    int p3;
|};

type OutRoot record {|
    OutArrType[] oArr1D;
|};

type OutArrType record {|
    int p1;
    string p2;
|};
