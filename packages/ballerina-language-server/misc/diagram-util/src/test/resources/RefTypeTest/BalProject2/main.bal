public type SampleType record {|
    string sampleTypeName;
    int sampleTypeCode;
|};

public type SampleRecord record {|
    string sampleRecordName;
    SampleType recordType1;
|};

public type ProgressNote record {|
    string note;
    SampleRecord sampleRecord1;
|};

ProgressNote[] progressNotes = [];

public type FinalNote record {|
    string finalNote;
    SampleRecord sampleRecord;
    ProgressNote[] progressNotes;
|};

type unionSymbol SampleType|SampleRecord|ProgressNote|FinalNote|ProgressNote[];

public type unionMemberType record {|
    unionSymbol member;
    FinalNote finalNote;
|};