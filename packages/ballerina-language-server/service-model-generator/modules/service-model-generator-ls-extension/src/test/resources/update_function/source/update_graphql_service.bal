import ballerina/graphql;

listener graphql:Listener graphQLListener = new (9090);

type Profile readonly & record {|
    int id;
    string name;
    int age;
|};

table<Profile> key(id) profiles = table [
    {id: 1, name: "Walter White", age: 50},
    {id: 2, name: "Jesse Pinkman", age: 25}
];

service /graphql on graphQLListener {

    private final readonly & string[] names = ["Walter White", "Jesse Pinkman", "Saul Goodman"];

    function init() returns error? {
    }

    # A simple greeting query.
    # The greeting query returns a greeting message for the provided name.
    # + name - name to be greeted
    # + age - The age of the person.
    #        This parameter is optional and has a default value of 28.
    # + return - greeting message
    resource function get greeting(graphql:Context context, string name, int age) returns string {
            return string `Hello, ${name}`;
    }

    remote function updateName(int id, string name) returns Profile|error {
        if profiles.hasKey(id) {
            Profile profile = profiles.remove(id);
            Profile updatedProfile = {
                id: profile.id,
                name: name,
                age: profile.age
            };
            profiles.put(updatedProfile);
            return updatedProfile;
        }
        return error(string `Profile with ID "${id}" not found`);
    }

    // GraphQL `Subscription`
    resource function subscribe names() returns stream<string, error?> {
        return self.names.toStream();
    }
}
