import ballerina/graphql;

listener graphql:Listener graphqlDefaultListener = new (listenTo = 8080);

service graphql:Service /graphql on graphqlDefaultListener {
}
