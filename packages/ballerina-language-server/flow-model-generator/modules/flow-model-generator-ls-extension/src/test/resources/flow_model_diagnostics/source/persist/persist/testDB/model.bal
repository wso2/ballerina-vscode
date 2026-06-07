import ballerina/persist as _;
import ballerina/time;
import ballerinax/persist.sql;

@sql:Name {value: "users"}
public type User record {|
    @sql:Generated
    readonly int id;
    @sql:Varchar {length: 50}
    string name;
    @sql:Varchar {length: 100}
    @sql:UniqueIndex {name: "email"}
    string email;
    @sql:Name {value: "created_at"}
    time:Utc? createdAt;
|};

