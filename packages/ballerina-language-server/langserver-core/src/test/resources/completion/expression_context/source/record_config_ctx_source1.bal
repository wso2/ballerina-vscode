import ballerina/http;

type ConfigRecord record {
    string configStr;
    http:Client httpClient;
    AnotherRecord nestedRecord;
};

type AnotherRecord record {
    int id;
    string name;
};

function testFunction() {
    ConfigRecord rec = {};
    rec.
}
