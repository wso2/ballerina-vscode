import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string[] username;
   UserInfo|string[] password;
|};

const string CONST = "CONST";
Student myStudent = {};

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            Student student1 = {username: ["A", "B", "C"], password: ["A", "B", "C"]};
            Student student2 = {username: [...student1.username], password: ["A", "B", "C"]};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
