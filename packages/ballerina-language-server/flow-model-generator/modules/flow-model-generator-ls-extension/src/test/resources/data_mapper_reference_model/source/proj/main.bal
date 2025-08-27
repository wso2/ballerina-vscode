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
            UserInfo user = {username: "user1", password: "pass1"};
            Student student = {username: bar(user.username, user.password)};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
