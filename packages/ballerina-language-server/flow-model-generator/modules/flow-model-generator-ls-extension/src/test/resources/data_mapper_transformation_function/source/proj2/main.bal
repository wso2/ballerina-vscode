import ballerina/http;

listener http:Listener httpDefaultListener = http:getDefaultListener();

service /foo on httpDefaultListener {
    resource function get greeting() returns error|json|http:InternalServerError {
        do {
            UserInfo user = {username: "user1", password: "pass1"};
            Student student = {
                username: "student1",
                password: "pass1",
                isUnderGrad: true,
                courses: ["CS101", "MA101"],
                age: 20,
                gpa: 3.5,
                height: 5.9
            };
            Student var1 = {};
        } on fail error err {
            return error("unhandled error", err);
        }
    }
}
