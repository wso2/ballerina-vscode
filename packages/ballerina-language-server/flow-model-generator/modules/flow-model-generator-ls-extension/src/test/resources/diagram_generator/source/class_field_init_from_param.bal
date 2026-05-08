import ballerina/http;

http:Client cl = check new("localhost:9090");

class className {
    final http:Client fieldCls;

    function init(http:Client cl) {
        self.fieldCls = cl;
    }

    function fn() {
        
    }
}
