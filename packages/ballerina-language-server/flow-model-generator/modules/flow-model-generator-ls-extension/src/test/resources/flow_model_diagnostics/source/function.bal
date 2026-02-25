import ballerina/http;

function processEvent(http:SseEvent event, string? lastEventId) returns error {
    lastEventId = event.id;
}


