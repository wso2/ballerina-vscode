# Gets the current timestamp
#
# + return - Current timestamp in milliseconds
public function getCurrentTimestamp() returns int {
    return 0;
}

# Converts seconds to milliseconds
#
# + seconds - Number of seconds
# + return - Equivalent milliseconds
public function secondsToMillis(int seconds) returns int {
    return seconds * 1000;
}
