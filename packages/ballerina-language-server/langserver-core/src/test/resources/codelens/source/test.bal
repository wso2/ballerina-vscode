import ballerina/test;

@test:Config{}
function testFunction1() {
}

@test:Config {enabled: false}
function testFunction2() {
}

function normalFunction() {
}
