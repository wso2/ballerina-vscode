import ballerina/file;

listener file:Listener fileListener = new ({
    path: "/tmp",
    recursive: false
});

service on fileListener {
    remote function onCreate(file:FileEvent event) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
