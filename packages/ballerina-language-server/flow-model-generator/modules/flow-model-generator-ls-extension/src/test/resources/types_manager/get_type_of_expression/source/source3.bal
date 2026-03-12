import ballerina/data.jsondata;
import ballerinax/redis;

public type Person record {|
    string name;
    int id;
|};

json data = {"name": "John Doe", "age": 30};

public function main() returns error? {
    do {
        Person|jsondata:Error person1 = jsondata:parseAsType(data, {}, Person);
        redis:Options|jsondata:Error person2 = jsondata:parseAsType(data, {}, Person);
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}
