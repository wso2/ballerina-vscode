import ballerina/ftp;

listener ftp:Listener sftpListener = new (
    protocol = ftp:SFTP,
    host = "127.0.0.1",
    auth = {
        credentials: {
            username: "defaultUser",
            password: "defaultPassword"
        }
    },
    port = 22
);
