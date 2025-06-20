import ballerina/http;

type User record {
    string[] phoneNumber;
};

type Person record {
    string[] contacts;
};

service / on new http:Listener(9090) {

    function init() returns error? {
    }

    resource function post getPerson(@http:Payload User user) returns Person|http:InternalServerError {
        do {
            User u1 = getUser();
            Person p = {contacts: [u1.phoneNumber[0], u1.phoneNumber[1], u1.phoneNumber[2]]};
        } on fail error e {
            return http:INTERNAL_SERVER_ERROR;
        }
    }
}
