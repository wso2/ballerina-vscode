import ballerina/graphql;

listener graphql:Listener graphqlListener = new (9090);

service /graphql on graphqlListener {

    # A simple hello world query that returns a greeting message.
    # This query is cached for performance optimization.
    # + name - The name to greet.
    # + return - Returns a greeting message.
    @graphql:ResourceConfig {
        cacheConfig: {
            enabled: true
        }
    }
    resource function get hello(string name) returns string {
        return "Hello, World!";
    }

    # A query that returns a personalized greeting message.
    #     This query uses 'field parameter.
    # + name - The name to greet.
    # + return - Returns a personalized greeting message.
    resource function get helloWithName(graphql:Field 'field, string name) returns string {
        return "Hello, " + name + "!";
    }

    # A remote function that returns a formal greeting message.
    remote function greet(graphql:Field 'field, string name, graphql:Context context) returns string {
        return "Greetings, " + name + "!";
    }

    # A subscription that streams notification messages.
    resource function subscribe notifications(graphql:Context context) returns stream<string, error?> {
        string[] messages = ["Notification 1", "Notification 2", "Notification 3"];
        return messages.toStream();
    }
}
