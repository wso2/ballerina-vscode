import ballerina/http;

listener http:Listener httpListener = http:getDefaultListener();

service /api on httpListener {
    resource function get .() returns string {
        return "Hello";
    }

    resource function get items/[string id]() returns json {
        return {};
    }

    resource function post items() returns json {
        return {};
    }

    resource function put items/[string id]() returns json {
        return {};
    }

    resource function delete items/[string id]() returns json {
        return {};
    }

    resource function head items() returns http:Response {
        return new;
    }

    resource function get items/[string id]/reviews/[string reviewId]() returns json {
        return {};
    }

    resource function get items/[string id]/reviews() returns json {
        return [];
    }
}
