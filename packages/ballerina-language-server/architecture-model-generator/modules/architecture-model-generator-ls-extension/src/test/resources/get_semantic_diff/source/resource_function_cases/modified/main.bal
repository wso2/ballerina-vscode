import ballerina/http;

listener http:Listener httpListener = http:getDefaultListener();

service /api on httpListener {
    resource function get .() returns json {
        json response = {"message": "Welcome"};
        return response;
    }

    resource function get items/[string id]() returns json {
        json result = {"id": id};
        return result;
    }

    resource function post items() returns json {
        return {};
    }

    resource function delete items/[string id]() returns json {
        return {};
    }

    resource function get items/[string id]/reviews() returns json|error {
        json result = [{"review": "good"}];
        return result;
    }

    resource function get items/[string id]/reviews/[string reviewId]/comments() returns json {
        return [];
    }

    resource function patch items/[string id]() returns json {
        return {};
    }
}
