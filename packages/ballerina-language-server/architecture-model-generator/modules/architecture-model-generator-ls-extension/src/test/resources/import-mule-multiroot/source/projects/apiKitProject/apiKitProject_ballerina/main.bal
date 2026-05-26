import ballerina/http;
import ballerina/log;

public listener http:Listener http\-listener\-config = new (8080);

service / on http\-listener\-config {
    resource function default api(http:Request request) returns http:Response|error {
        Context ctx = {attributes: {request, response: new}};
        http:Client apiKitClient = check new ("http://localhost:8080");
        string apiKitRedirectPath = "/apikit0/" + request.rawPath.substring("/".length() + "api".length());
        match request.method {
            "GET" => {
                ctx.payload = check apiKitClient->get(apiKitRedirectPath);
            }
            "POST" => {
                ctx.payload = check apiKitClient->post(apiKitRedirectPath, check request.getJsonPayload());
            }
            "PUT" => {
                ctx.payload = check apiKitClient->put(apiKitRedirectPath, check request.getJsonPayload());
            }
            "DELETE" => {
                ctx.payload = check apiKitClient->delete(apiKitRedirectPath, check request.getJsonPayload());
            }
            _ => {
                panic error("Method not allowed");
            }
        }

        // TODO: try to directly call the endpoints generated for the api kit

        ctx.attributes.response.setPayload(ctx.payload);
        return ctx.attributes.response;
    }

    resource function get apikit0/orders/[string id](http:Request request) returns http:Response|error {
        Context ctx = {attributes: {request, response: new, uriParams: {id}}};
        log:printInfo(string `Received order id: ${id.toString()}`);

        ctx.attributes.response.setPayload(ctx.payload);
        return ctx.attributes.response;
    }
}
