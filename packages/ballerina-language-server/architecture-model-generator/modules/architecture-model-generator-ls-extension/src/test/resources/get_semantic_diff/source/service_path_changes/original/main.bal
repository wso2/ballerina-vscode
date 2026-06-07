import ballerina/http;

listener http:Listener httpListener = new (8080);

service /api/v1 on httpListener {
    resource function get items() returns json {
        return [];
    }

    resource function post items() returns json {
        return {};
    }
}
