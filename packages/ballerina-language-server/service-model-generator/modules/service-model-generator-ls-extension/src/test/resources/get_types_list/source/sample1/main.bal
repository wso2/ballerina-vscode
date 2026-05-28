public type Json202Accepted record {|
    *http:Accepted;
    json body;
|};

public type STRING string;

public type Person record {|
    string name;
    int age;
|};
