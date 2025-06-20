type Address record {
    string street;
    string city;
    string country;
    int zip?;
};

type ContactInfo record {
    string email;
    string phone?;
    Address address;
};

enum Status {
    ACTIVE,
    INACTIVE,
    PENDING
}

type Employee record {
    string id;
    string name;
    (int|string) ageOrBirthYear;
    ContactInfo contact;
    Status status;
    map<json> metadata;
    Address[] previousAddresses;
    table<record {string project; int year;}> key(project);
    (Address|ContactInfo)[] contactsOrAddresses;
    (Address & readonly) homeAddress;
    Employee? manager;
    (string|int|float|boolean|Address|ContactInfo|Status|table<record {string project; int year;}> key(project))[] everything;
};

type Company record {
    string name;
    Employee[] employees;
    map<Employee> employeeMap;
    table<Employee> key(id);
    record {string name; int foundedYear;}[] history;
    (Employee|Company)[] partners;
    (Employee & readonly) ceo;
    Status companyStatus;
};