type Person record {
    string 'field;
    string field1;
    NestedField field2?;
};

type NestedField record {
    string field1;
    string field2;
};

type Record record {
    string field1;
    string field2;
};
