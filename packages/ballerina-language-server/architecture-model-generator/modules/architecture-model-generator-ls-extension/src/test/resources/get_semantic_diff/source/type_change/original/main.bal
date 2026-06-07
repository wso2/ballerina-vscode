import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service /api on httpDefaultListener {
    resource function post patients(@http:Payload Patient payload) returns error|json {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

}
