import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Credentials record {|
   string username;
   string password;
|};

type Student record {|
    int id;
    Credentials credentials;
|};

const string CONST = "CONST";

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            UserInfo userInfo = {username: "un", password: "pw"};
            Credentials[] credentials = from var item in userInfo select {username:item.username};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
