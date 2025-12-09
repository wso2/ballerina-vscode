import ballerina/http;

type Coordinates [int, int];

type PersonInfo [string, int, string];

type Employee record {|
    string name;
    int age;
|};

service on new http:Listener(9090) {

    resource function get location() returns Coordinates|http:NotFound {
        do {

        } on fail error e {
            return http:NOT_FOUND;
        }
    }
}
