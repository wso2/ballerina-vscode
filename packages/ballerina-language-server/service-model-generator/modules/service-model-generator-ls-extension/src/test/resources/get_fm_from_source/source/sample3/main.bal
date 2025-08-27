import ballerina/graphql;

listener graphql:Listener graphqlListener = new (9090);

service /graphql on graphqlListener {

    @graphql:ResourceConfig {
        cacheConfig: {
            enabled: true
        }
    }
    resource function get hello(graphql:Context context, graphql:Field 'field) returns string {
        return "Hello, World!";
    }

    @graphql:ResourceConfig {
        prefetchMethodName: "prefetchHelloWithName"
    }
    resource function get helloWithName(graphql:Field 'field, string name) returns string {
        return "Hello, " + name + "!";
    }

    @graphql:ResourceConfig {
        cacheConfig: {
            enabled: true,
            maxAge: 300
        }
    }
    remote function greet(graphql:Field 'field, string name, graphql:Context context) returns string {
        return "Greetings, " + name + "!";
    }

    @graphql:ResourceConfig {
        cacheConfig: {
            enabled: true
        }
    }
    resource function subscribe notifications(graphql:Context context) returns stream<string, error?> {
        string[] messages = ["Notification 1", "Notification 2", "Notification 3"];
        return messages.toStream();
    }

    isolated function prefetchHelloWithName(graphql:Context ctx) {
    }
}
