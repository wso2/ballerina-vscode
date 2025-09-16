import ballerina/http;

configurable string dbHost = "localhost";
configurable string password = ?;

type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
|};

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            Student student = {};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
