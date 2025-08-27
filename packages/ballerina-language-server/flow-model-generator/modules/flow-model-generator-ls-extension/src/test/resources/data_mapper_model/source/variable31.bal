type MyType record {|
    string[] k;
    MyType2[] l;
    string i;
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

type simpleTypeArr record {|
    int a0;
    int[] a1;
    string b0;
    string[] b1;
    string[][] b2;
    MyType m0;
    MyType[] m1;
    MyType2[][] m2;
|};

function bar() {
    simpleTypeArr arr1 = {};
    simpleTypeArr arr2 = {
            m2: from var m2Item in arr1.m2 // m2: arr2.m2
            select (from var m2ItemItem in m2Item
                select m2ItemItem), // output type: MyType2[]
            a1: [],
            b2: [[]],
            m0: {k: [], l: [], i: ""},
            m1: [],
            b0: "",
            a0: 0,
            b1: []
    };
}
