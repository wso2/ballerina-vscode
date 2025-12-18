import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service /api/v1/petsstore on httpDefaultListener {
    resource function get pets/[string petId]() returns error|json {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

    resource function post pets() returns error|json {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

    resource function put pets/[string petId]() returns error|json {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

    resource function delete pets/[string petId]() returns error|json {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

}
