import configServiceProject.hello_world;
import ballerina/http;

# Working
configurable string foo = "cats";
configurable boolean isAdmin = ?;
configurable byte age = ?;
configurable int port = ?;
configurable float height = ?;
configurable decimal salary = ?;
configurable string name = ?;
configurable xml book = ?;
configurable boolean[] switches = ?;
configurable int[] ports = ?;
configurable float[] rates = ?;
configurable string[] colors = ?;
configurable map<string> person = ?;
configurable map<string>[] people = ?;

type Person record {
    string name;
    int age;
};

configurable Person personx = ?;

type Food record {
    string name;
    int cal;
};

type Diet record {
    Food food;
    int age;
};

configurable Diet input = ?;

type Personx record {
    Food food;
    string name;
    int age;
};

configurable Personx[] peopex = ?;
configurable table<map<string>> users = ?;
configurable table<map<string>>[] userTeams = ?;

enum Country {
    LK = "Sri Lanka",
    US = "United States"
}

configurable Country country = ?;
configurable int|string code = ?;
configurable anydata data = ?;
configurable string url = ?;
configurable http:ClientAuthConfig authConfig = ?;

service on new http:Listener(0) {
    function init() returns error? {
        float barValue = hello_world:bar;
        http:Client myClient = check new (url, {
            auth: authConfig
        });
    }

}
