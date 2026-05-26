type Input record {|
    User user?;
|};

type User record {|
    string firstName;
|};

type Output record {|
    string fullName?;
|};

public function main() {
    Input input = {};
    Output output = {fullName: input?.user?.firstName};
}
