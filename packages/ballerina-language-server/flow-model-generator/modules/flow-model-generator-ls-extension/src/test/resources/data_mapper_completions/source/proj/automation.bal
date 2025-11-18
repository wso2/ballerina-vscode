import ballerina/log;

public function main() returns error? {
    do {
        Student[] students = [];
        Person[] persons = from var studentsItem in students
            select {id: studentsItem.totalCredits, firstName: "", lastName: "", age: 0, country: "", registry: []};
        Persons personsRecord = {persons: from var studentsItem in students
            select {id: studentsItem.totalCredits, firstName: "", lastName: "", age: 0, country: "", registry: []};
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}
