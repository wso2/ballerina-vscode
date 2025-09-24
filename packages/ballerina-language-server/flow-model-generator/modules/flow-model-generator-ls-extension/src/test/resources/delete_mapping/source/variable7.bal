import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service / on httpDefaultListener {
    resource function post transform(@http:Payload Input input) returns Output|http:InternalServerError|error {
        do {
            Output output = let Address[] subMapping = from var addressItem in input.user.address
                    select {street: "", city: "", state: "", postalCode: 0}
                in {
                    location: from var subMappingItem in subMapping
                        select {state: "", zipCode: ""}
                };
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}

// ##### type #####

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
    Address[] address;
    PhoneNumbers[] phoneNumbers;
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
    ContactDetails[] contactDetails;
    Location[] location;
    AccountInfo accountInfo;
    string transactionDate;
|};
