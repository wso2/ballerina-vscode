# Service writing instructions

- HTTP Service always requires a http listener to be attatched to it. Always declare the listener in the module level as variable and then use it in the service declaration. (eg; listener http:Listener ep  = check new http:Listener(8080);)
- Only can contain resource functions inside the service.
- Path paramters must be specified in the resource function path. (eg: resource function get v1/user/[int userId]/profile())
- In the resource function parameters, you can specify query parameters, headers and body as parameters.
    - Body - use `@http:Payload` annotation to specify the body parameter. Note: The annotation is optional if there is only one parameter and if the type is a record.
    - Query parameters - use `@http:Query` annotation to specify query parameters.
    - Headers - use `@http:Header` annotation to specify header parameters.

```
import ballerina/http;

listener http:Listener ep  = check new http:Listener(8080);

type Person record {
    string name;
    int age;
};

service /v1 on ep {

    // Prefer types as return type. can be anydata such as string, json, record, etc.
    resource function get foo() returns Person|error {
        return { name: "John", age: 30};
    }

    // Query parameters
    resource function get bar(@http:Query string id) returns Person|error {
        return { name: "John", age: 30};
    }

    // Path parameters
    resource function get customers/[int id]/accounts() returns Person|error {
        return { name: "John", age: 30};
    }

    // Body with data binding and header parameters
    resource function post customers/[int id]/accounts(@http:Payload Person account, @http:Header string customHeader) returns Person|error {
        return account;
    }
}

```


# Client writing instructions

- Always declare clients in module level as final variables.
- Use direct data binding to bind the response to a type whenever possible.
- Only use `http:Response` type as the return type when you need to access headers or status code of the response.

```
import ballerina/http;

listener http:Listener ep  = check new http:Listener(8080);

// Always declare clients in module level as final variables.
final http:Client cl = check new("http://localhost:9090");

type Person record {
    string name;
    int age;
};

service /v1 on ep {
    resource function get user() returns Person|error {
        // If only the body of the response is needed use direct data binding.
        Person p = check cl->get("/foo/bar");

        // If the full response is needed use http:Response
        http:Response res = check cl->get("/foo/bar");
        json payload = check res.getJsonPayload();
        Person p1 = check payload.cloneWithType();


        // get a specific header
        string contentTypeHeader = check res.getHeader("Content-Type");

        // get status code
        int statusCode = res.statusCode;

        // send a http request with query params and headers. Note both these are optional.
        Person p3 = check cl->get("/foo/bar?queryParam1=value&queryParam2=val2", headers = {
            "x-Custom-Header": "custom-value"
        });

        return p1;
    }
}
```
