type ContactDetails record {|
    SecondaryPhonesX[] phoneNumbers?;
    string[] addresses?;
|};

type Info record {|
    SecondaryPhones[] secondaryPhones;
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
    string email;
|};

public function main() {
    User u = {info: {secondaryPhones: [], emails: [], addresses: []}};
    Person p = {
                       contactDetails: {
                           phoneNumbers: from var secondaryPhonesItem in u.info.secondaryPhones
                from var email in u.info.emails
                  where secondaryPhonesItem.code == "123"
                            select {code: secondaryPhonesItem.code, number: secondaryPhonesItem.number, email: email}
                       }
                   };
}
