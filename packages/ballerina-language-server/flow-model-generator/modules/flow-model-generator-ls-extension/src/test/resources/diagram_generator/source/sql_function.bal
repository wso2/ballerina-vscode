import ballerina/sql;

function function1(string a1) {
    do {
        stream<record {|anydata...;|}, sql:Error?> streamRowtypeSqlError = mssqlClient->query(`select * from users`);

    } on fail {

    }
}
