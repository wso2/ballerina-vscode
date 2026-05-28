import ballerina/http;

type Credentials record {|
    string username;
    string password;
|};

type UserInfo record {|
    string username;
    string password;
    int id;
    Credentials[] credentials;
|};

type Bank record {|
    string name;
    UserInfo[] userInfo;
|};

type Store record {|
    string name;
    Bank[] banks;
|};

const string CONST = "CONST";

service / on new http:Listener(9090) {

    resource function get pet() returns int|http:NotFound {
        do {
            Credentials[] credentials = [
                {username: "cred1", password: "credPass1"},
                {username: "cred2", password: "credPass2"}
            ];
            Store stores = {
                name: "MyStore",
                banks: [
                    {
                        name: "Bank1",
                        userInfo: [
                            {username: "user1", password: "pass1", id: 1, credentials: from var cred in credentials
                                    select {username: cred.username}},
                            {username: "user2", password: "pass2", id: 2, credentials: [{username: "cred2", password: "credPass2"}]}
                        ]
                    },
                    {
                        name: "Bank2",
                        userInfo: [
                            {username: "user3", password: "pass3", id: 3, credentials: [{username: "cred3", password: "credPass3"}]}
                        ]
                    }
                ]
            };
        } on fail error e {
            return http:NOT_FOUND;
        }
    }
}
