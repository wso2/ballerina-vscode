import ballerinax/cdc;
import ballerinax/mysql;
import ballerinax/mysql.cdc.driver as _;

listener mysql:CdcListener mysqlCdcListener = new (database = {hostname: "localhost", port: 3306, username: "root", password: "root", includedDatabases: ["mydb1"]});

@cdc:ServiceConfig {
    tables: "mydb1.t1"
}

service cdc:Service on mysqlCdcListener {
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
