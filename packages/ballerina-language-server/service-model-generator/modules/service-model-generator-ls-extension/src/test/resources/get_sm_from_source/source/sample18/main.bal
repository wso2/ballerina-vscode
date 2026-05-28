import ballerina/file;

listener file:Listener fileListener = new ({
    path: "/tmp",
    recursive: false
});

service on fileListener {
    remote function onCreate(file:FileEvent event) {

    }
}
