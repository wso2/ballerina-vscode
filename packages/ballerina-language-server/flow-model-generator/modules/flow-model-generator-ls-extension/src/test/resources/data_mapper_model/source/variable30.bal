type MyType record {|
    string[] k;
    string i;
|};

public function main() returns error? {
    MyType v1 = {};
    MyType v2 = {
        i: from var kItem in v1.k
            collect 'join(",", kItem),
            k: from var kItem in v1.k select kItem
    };
}
