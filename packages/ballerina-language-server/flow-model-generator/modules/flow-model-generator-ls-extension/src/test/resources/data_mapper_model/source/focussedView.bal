public type Person record {|
    string name;
    int age;
|};

public type Outer record {|
    Person[] people;
|};

function transform(Outer input) returns Outer[] => let Outer subMapping = {} in from var peopleItem in input.people
        select {people: []};
