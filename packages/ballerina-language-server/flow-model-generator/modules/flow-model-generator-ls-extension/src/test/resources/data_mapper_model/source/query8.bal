type MyType record {|
    string name1;
    int i;
|};

type XXX record {|
    MyType[] names;
|};

public function main() {
    MyType[] myType2 = [{i: 0, name1: ""}, {i: 0, name1: ""}];
    MyType[] myTypes2 = from var x in myType2 select x;
}