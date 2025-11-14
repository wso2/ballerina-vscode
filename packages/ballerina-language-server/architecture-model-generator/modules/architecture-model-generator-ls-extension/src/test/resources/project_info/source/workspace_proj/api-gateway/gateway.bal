import ballerina/http;
import wso2/common;

listener http:Listener gatewayListener = new (8080, {
    secureSocket: {
        key: {
            certFile: "./certs/server.crt",
            keyFile: "./certs/server.key"
        }
    }
});

listener http:Listener adminListener = new (8081);

service /api on gatewayListener {

    resource function get health() returns http:Response {
        http:Response res = new;
        res.statusCode = 200;
        res.setJsonPayload({status: "healthy"});
        return res;
    }

    resource function post users(http:Request req) returns http:Response|error {
        if !common:validateRequest(req) {
            http:Response res = new;
            res.statusCode = 401;
            return res;
        }

        json payload = check req.getJsonPayload();
        json response = check common:userServiceClient->post("/users", payload);

        http:Response res = new;
        res.setJsonPayload(response);
        return res;
    }

    resource function get users/[string id]() returns json|error {
        return common:userServiceClient->get("/users/" + id);
    }
}

service /admin on adminListener {

    resource function get metrics() returns json {
        return {
            requests: 1000,
            errors: 5,
            uptime: "99.9%"
        };
    }

    function init() {
        common:logMessage("Admin service initialized");
    }
}
