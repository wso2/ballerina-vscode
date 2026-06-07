import ballerina/http;

type UserInfo record {|
   string username;
   string password;
   int id;
|};

type Student record {|
   string username;
   string password;
   int id;
|};

const string CONST = "CONST";

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            int x = 20;
            int y = 30;
            UserInfo userInfo = {username: "un", password: "pw", id: 23};
            Student student = {username: userInfo.username, id: (x + y) * (userInfo.id + 100)};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
