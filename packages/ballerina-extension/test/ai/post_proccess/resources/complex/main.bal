
import ballerina/io;
import ballerinax/snowflake;

snowflake:Options options = {
    properties: {
        "JDBC_QUERY_RESULT_FORMAT": "JSON"
    }
};

final snowflake:Client snowflakeClient = check new ("accountIdentifier", "user", "password", options);

service /  on new http:Listener(9090) {
    resource function get foo() returns string|http:NotFound {
        log:printInfo("hai");
        return "Hello, World!";
    }
}
