import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
   string 'record;
|};

type ReadOnlyUserInfo UserInfo & readonly;

const string CONST = "CONST";
Student myStudent = {};

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            ReadOnlyUserInfo user = {username: "user1", password: "pass1"};
            Student student = {};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
