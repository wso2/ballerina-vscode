import ballerina/http;

final http:Client apiClient = check new ("https://api.v2.example.com");

listener http:Listener httpListener = new (8080);

service /api on httpListener {
    resource function get data() returns json|error {
        json response = check apiClient->/data;
        return response;
    }
}
