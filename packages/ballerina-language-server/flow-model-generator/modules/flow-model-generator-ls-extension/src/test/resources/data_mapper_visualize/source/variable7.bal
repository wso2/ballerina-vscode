import ballerina/http;

type Detail record {|
    string id;
    string batchNo;
|};

type Items Detail[];

service on new http:Listener(9090) {

    resource function get location() returns Items|http:NotFound {
        do {

        } on fail error e {
            return http:NOT_FOUND;
        }
    }
}
