type RecType record {|
    int i;
|};

type ArrType record {|
    RecType[][] rec;
|};

function foo() {
    ArrType arr1 = {};
    ArrType arr2 = {rec: from var recItem in arr1.rec select []};
}