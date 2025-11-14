import ballerina/http;
import ballerina/sql;

public listener http:Listener config = new (check int:fromString(http_port));

service /mule3 on config {
    resource function get .(http:Request request) returns http:Response|error {
        Context ctx = {inboundProperties: {request, response: new}};

        // database operation
        sql:ParameterizedQuery dbQuery0 = `SELECT * FROM users;`;
        stream<Record, sql:Error?> dbStream0 = MySQL_Configuration->query(dbQuery0);
        Record[] dbSelect0 = check from Record _iterator_ in dbStream0
            select _iterator_;
        ctx.payload = dbSelect0;

        ctx.inboundProperties.response.setPayload(ctx.payload);
        return ctx.inboundProperties.response;
    }
}
