public type SampleType record {|
    string sampleTypeName;
    int sampleTypeCode;
|};

public type SampleRecord record {|
    string sampleRecordName;
    SampleType recordType;
|};

public type ProgressNote record {|
    string note;
    SampleRecord sampleRecord;
|};

public type FinalNote record {|
    string finalNote;
    ProgressNote progressNote;
|};
