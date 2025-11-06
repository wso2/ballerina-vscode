import ballerina/http;

service /path\-params on new http:Listener(8081) {

    // Single path parameter
    resource function get products/[string id]() returns json {
        return {productId: id};
    }

    // Multiple path parameters
    resource function get categories/[string category]/products/[int id]() returns json {
        return {category: category, productId: id};
    }

    // Rest parameter (captures remaining path segments)
    resource function get files/[string... path]() returns json {
        return {filePath: path};
    }
}
