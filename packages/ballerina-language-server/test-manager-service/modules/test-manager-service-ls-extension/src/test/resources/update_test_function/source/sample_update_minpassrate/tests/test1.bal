import ballerina/test;

@test:Config {groups: ["stability"], runs: 10, minPassRate: 70}
function testWithMinPassRate() {
    test:assertTrue(true, msg = "Failed!");
}
