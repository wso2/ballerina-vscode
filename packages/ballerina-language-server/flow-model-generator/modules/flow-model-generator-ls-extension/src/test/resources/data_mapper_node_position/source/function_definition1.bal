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

function transform(UserInfo userInfo) returns UserInfo => {
    username: "UNAME",
    password:
};
