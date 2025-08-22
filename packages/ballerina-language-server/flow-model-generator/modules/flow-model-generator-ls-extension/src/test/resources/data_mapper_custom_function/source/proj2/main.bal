type Input record {|
    string firstName;
    string middleName?;
    string lastName;
    string|int age;
    string salary;
|};

type Output record {|
    string fullName;
    int|string age;
    decimal[] salary;
|};


public function main() {
    Input input = {};
    Output output = {};
}