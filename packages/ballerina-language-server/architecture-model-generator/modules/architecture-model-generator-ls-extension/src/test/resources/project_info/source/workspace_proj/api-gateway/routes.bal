import ballerina/http;
import ballerina/time;
import wso2/common;

configurable string[] allowedPaths = ["/api/users", "/api/health"];

public function isPathAllowed(string path) returns boolean {
    foreach string allowedPath in allowedPaths {
        if path.startsWith(allowedPath) {
            return true;
        }
    }
    return false;
}

public function routeRequest(http:Request req, string targetService) returns http:Response|error {
    common:RequestMetadata metadata = {
        requestId: common:generateId(),
        timestamp: time:utcNow().toString()
    };

    req.setHeader("X-Request-Id", metadata.requestId);
    req.setHeader("X-Timestamp", metadata.timestamp);

    if targetService == "user" {
        json response = check common:userServiceClient->forward(req.rawPath, req);
        http:Response res = new;
        res.setJsonPayload(response);
        return res;
    }

    http:Response errorRes = new;
    errorRes.statusCode = 404;
    return errorRes;
}
