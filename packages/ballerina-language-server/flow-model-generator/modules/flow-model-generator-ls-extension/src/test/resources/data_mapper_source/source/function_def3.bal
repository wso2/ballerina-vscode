type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
|};

function transform3(json user, json student) returns json|error =>
    let UserInfo userConverted = check user.ensureType(),
    Student transform3 = {username: userConverted.username} in transform3;
