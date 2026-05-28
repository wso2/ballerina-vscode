import ballerina/http;
import ballerina/log;

service /advance\-parameters on new http:Listener(8086) {

    // http request object
    resource function post request(http:Request req) returns json|error {
        var _ = check req.getBodyParts();
        return {'error: "No body parts"};
    }

    // http caller object
    resource function get caller(http:Caller caller) returns error? {
        // Simulate async processing
        worker AsyncWorker {
            json response = {message: "Delayed response"};
            do {
	            check caller->respond(response);
            } on fail error e {
            	log:printError("Error sending response", 'error = e);
            }
        }
    }

    // http headers object
    resource function get headers(http:Headers headers) returns json|http:HeaderNotFoundError {
        string? customHeader = check headers.getHeader("X-Custom-Header");
        return {customHeader: customHeader ?: "Not provided"};
    }
}
