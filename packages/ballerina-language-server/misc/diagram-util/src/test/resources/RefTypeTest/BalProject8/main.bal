import ballerina/io;

type SampleType record {|
    string field1;
    string field2;
|};

type SampleRecord record {|
    string name;
    SampleType sampleType;
|};


// Defines a class called `EvenNumberGenerator`, which implements the `next()` method.
// This will be invoked when the `next()` method of the stream gets invoked.
class EvenNumberGenerator {
    int i = 0;
    public isolated function next() returns record {|int value;|}|error? {
        self.i += 2;
        return {value: self.i};
    }
}

EvenNumberGenerator evenGen = new ();

// Creates a `stream` passing an `EvenNumberGenerator` object to the `stream` constructor.
stream<SampleRecord, error?> evenNumberStream = new (evenGen);


public function main() {


    var evenNumber = evenNumberStream.next();

    if (evenNumber !is error?) {
        io:println("Retrieved even number: ", evenNumber.value);
    }
}
