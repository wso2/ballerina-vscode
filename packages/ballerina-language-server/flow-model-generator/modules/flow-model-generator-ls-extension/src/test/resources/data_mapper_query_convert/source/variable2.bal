import ballerina/http;

type MyType record {|
    int[] k;
|};

type MyType2 record {|
    record {|
        int p;
        record {|
            int r;
        |} q;
    |}[] arr;
    record {|
        record {|
            int Ccc;
        |} Bb;
    |} Aa;
|};

listener http:Listener httpDefaultListener = http:getDefaultListener();

@http:ServiceConfig {

}
service / on httpDefaultListener {
    resource function get greeting() returns error|json|http:InternalServerError {

        MyType2 var2;
        MyType2 var3 = {arr: var2.arr};

    }
}

