import ballerina/io;

public type Person record {
    string name;
    int age;
    Address address;
};

public type SequenceGroup record {|
    @xmldata:SequenceOrder {value: 1}
    string name;
    @xmldata:SequenceOrder {value: 2}
    int age;
|};

public function main() {
    io:println("Sample Ballerina project");
}
