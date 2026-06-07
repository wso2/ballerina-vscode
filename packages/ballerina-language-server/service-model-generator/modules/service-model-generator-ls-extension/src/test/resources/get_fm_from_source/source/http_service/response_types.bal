import ballerina/http;

service /responses on new http:Listener(8085) {

    // Basic JSON or error response
    resource function get basic() returns json|error {
        return {message: "Hello JSON"};
    }

    // Return HTTP status codes
    resource function get created() returns http:Created {
        return http:CREATED;
    }

    // Return custom response with headers
    resource function get custom() returns http:Response {
        http:Response res = new;
        res.statusCode = 200;
        res.setPayload({message: "Custom response"});
        res.setHeader("X-Custom-Header", "CustomValue");
        return res;
    }

    // Return different response types
    resource function get ok() returns HttpOK|HttpCreated|HttpAccepted {
        return {body: 200};
    }

    // Return anonymous record type
    resource function get anon() returns record {|
        *http:Created;
        string body;
        "application/text" mediaType = "application/text";
        record {|string x\-path;|} headers?;
    |} {
        return {body: "Anonymous record response", mediaType: "application/text"};
    }

}

type HttpOK record {|
    *http:Ok;
    int body;
|};

type HttpCreated record {|
    *http:Created;
    string body;
    "application/text" mediaType = "application/text";
|};

type HttpAccepted record {|
    *http:Accepted;
    string body;
    "application/text" mediaType = "application/text";
    record {|string x\-path;|} headers;
|};
