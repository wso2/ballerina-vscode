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

type ProgressNoteArray ProgressNote[];

public type FinalNote record {|
    string finalNote;
    SampleRecord sampleRecord;
    ProgressNote[] progressNotes;
|};

public type RecordType record {|
    string name;
    FinalNote[] finalNote;
|};

type unionSymbol SampleType|SampleRecord|ProgressNote|FinalNote|ProgressNote[];

public type unionMemberType record {|
    unionSymbol member;
    FinalNote finalNote;
|};


RecordType {
    name:ProgressNote,
    hashCode: 1234567890,
    type:Record,

    }
}