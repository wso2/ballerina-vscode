// AUTO-GENERATED FILE. DO NOT MODIFY.

// This file is an auto-generated file by Ballerina persistence layer for testDB.
// It should not be modified by hand.

import ballerina/time;

public type User record {|
    readonly int id;
    string name;
    string email;
    time:Utc? createdAt;
|};

public type UserOptionalized record {|
    int id?;
    string name?;
    string email?;
    time:Utc? createdAt?;
|};

public type UserTargetType typedesc<UserOptionalized>;

public type UserInsert record {|
    string name;
    string email;
    time:Utc? createdAt;
|};

public type UserUpdate record {|
    string name?;
    string email?;
    time:Utc? createdAt?;
|};

