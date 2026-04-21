import ballerina/http;

public type PhoneNumbers string[];

service on new http:Listener(9090) {

    resource function get location() returns PhoneNumbers|http:NotFound {
        do {

        } on fail error e {
            return http:NOT_FOUND;
        }
    }
}
