import ballerina/http;

service /query\-params on new http:Listener(8082) {

    // Query parameters with different types
    resource function get products(string? name, string[] tags, int? 'limit = 10) returns json {
        return {
            searchName: name,
            'limit: 'limit,
            tags: tags
        };
    }

    // Query parameters with annotations
    resource function get items(@http:Query{name: "X-TAGS"} string[] tags) returns json {
        return {tags: tags};
    }

    // Bind query params to a record
    resource function get search(*QueryParams params) returns json {
        return {
            name: params.name,
            page: params.page,
            'limit: params.'limit
        };
    }
}

type QueryParams record {|
    string? name;
    int page = 1;
    int 'limit = 10;
|};
