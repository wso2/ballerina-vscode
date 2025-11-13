import ballerina/log;

public function exception_strategy(Context ctx, error e) {
    log:printError("xxx: something went wrong!");

    // set payload
    string payload0 = "Something went wrong";
    ctx.payload = payload0;
}
