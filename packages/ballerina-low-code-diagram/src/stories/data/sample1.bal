import ballerina/http;

function name() returns error?{
    int a = 0;
    a = 9;
    http:Client endpoint = check new ("");
    http:Response sd = check endpoint->get("");
}
