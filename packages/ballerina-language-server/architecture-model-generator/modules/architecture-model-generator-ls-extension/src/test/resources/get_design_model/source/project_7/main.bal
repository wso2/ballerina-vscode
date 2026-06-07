import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service /api on httpDefaultListener {
    resource function get greeting() returns error? {
        check sendHttpRequest("exampleKey");
    }
}

function sendHttpRequest(string key) returns error? {
    map<http:Client> clientMap = {};

    http:Client cl;
    if clientMap.hasKey(key) {
        cl = clientMap.get(key);
    } else {
        cl = check new ("http://example.com");
        clientMap[key] = cl;
    }

    http:Response _ = check cl->post("/path", { "key": "value" });
}
