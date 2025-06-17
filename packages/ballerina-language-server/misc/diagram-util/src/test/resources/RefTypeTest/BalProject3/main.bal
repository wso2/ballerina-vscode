enum Colors {
    RED = "red",
    GREEN = "green",
    BLUE = "blue"
}

public type SampleType record {|
    string sampleTypeName;
    int sampleTypeCode;
    Colors color;
|};

Colors color = RED;

public type SampleRecord record {|
    string sampleRecordName;
    SampleType recordType1;
    Colors color;
|};

