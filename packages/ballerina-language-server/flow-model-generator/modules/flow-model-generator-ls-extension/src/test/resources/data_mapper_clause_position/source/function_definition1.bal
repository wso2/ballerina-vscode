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

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            UserInfo userInfo = {};
            UserInfo userInfo1 = {username: "Alex"};
            UserInfo userInfo2 = {username: };
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}

function transform(UserInfo userInfo) returns UserInfo[] => from var item in [userInfo]
    let var x = 2
    select {username: item.username, password: item.password + CONST};
