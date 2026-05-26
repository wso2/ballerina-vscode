import ballerina/http;

listener http:Listener httpListener = new (8080);

service /api on httpListener {
    resource function get items() returns json {
        return [];
    }
}

service /health on httpListener {
    resource function get .() returns string {
        return "OK";
    }
}
