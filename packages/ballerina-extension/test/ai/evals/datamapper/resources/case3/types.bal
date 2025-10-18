type Address record {
    string street;
    string city;
    string zipCode;
};

type Contact record {
    string email;
    string phone;
};

type Customer record {
    string customerId;
    string name;
    Address address;
    Contact contact;
};

type CustomerInfo record {
    string id;
    string customerName;
    string location;
    string emailAddress;
};
