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
    remote function onFileChange(ftp:WatchEvent fileEvent) {

    }
}
