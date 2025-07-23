import ballerina/http;
import ballerinax/redis as red;

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
            red:Options var1 = {};
            red:Options var2 = {};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
