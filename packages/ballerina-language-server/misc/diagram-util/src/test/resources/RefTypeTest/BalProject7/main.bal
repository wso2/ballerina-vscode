public type Person record {|
    string name;
    int age;
|};

public type SimpleStream stream<string, error>;

public type ComplexStream stream<Person>;

public type RecordWithStream record {|
    string id;
    SimpleStream data;
|};
