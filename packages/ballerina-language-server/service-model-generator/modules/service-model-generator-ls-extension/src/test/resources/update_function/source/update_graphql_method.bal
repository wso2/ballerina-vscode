import ballerina/graphql;

listener graphql:Listener graphqlDefaultListener = new (listenTo = 8080);

service graphql:Service /graphql on graphqlDefaultListener {
    resource function get field1(int arg1) returns int {
    }
}
