import ballerina/http;

service /headers on new http:Listener(8083) {
    // Multiple headers
    resource function get profile(
        @http:Header string authorization,
        @http:Header {name: USER_X_HEADER } string? contentType,
        @http:Header {name: "X-Request-ID"} string? requestId
    ) returns json {
        return {
            auth: authorization,
            contentType: contentType,
            requestId: requestId
        };
    }
}

const string USER_X_HEADER = "USER-X";
