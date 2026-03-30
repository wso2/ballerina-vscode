// AUTO-GENERATED FILE. DO NOT MODIFY.

// This file is an auto-generated file by Ballerina persistence layer for third_model.
// It should not be modified by hand.

import ballerina/time;

public type Employee record {|
    readonly int id;
    string firstName;
    string lastName;
    string email;
    string? department;
    decimal? salary;
    time:Date? hireDate;
    time:Utc? createdAt;
|};

public type EmployeeOptionalized record {|
    int id?;
    string firstName?;
    string lastName?;
    string email?;
    string? department?;
    decimal? salary?;
    time:Date? hireDate?;
    time:Utc? createdAt?;
|};

public type EmployeeTargetType typedesc<EmployeeOptionalized>;

public type EmployeeInsert record {|
    string firstName;
    string lastName;
    string email;
    string? department;
    decimal? salary;
    time:Date? hireDate;
    time:Utc? createdAt;
|};

public type EmployeeUpdate record {|
    string firstName?;
    string lastName?;
    string email?;
    string? department?;
    decimal? salary?;
    time:Date? hireDate?;
    time:Utc? createdAt?;
|};
