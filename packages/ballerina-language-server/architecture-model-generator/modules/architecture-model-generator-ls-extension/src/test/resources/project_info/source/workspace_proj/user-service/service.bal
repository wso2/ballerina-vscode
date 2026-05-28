import ballerina/http;
import wso2/common;

listener http:Listener userServiceListener = new (9091);

final User[] users = [];

service /users on userServiceListener {

    function init() {
        common:logMessage("User service initialized");
    }

    resource function get .() returns User[]|error {
        return users;
    }

    resource function get [string id]() returns User|http:NotFound {
        foreach User user in users {
            if user.id == id {
                return user;
            }
        }
        return {body: {message: "User not found"}};
    }
}

function getUsersByRole(string role) returns User[] {
    User[] filteredUsers = [];
    foreach User user in users {
        if user.role == role {
            filteredUsers.push(user);
        }
    }
    return filteredUsers;
}
