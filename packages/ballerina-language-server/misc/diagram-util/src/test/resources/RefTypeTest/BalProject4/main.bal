map<int> sampleMap = {};
map<SampleType> sampleTypeMap = {};

public type SampleType record {|
    string sampleTypeName;
    int sampleTypeCode;
|};


public type SampleRecord record {|
    string sampleRecordName;
    SampleType recordType1;
    map<SampleType> sampleTypeMap;
|};

