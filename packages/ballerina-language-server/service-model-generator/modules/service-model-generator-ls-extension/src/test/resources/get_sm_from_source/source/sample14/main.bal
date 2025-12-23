import ballerinax/cdc;
import ballerinax/mssql;
import ballerinax/mssql.cdc.driver as _;

listener mssql:CdcListener mssqlCdcListener = new (database = {hostname: "localhost", port: 1433, username: "admin", password: "admin", databaseNames: ["mydb1"]});

@cdc:ServiceConfig {
    tables: "db1.schema1.t1"
}

service cdc:Service on mssqlCdcListener {
    remote function onRead(AfterEntrySchema afterEntry, string tableName) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }

    remote function onUpdate(record {} beforeEntry, record {} afterEntry, string tableName) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
