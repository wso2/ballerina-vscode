import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
|};

const string CONST = "CONST";

function transform() returns Student =>
    let string u1 = "student1", string u2 = "student2", string u3 = "student3" in {username: u, password: "pass123"};