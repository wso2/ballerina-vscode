import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
   int length;
|};

const string CONST = "CONST";

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            UserInfo userInfo = {username: "un", password: "pw"};
            Student student = {username: userInfo.username, password: userInfo.password + userInfo.username, length: userInfo.password.length() + userInfo.username.length() + 5};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
