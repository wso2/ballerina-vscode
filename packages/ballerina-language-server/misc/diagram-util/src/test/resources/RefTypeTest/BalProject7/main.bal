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

enum Color {
    RED,
    GREEN,
    BLUE
}

public type Person2 record {
    string name;
    int age;
    Color favoriteColor;
};
