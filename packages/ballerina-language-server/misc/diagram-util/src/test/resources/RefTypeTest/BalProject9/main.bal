
type SampleType record {
    string sampleTypeName;
    int sampleTypeCode;
};

type SampleRecord record {
    string sampleRecordName;
    SampleType recordType1;
};

type objectType object {
    string name;
    int age;
    SampleRecord sampleRecord1;
};