import ballerina/persist as _;
import ballerina/time;
import ballerinax/persist.sql;

@sql:Name {value: "departments"}
public type Department record {|
    @sql:Name {value: "dept_id"}
    @sql:Generated
    readonly int deptId;
    @sql:Name {value: "dept_name"}
    @sql:Varchar {length: 100}
    @sql:UniqueIndex {name: "departments_dept_name_key"}
    string deptName;
    @sql:Varchar {length: 100}
    string? location;
    @sql:Decimal {precision: [12, 2]}
    decimal? budget;
|};

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
    @sql:UniqueIndex {name: "employees_email_key"}
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
