import ballerina/data.jsondata;

public type Person record {|
    string name;
    int id;
|};

json data = {"name": "John Doe", "age": 30};

public function main() returns error? {
    do {
        Person|jsondata:Error person1 = jsondata:parseAsType(data, {}, Person);
        Person|jsondata:Error person2 = jsondata:parseAsType(data, {}, Person);
    } on fail error e {

    }
}
