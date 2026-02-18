# User record type
# Simple record type with docs, anonymous field types (union, record)
type User record {
    # Name of the employee
    string name;
    # Age of the employee
    int age;
    # Union of type-refs and a built-in type
    xml|City|UserAddress address;
    # Anonymous nested record type
    record {|int iA; record {|int iiA;|} iB;|} field1;
};

type Employee record {|
    string name;
    int id;
|};
