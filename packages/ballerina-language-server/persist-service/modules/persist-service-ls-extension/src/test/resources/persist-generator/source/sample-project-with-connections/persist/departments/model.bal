import ballerina/persist as _;
import ballerinax/persist.sql;

@sql:Name {value: "departments"}
public type Department record {|
    @sql:Name {value: "dept_id"}
    @sql:Generated
    readonly int deptId;
    @sql:Name {value: "dept_name"}
    @sql:Varchar {length: 100}
    @sql:UniqueIndex {name: "dept_name"}
    string deptName;
    @sql:Varchar {length: 100}
    string? location;
    @sql:Decimal {precision: [12, 2]}
    decimal? budget;
|};
