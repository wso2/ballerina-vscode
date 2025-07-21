type MyTypeInput record {|
    string name1;
    string name2;
|};

service class MyTypeObj1 {
    function init() {
    }

    resource function get name1() returns string {
        do {
            panic error("Unimplemented function");
        } on fail error err {
            //handle error
            panic error("Unhandled error");
        }
    }
}
