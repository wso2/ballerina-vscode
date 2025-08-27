type MyType record {|
    string name1;
    int i;
|};

type XXX record {|
    MyType[] names;
|};

public function main() {
    MyType[] myTypes1 = [{i: 0, name1: ""}, {i: 0, name1: ""}];
    MyType[] myTypes2 = from var x in myTypes1 select x;
    // MyTypes myTypes2 = {xxx: from var x in myTypes1 select x;}
    MyType[][] myTypes3 = [];
    MyType[][] myTypes4 = from var myType3 in myTypes3 select (from var y in myType3 select y);
}