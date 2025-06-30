import ballerina/io;
import ballerina/http;
import ballerina/log;
import ballerina/math;

public function main() {
    io:println("Hello, World!");
    getValue("");
}

# Prints PI value
# Refers math library
public function printPI() {
    // Refer symbols of another module.
    // `math:PI` is a qualified identifier. Note the usage of the module prefix.
    float piValue = "piValue";
    10;
    io:println(piValue);
}

# Defines a `class` called `Employee`, which is structurally equivalent
# to the `Person` type.
#
# + firstName - Parameter Description  
# + lastName - Parameter Description  
public class Employee {
    public int age;
    public string firstName;
    public string lastName;

    # Description
    #
    # + age - age Parameter Description
    # + firstName - firstName Parameter Description
    # + lastName - lastName Parameter Description
    function init(int age, string firstName, string lastName) {
        self.age = age;
        self.firstName = firstName;
        self.lastName = lastName;
    }

    # Description
    #
    # + return - Return Value Description
    function getFullName() returns string {
        return self.firstName + " " + self.lastName;
    }

    function checkAndModifyAge(int condition, int a) {
        if (self.age < condition) {
            self.age = a;
        }
    }
}

public type Student record {
    string Name;
    int Grade;
    map<any> Marks;
};

# Define a closed record type named `Address`. The `{|` and `|}` delimiters indicate that this record type
# allows mapping values, which contain only the described fields.
type Address record {|
    string city;
    string country;
|};

# Description
#
# + age - age Parameter Description
# + firstName - firstName Parameter Description
type Person object {
    public int age;
    public string firstName;
    public string lastName;

    // Returns full name
    function getFullName() returns string;

    # Description
    #
    # + condition - condition Parameter Description
    # + a - a Parameter Description
    function checkAndModifyAge(int condition, int a);
};

# This is a service which exposes bindJson, bindXML,
# and bindStruct methods.
service /hello on new http:Listener(9090) {

    // The `orderDetails` parameter in [Payload annotation](https://ballerina.io/swan-lake/learn/api-docs/ballerina/#/ballerina/http/latest/http/records/Payload)
    // represents the entity body of the inbound request.
    resource function post bindJson(http:Caller caller, http:Request req, @http:Payload {} json orderDetails) {
        //Accesses the JSON field values.
        var details = orderDetails.Details;
        http:Response res = new;
        if (details is json) {
            res.setPayload(<@untainted>details);
        } else {
            res.statusCode = 400;
            res.setPayload("Order Details unavailable");
        }
        var result = caller->respond(res);
        if (result is error) {
            log:printError(result.message(), err = result);
        }
    }

    # Binds the XML payload of the inbound request to the `store` variable.
    #
    # + caller - Parameter Description  
    # + store - Parameter Description  
    # + req - Parameter Description  
    @http:ResourceConfig {consumes: ["application/xml"]}
    resource function post bindXML(http:Caller caller, http:Request req, @http:Payload {} xml store) {
        //Accesses the XML content.
        xml city = store.selectDescendants("{http://www.test.com}city");
        http:Response res = new;
        res.setPayload(<@untainted>city);

        var result = caller->respond(res);
        if (result is error) {
            log:printError(result.message(), err = result);
        }
    }

    //Binds the JSON payload to a custom record. The payload's content should
    //match the record.
    @http:ResourceConfig {consumes: ["application/json"]}
    resource function post bindStruct(http:Caller caller, http:Request req, @http:Payload {} Student student) {
        //Accesses the fields of the `Student` record.
        string name = <@untainted>student.Name;
        int grade = <@untainted>student.Grade;
        string english = <@untainted string>student.Marks["English"];
        http:Response res = new;
        res.setPayload({
            Name: name,
            Grade: grade,
            English: english
        });

        var result = caller->respond(res);
        if (result is error) {
            log:printError(result.message(), err = result);
        }
    }
}

function getValue(string key) returns string|error {
    if (key == "") {
        error err = error("key '" + key + "' not found");
        return err;
    } else {
        return "this is a value";
    }
}
