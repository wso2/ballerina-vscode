import ballerina/http;

type Credentials record {|
    string username;
    string password;
|};

type UserInfo record {|
    string username;
    string password;
    int id;
|};

type Bank record {|
    string name;
    UserInfo[] userInfo;
|};

type Store record {|
    string name;
    Credentials[] credentials;
|};

type MyType record {|
    string[] k;
    MyType2[] l;
    string i;
|};

type MyType2 record {|
    record {|
        int p;
        record {|
            int r;
        |} q;
    |}[] arr;
    record {|
        record {|
            int Ccc;
        |} Bb;
    |} Aa;
|};

const string CONST = "CONST";

service OASServiceType on new http:Listener(9090) {

	resource function get pet() returns int|http:NotFound {
        do {
            MyType v1 = {

                    };

            MyType v3 = {
                        k: []
                    };
		} on fail error e {
			return http:NOT_FOUND;
		}
	}
}
