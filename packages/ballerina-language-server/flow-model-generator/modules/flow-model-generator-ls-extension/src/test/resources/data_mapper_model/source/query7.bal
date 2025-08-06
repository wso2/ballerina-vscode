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

public function main() {
    User u = {info: {secondaryPhones: [], emails: [], addresses: []}};
    ContactDetails p = {
                           phoneNumbers: from var secondaryPhonesItem in u.info.secondaryPhones
                               select {code: secondaryPhonesItem.code, number: secondaryPhonesItem.number}
                   };
}