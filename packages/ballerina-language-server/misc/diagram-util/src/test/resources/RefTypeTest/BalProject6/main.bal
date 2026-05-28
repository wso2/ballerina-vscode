public type Person record {|
    string name;
    int age;
|};

public type SimpleMap map<string>;

public type ComplexMap map<Person>;

public type RecordWithMap record {|
    string id;
    SimpleMap data;
|};
