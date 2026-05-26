import ballerina/http;

type UserInfo record {|
   string username;
   string password;
   Student? student;
|};

type Student record {|
   string username;
   string password;
   string 'record;
   json data;
   any info;
|};

const string CONST = "CONST";
Student myStudent = {};

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            Student? student1 = {};
            Student student2 = {};
            UserInfo userInfo = {};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
