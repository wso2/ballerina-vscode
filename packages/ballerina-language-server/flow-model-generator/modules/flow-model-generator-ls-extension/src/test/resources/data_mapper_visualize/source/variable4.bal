import ballerina/http;

type SimpleMap map<string>;

type ComplexMap map<int>;

type Employee record {|
    string name;
    int age;
|};

type EmployeeMap map<Employee>;

service on new http:Listener(9090) {

    resource function get data() returns SimpleMap|http:NotFound {
        do {

        } on fail error e {
            return http:NOT_FOUND;
        }
    }
}
