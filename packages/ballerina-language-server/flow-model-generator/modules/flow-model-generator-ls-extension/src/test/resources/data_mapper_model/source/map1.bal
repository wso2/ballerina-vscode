type Person record {
    string name;
    int age;
};

type SimpleMap map<string>;

type ComplexMap map<Person>;

type NestedMap map<ComplexMap>;

type RecordWithMap record {
    string id;
    NestedMap data;
};

function fn1() {
    SimpleMap simple = {
        "key1": "value1",
        "key2": "value2"
    };

    ComplexMap complex = {
        "person1": { name: "Alice", age: 30 },
        "person2": { name: "Bob", age: 25 }
    };

    NestedMap nested = {
        "group1": {
            "personA": { name: "Charlie", age: 28 },
            "personB": { name: "Diana", age: 32 }
        },
        "group2": {
            "personC": { name: "Eve", age: 22 }
        }
    };

    RecordWithMap result = {
        id: "001",
        data: nested
    };
}
