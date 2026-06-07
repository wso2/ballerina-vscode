
import ballerina/graphql;

# A service representing a network-accessible GraphQL API
@display {
    label: "GraphQlService",
    id: "GraphQlService-3e0975da-db3b-4531-a5e6-c2c396a980bd"
}
service / on new graphql:Listener(8090) {

    function init() returns error? {

    }

    # A resource for generating greetings
    # Example query:
    # query GreetWorld{ 
    # greeting(name: "World") 
    # }
    # Curl command: 
    # curl -X POST -H "Content-Type: application/json" -d '{"query": "query GreetWorld{ greeting(name:\"World\") }"}' http://localhost:8090
    #
    # + name - the input string name
    # + return - string name with greeting message or error
    resource function get greeting(string name) returns string|error {
        if name is "" {
            return error("name should not be empty!");
        }
        return "Hello, " + name;
    }
}
