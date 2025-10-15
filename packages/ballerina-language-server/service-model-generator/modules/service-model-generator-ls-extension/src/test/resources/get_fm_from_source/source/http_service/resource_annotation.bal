import ballerina/http;

service /media on new http:Listener(8091) {

    # Description.
    # + return - return value description
    @http:ResourceConfig {
        produces: ["application/json"]
    }
    @display {
        label: "Annotated Resource"
    }
    resource function get annotated() returns json {
        return {"type": "json"};
    }
}
