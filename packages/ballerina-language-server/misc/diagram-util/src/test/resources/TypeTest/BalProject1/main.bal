public type RecordType1 record {
    int i1;
    string s1;
};

public type RecordType2 record {
    int i2;
    string s2;
};

public type RecordType3 record {
    int i3;
    string s3;
    UnionType[] unionList3;
};

public type UnionType RecordType1|RecordType2;

public type FinalRecordType record {
    UnionType[] unionList;
    RecordType3 record3;
};