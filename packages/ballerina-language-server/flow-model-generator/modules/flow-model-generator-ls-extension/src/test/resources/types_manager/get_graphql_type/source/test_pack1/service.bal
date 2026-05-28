import ballerina/graphql;

# This is a simple GraphQL service that
# includes a query field.
service /graphql on new graphql:Listener(9090) {

    # Returns a greeting message that includes provided name.
    # + name - Name to be included in the message
    # + return - Greeting message with the name
    resource function get hello(string name) returns string {
        return string `Hello ${name}`;
    }
}

# This is a simple GraphQL service that
# includes a query field.
@graphql:ServiceConfig {maxQueryDepth: 334, auth: []}
service /graphql2 on new graphql:Listener(9091) {

    # Returns a greeting message that includes provided name.
    # + name - Name to be included in the message
    # + return - Greeting message with the name
    @graphql:ResourceConfig {complexity: 5}
    resource function get hello(string name) returns string {
        return string `Hello ${name}`;
    }
}
