import ballerina/graphql;
import ballerina/http;

# A service representing a network-accessible API
# bound to port `9090`.
service / on new http:Listener(9090) {

    @display {
        label: "GraphQlService",
        id: "GraphQlService-3e0975da-db3b-4531-a5e6-c2c396a980bd"
    }
    graphql:Client graphQlServiceClient;

    function init() returns error? {
        self.graphQlServiceClient = check new ("");
    }

    # A resource for generating greetings
    # + name - the input string name
    # + return - string name with hello message or error
    resource function get greeting(string name) returns string|error {
        // Send a response back to the caller.
        if name is "" {
            return error("name should not be empty!");
        }
        return "Hello, " + name;
    }
}
