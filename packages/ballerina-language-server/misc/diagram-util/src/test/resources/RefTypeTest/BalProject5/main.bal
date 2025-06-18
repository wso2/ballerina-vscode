public type SampleType record {|
    string sampleTypeName;
    int sampleTypeCode;
|};

public type SampleRecord record {|
    string sampleRecordName;
    SampleType recordType1;
|};

table<SampleRecord> sampleRecords = table [
    { sampleRecordName: "Sample Record 1", recordType1: { sampleTypeName: "Type A", sampleTypeCode: 101 } },
    { sampleRecordName: "Sample Record 2", recordType1: { sampleTypeName: "Type B", sampleTypeCode: 102 } }
];

public type ProgressNote record {|
    string note;
    SampleRecord sampleRecord1;
    table<SampleRecord> sampleRecords;
|};

