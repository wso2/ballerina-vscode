import ballerina/io;

public function getGreeting() returns string {
    return "Hello from provider";
}

public const string API_VERSION = "v1.0";

public type Config record {
    string host;
    int port;
};
