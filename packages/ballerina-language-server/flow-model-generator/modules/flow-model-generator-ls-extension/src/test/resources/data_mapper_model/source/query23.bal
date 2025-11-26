type Elephant record {
    string name;
    int age;
    string cast;
};

type Names record {|
    string name;
|};

public function main() {
    Elephant[][] AAA = [[{name: "Dumbo1", age: 10, cast: ""}, {name: "Dumbo2", age: 10, cast: ""}, {name: "Dumbo3", age: 10, cast: ""}],
                        [{name: "Dumbo4", age: 10, cast: ""}, {name: "Dumbo5", age: 10, cast: ""}]];
    Elephant[] BBB = [{cast: "", name: "", age: 0}, {cast: "", name: "", age: 0}];

    Names[] names = from Elephant[] aaa in AAA
                    from Elephant bbb in aaa
                    select {name: bbb.name};

    Elephant[] CCC = [{cast: "", name: "", age: 0}, {cast: "", name: "", age: 0}];

    Names[] newNames = from Elephant bbb in BBB
                        from Elephant ccc in CCC
                        select {name: bbb.name + ccc.name};
}
