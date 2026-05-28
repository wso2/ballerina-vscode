import ballerina/http;

listener http:Listener httpListener = new (8080);

service /api on httpListener {
    resource function get data() returns json {
        return {"message": "Hello"};
    }
}
