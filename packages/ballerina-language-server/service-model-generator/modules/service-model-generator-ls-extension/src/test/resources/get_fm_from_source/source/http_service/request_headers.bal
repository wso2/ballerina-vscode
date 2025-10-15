import ballerina/http;

service /headers on new http:Listener(8083) {
    // Multiple headers
    resource function get profile(
        @http:Header string authorization,
        @http:Header string? contentType,
        @http:Header {name: "X-Request-ID"} string? requestId
    ) returns json {
        return {
            auth: authorization,
            contentType: contentType,
            requestId: requestId
        };
    }
}
