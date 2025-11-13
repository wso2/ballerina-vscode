type Person record {
    string name;
    int age;
};

type SimpleStream stream<string>;

type ComplexStream stream<Person, error>;

type NestedStream stream<ComplexStream>;

type RecordWithStream record {
    string id;
    NestedStream data;
};

function fn1() {
    SimpleStream simple = new;

    ComplexStream complex = new;

    NestedStream nested = new;

    RecordWithStream result = {
        id: "001",
        data: nested
    };
}
