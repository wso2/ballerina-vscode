import ballerina/http;

type User record {
    string name;
    int age;
    string email;
};

service /users on new http:Listener(8084) {

    // JSON payload
    resource function post create(@http:Payload json user) returns json {
        return {message: "User created", data: user};
    }

    // Record payload (structured data)
    resource function post register(User user) returns json|error {
        return {"message": "User registered", "user": user}.toJson();
    }
}
