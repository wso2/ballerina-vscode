import ballerina/data.jsondata;

public type Person record {|
    int age;
    string name;
|};

public type Skills string[];

public type Address record {|
    string street;
    string city;
    string zipCode;
|};

public type Transform record {|
    string name;
    int age;
    string email;
    boolean isSubscribed;
    Skills skills;
    Address address;
|};

public type Skills_01 string[];

public type Address_01 record {|
    string street;
    string city;
    string zipCode;
|};

public type Transform1 record {|
    string name;
    int age;
    string email;
    boolean isSubscribed;
    Skills_01 skills;
    Address_01 address;
|};


function transform(Person person) returns json|error => let Transform1 transform = let Person subMapping = {} in {} in check jsondata:toJson(transform);
