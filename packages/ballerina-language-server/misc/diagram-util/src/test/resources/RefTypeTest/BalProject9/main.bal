type field1 record {
    string field1;
}

type field2 record {
    string field2;
}

class sampleClass {
    field1 f1;
    field2 f2;
    int field3;
    string field4;

    f1 = { field1: "value1" };
            f2 = { field2: "value2" };
            field3 = 42;
            field4 = "Hello, World!";
        }
}

sampleClass sample = new sampleClass();