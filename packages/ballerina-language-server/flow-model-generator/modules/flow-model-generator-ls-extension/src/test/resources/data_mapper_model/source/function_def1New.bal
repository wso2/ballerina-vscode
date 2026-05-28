type Input record {|
    User_New user?;
|};

type User_New record {|
    string firstName;
|};

type Output record {|
    string fullName?;
|};

public function main() {
    Input input = {};
    Output output = {fullName: input?.user?.firstName};
}

function transform(Input input) returns Output => {
    fullName: input?.user?.firstName
};

function transform1(Input input) returns Output[] => [{
    fullName: input?.user?.firstName
}];

function transform2(Input[] inputs) returns Output[] => from var input in inputs select {
    fullName: input?.user?.firstName
};
