import ballerinax/cdc;
import ballerinax/mssql;
import ballerinax/mssql.cdc.driver as _;

listener mssql:CdcListener mssqlCdcListener = new (database = {hostname: "localhost", port: 1433, username: "admin", password: "password", databaseNames: ["mydb1"]});

service cdc:Service on mssqlCdcListener {
    remote function onUpdate(AfterEntrySchema beforeEntry, AfterEntrySchema afterEntry, string tableName) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
