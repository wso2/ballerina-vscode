type MyType record {|
    string[] k;
|};

type SimpleTypeArr record {|
    string b0;
    MyType m0;
|};

function foo() {
    SimpleTypeArr arr1 = {};
    SimpleTypeArr arr2 = {
        b0: from var kItem in arr1.m0.k
            collect ""
    };
}
