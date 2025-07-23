import ballerina/http;

type UserInfo record {|
   string username;
   string password;
|};

type Student record {|
   string username;
   string password;
|};

type Students record {|
   string school;
   Student[] students;
|};

const string CONST = "CONST";

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            UserInfo[] userInfo = [{username: "un", password: "pw"}];
            Student student = let Students s = {school: "school", students: from var user in userInfo select {username: user.username, password: user.password}}, int x = 2 in {username: userInfo.username};
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
