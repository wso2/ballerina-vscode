type Location record {|
    string city;
    string country;
|};

type Address record {|
    string houseNo;
    string line1;
    string line2;
    string city;
    string country;
|};

type Employee record {|
    string name;
    string empId;
    string email;
    Location location;
|};

type Person record {|
    string name;
    string email;
    Address address;
|};

type Admission record {
    string empId;
    string admissionDate;
};

type Persons Person[];

enum Status {
    ACTIVE,
    INACTIVE,
    PENDING
}

type Department "Engineering"|"Sales"|"HR"|"Marketing";

type Priority 1|2|3|4|5;

type MixedValue string|int|boolean|decimal;
