import ballerina/persist as _;

public type User record {|
    readonly int id;
    string name;
    string email;
    Post[] posts;
|};

public type Post record {|
    readonly int id;
    string title;
    string content;
    int userId;
    User user;
|};
