# Returns a greeting message
# + name - The name to greet
# + return - Greeting string
public function getGreeting(string name) returns string {
    return "Hello, " + name;
}

# Record type for user data
public type User record {|
    string id;
    string name;
|};
