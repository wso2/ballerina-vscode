type Input record {|
    User user?;
|};

type User record {|
    string firstName;
|};

type Output record {|
    string fullName?;
|};

function transform(Input input) returns User => { // Output is changed to User
    fullName: input?.user?.firstName
};

