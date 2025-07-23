import ballerina/http;

type Person record {|
    int age;
|};

type Students record {|
    string[][] names;
|};

service / on new http:Listener(9090) {

    function init() returns error? {
    }

    resource function post getPerson(@http:Payload User user) returns Person|http:InternalServerError {
        do {
            int intResult = 1;
            Students students = {names:[["1", "6"], ["10", "60"], ["10", "60", "70"]]};
        } on fail error e {
            return http:INTERNAL_SERVER_ERROR;
        }
    }
}
