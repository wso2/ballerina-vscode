isolated service class Student {

    private string firstName;
    private string lastName;

    function init(string firstName, string lastName) {
        self.firstName = firstName;
        self.lastName = lastName;
    }

    isolated resource function get firstName() returns string {
        lock {
	        return self.firstName;
        }
    }

    isolated remote function save() {
    }

    public isolated function getFullName() returns string {
        lock {
            return self.firstName + " " + self.lastName;
        }
    }
}
