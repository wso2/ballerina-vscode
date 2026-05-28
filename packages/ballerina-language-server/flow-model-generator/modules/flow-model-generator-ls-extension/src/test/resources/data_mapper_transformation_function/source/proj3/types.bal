
type Address record {|
    string street;
    string city;
    string state;
    int postalCode;
|};

type PhoneNumbers string[];

type User record {|
    string firstName;
    string lastName;
    string email;
    Address address;
    PhoneNumbers phoneNumbers;
|};

type Account record {|
    string accountNumber;
    int balance;
    string lastTransaction;
|};

type Input record {|
    User user;
    Account account;
|};

type ContactDetails record {|
    string email;
    string primaryPhone;
|};

type Location record {|
    string city;
    string state;
    string zipCode;
|};

type AccountInfo record {|
    string accountNumber;
    int balance;
|};

type Output record {|
    string fullName;
    ContactDetails contactDetails;
    Location location;
    AccountInfo accountInfo;
    string transactionDate;
|};
