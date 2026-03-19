import ballerina/http;

// HTTP client configuration for external API calls
configurable string petStoreApiUrl = "https://petstore.swagger.io/v2";

// HTTP client for making external API calls
public final http:Client petStoreClient = check new (petStoreApiUrl);
