type ContactDetails record {|
    SecondaryPhonesX[] phoneNumbers?;
    string[] addresses?;
|};

type SecondaryPhonesList SecondaryPhones[];

type Info record {|
    SecondaryPhonesList secondaryPhones;
    string[] emails;
    string[][] addresses;
|};

type SecondaryPhones record {|
    string code;
    string number;
|};

type User record {|
    Info info;
|};

type Person record {|
    ContactDetails contactDetails;
|};

type SecondaryPhonesX record {|
    string code;
    string number;
|};

function transform(User u) returns ContactDetails => {
    phoneNumbers: from var secondaryPhonesItem in u.info.secondaryPhones
        select {number: secondaryPhonesItem.number}
};
