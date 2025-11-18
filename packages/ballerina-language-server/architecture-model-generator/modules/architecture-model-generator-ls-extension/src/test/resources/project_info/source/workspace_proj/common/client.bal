import ballerina/http;

public final http:Client userServiceClient = check new ("http://localhost:9091");
public final http:Client externalApiClient = check new ("https://api.external.com");
