public type Person record {
    string name;
    int age;
    string email;
};

public type Employee record {
    string name;
    int age;
    string department?;
    decimal salary?;
};

public type Address record {
    string street;
    string city;
    string country;
};

public type Company record {
    string name;
    Address headquarters;
    Employee[] employees;
};
