import ballerina/persist as _;
import ballerina/time;
import ballerinax/persist.sql;

@sql:Name {value: "employees"}
public type Employee record {|
    @sql:Generated
    readonly int id;
    @sql:Name {value: "first_name"}
    @sql:Varchar {length: 100}
    string firstName;
    @sql:Name {value: "last_name"}
    @sql:Varchar {length: 100}
    string lastName;
    @sql:Varchar {length: 255}
    @sql:UniqueIndex {name: "email"}
    string email;
    @sql:Varchar {length: 100}
    string? department;
    @sql:Decimal {precision: [10, 2]}
    decimal? salary;
    @sql:Name {value: "hire_date"}
    time:Date? hireDate;
    @sql:Name {value: "created_at"}
    time:Utc? createdAt;
|};
