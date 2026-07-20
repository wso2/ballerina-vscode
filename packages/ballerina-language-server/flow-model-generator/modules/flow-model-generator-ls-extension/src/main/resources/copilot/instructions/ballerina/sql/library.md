# Ballerina SQL Library Instructions

The `ballerina/sql` library provides the core types, errors, and annotations for
relational database access. Database-specific clients (`ballerinax/mysql`,
`ballerinax/postgresql`, `ballerinax/mssql`, etc.) build on top of it.

## Mapping record fields to database columns with `@sql:Column`

When a SQL query result is mapped into a Ballerina record, the client matches
each database column to a record field **by name**. Ballerina record fields use
camelCase by convention, while database columns are commonly snake_case, so the
names frequently do not match.

Use the `@sql:Column {name: "<column_name>"}` annotation to map a record field to
its database column **whenever the field name differs from the column name**:

```ballerina
import ballerina/sql;

type Customer record {|
    @sql:Column {name: "customer_id"}
    int customerId;
    @sql:Column {name: "customer_name"}
    string customerName;
|};
```

A field whose name already matches its column exactly (e.g. a column `id` mapped
to a field `id`) does not need the annotation.
