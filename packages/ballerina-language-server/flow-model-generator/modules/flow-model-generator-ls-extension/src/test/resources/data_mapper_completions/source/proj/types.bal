import ballerina/http;


type Person record {
    string id;
    string firstName;
    string lastName;
    int age;
    string country;
    Contact[] registry;
};

type Course record {
    string id;
    string name;
    int credits;
};

type Student record {
    string id;
    string fullName;
    string age;
    record {
        string title;
        int credits;
    }[] courses;
    int totalCredits;
    string visaType;
    string contactPhone;
};

type Contact record {
    string mediumType;
    string phoneNumber;
};

type Persons record {
    Person[] persons;
};
