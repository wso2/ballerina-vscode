import ballerina/log;
import ballerinax/redis;

public function main() returns error? {
    do {
        redis:Options options = {
            host: "localhost",
            port: 6379,
            password: "your_password"
        };
    } on fail error e {
        log:printError("Error occurred", 'error = e);
        return e;
    }
}