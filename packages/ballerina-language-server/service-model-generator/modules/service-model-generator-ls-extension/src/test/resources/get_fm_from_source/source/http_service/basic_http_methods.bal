import ballerina/http;
import ballerina/log;

service /api on new http:Listener(8080) {

    // Default resource - handles unmatched paths
    resource function 'default [string... path]() returns json {
        return {
            message: "Default handler",
            path: path
        };
    }

    // GET resource - retrieve data
    resource function get users() returns json {
        return {users: ["Alice", "Bob", "Charlie"]};
    }

    // POST resource - create new data
    resource function post users(@http:Payload json payload) returns http:Created|error {
        log:printInfo("Creating user: " + payload.toString());
        return http:CREATED;
    }

    // PUT resource - update/replace data
    resource function put users/[string id](@http:Payload json payload) returns json|http:NotFound {
        return {message: "User " + id + " updated"};
    }

    // PATCH resource - partial update
    resource function patch users/[string id](@http:Payload json payload) returns json {
        return {message: "User " + id + " partially updated"};
    }

    // DELETE resource - remove data
    resource function delete users/[string id]() returns http:NoContent|http:NotFound {
        return http:NO_CONTENT;
    }

    // HEAD resource - retrieve headers only
    resource function head users() returns http:Ok {
        return http:OK;
    }

    // OPTIONS resource - describe communication options
    resource function options users() returns http:Ok {
        return http:OK;
    }
}
