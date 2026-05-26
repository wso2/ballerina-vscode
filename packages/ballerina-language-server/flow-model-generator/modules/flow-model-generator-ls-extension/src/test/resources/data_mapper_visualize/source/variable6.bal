import ballerina/http;

type Coordinates [int];

service on new http:Listener(9090) {

    resource function get location() returns Coordinates|http:NotFound {
        do {

        } on fail error e {
            return http:NOT_FOUND;
        }
    }
}
