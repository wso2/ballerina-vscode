import ballerina/log;

public function main() returns error? {
    do {
        Student[] students = [];
        Person[] persons1 = from var studentsItem in students
            select {id: studentsItem.totalCredits, firstName: "", lastName: "", age: 0, country: "", registry: []};
        Person[] persons2 = from var studentsItem in students
                    let var x = 2
                    select {id: studentsItem.totalCredits, firstName: "", lastName: "", age: 0, country: "", registry: []};
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}

// ##### type #####

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
