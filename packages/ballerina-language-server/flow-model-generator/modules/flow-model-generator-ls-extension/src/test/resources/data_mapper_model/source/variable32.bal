type Person record {
    string id;
    int age;
    xml info1;
};

type Student record {
    int id;
    string age;
};


public function foo() {
    [Student, Person] a = [{id: 0, age: ""}, {id: "1", age: 0, info1: xml `<info>test</info>`}];
    Student student = {};
}
