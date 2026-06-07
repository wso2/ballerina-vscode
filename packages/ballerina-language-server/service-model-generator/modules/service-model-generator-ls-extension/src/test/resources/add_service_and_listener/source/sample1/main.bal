import ballerina/http;

listener http:Listener httpListener = new (port = 9090);

service /api on httpListener {

    @http:ResourceConfig {
        consumes: []
    }
    resource function get greeting/[string name](@http:Header string header, int id = 45) returns OkResponse {
        do {
        } on fail error err {
            // handle error
        }
    }

    resource function get response() returns http:Response {
        return new http:Response();
    }

    resource function get intResult() returns int {
        return 200;
    }

    resource function get httpOk() returns http:Ok {
        return http:OK;
    }

    resource function get httpOkWithType() returns HttpOk {
        return {body: 0};
    }

    resource function get anonReturn() returns record {|*http:Ok; int body;|} {
        return {body: 0};
    }

    resource function get allUnion() returns http:Response|int|http:Ok|HttpOk|record {|*http:Ok; int body;|} {
        return new http:Response();
    }

    resource function get noReturn() {
        return;
    }

    function foo() returns int {
        return 42;
    }
}

type HttpOk record {|
    *http:Ok;
    int body;
|};

public type OkResponse record {|
    *http:Ok;
    json body;
|};
