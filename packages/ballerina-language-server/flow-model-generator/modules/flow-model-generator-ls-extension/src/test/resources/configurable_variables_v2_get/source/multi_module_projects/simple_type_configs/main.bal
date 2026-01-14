import simpleconfigs.mod1;
import ballerina/log;
import ballerina/http;

configurable string itemCode = "item12393";
configurable float discount = 4.5;
configurable boolean testMode = ?;

public function main() {
    _ = mod1:hello("user");
    log:printInfo("Item Code: " + itemCode);
}

final http:Client httpClient = check new ("https://example.com");
