import ballerinax/persist.sql as sql;

// Mapped to the "employees" DB table via @sql:Name annotation
@sql:Name {value: "employees"}
public type Employee record {|
    readonly int id;
    string name;
    string? department;
|};

// Mapped to the "departments" DB table via direct type name match
public type departments record {|
    readonly int id;
    string name;
|};
