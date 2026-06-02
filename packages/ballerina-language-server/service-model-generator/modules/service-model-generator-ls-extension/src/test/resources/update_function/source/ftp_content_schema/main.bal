import ballerina/ftp;

listener ftp:Listener ftpListener = new ({
    protocol: ftp:FTP,
    host: "127.0.0.1",
    auth: {
        credentials: {
            username: "defaultUser",
            password: "defaultPassword"
        }
    },
    port: 21,
    path: "/"
});

service on ftpListener {
    remote function onFileJson(Order content, ftp:FileInfo fileInfo) returns error? {
        do {
        } on fail error err {
            // handle error
            return error("unhandled error", err);
        }
    }
}
