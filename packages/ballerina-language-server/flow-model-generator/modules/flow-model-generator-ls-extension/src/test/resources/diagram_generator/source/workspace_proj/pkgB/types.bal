public type Customer record {|
    string id;
    string name;
    string email;
    string phoneNumber;
    string address;
|};

// Public record for external API customer format
public type ExternalCustomer record {|
    string customerId;
    string fullName;
    string contactEmail;
|};
