type User record {|
    string code;
    string number;
|};

type SecondaryPhones record {|
    string code;
    string number;
|};

function transform(User u) returns SecondaryPhones|error => {
    code: u.code, number: u.number
};
