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
            UserInfo userInfo = {username: };
            UserInfo userInfo = {username: "UNAME", password: };
            UserInfo userInfo = {username: "UNAME", password: "PASSWORD"};
            UserInfo userInfo = let var x = "UNAME", var y = "PASSWORD" in {username: x, password: y};
            UserInfo userInfo = let var x = "UNAME", var y = "PASSWORD" in {username: x, password: y};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
