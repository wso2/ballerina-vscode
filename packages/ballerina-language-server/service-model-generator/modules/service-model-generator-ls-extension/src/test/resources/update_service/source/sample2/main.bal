import ballerina/graphql;

listener graphql:Listener graphqlListener = new (port = 9090);

# This is a GraphQL service.
@graphql:ServiceConfig {
    corsConfig: {}
}
service /graphql on graphqlListener {

}
