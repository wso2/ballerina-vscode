import ballerina/test;
import ballerina/ai;

@test:Config {groups: ["evalset"], dataProvider: loadEvalSetData}
function testEvalSetFunction(ai:Trace thread) {
    test:assertTrue(true, msg = "Failed!");
}

function loadEvalSetData() returns ai:Trace[]|error {
    return check ai:loadConversationThreads("resources/old_sessions.json");
}
