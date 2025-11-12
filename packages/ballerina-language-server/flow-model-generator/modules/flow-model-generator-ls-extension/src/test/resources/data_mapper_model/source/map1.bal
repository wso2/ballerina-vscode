type Person record {
    string name;
    int age;
};

type SimpleMap map<string>;

type ComplexMap map<Person>;

type RecordWithMap record {
    string id;
    ComplexMap data;
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

    RecordWithMap result = {
        id: "001",
        data: complex
    };
}
