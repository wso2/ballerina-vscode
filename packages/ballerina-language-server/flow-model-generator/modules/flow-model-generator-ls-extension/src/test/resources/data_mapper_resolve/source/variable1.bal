import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Credentials record {|
   string username;
   string password;
   string field1;
   string field2;
   string field3;
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
            Student student = {yyy: {username: xxx.username}};
            Student student1 = {credentials: {username: xxx.username}};
            Student student2 = {credentials: {username: xxx.username, password: userInfo.password, field1: userInfo.username}};
            Student student3 = {credentials: {username: userInfo.username, password: xxx.password, field1: userInfo.username}};
            Student student4 = {credentials: {username: userInfo.username, password: userInfo.password, field1: xxx.username}};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
