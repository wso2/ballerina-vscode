type ContactDetails_New record {|
    string[] phoneNumbers?;
    string[] addresses?;
|};

type Info_New record {|
    string[] secondaryPhones;
    string[] emails;
    string[][] addresses;
|};

type User_New record {|
    Info_New info;
|};

type Person_New record {|
    ContactDetails_New contactDetails;
|};

public function main() {
    User_New u = {info: {secondaryPhones: [], emails: [], addresses: []}};
    Person_New p = {
                       contactDetails: {
                           phoneNumbers: from var secondaryPhonesItem in u.info.secondaryPhones
                               select secondaryPhonesItem
                       }
                   };
}
