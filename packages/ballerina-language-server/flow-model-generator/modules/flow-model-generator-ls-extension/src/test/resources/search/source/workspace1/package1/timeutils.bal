import ballerina/time;

# Gets the current timestamp
#
# + return - Current UTC timestamp
public function getCurrentTimestamp() returns time:Utc {
    return time:utcNow();
}

# Converts seconds to milliseconds
#
# + seconds - Number of seconds
# + return - Equivalent milliseconds
public function secondsToMillis(int seconds) returns int {
    return seconds * 1000;
}
