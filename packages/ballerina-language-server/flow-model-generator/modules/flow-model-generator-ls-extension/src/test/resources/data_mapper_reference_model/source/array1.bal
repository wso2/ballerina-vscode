import ballerina/http;

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


service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            FinalNote[] finalNote = {};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}