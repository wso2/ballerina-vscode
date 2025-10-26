import ballerina/graphql;

service /graphql on new graphql:Listener(9090) {

    resource function get profile() returns Profile {
        return;
    }
}
