# Ballerina SQL Library Instructions

The `ballerina/sql` library provides the core types, errors, and annotations for
relational database access. Database-specific clients (`ballerinax/mysql`,
`ballerinax/postgresql`, `ballerinax/mssql`, etc.) build on top of it.

## CRITICAL: Annotate every field of a database-table record with `@sql:Column`

Whenever you define a Ballerina record type that represents a row of a database
table, you MUST add a `@sql:Column {name: "<exact_column_name>"}` annotation to
**every** field of that record, mapping the (camelCase) Ballerina field to its
exact database column name (conventionally snake_case).

Apply this rule to **all** fields, always:
- Do it even if a field's name already matches its column name.
- Do it even if no query has been written yet.

The SQL client binds columns to record fields **by exact name**, so annotating
every field with its column name guarantees the mapping is always correct.

```ballerina
import ballerina/sql;

type Customer record {|
    @sql:Column {name: "customer_id"}
    int customerId;
    @sql:Column {name: "customer_name"}
    string customerName;
|};
```
