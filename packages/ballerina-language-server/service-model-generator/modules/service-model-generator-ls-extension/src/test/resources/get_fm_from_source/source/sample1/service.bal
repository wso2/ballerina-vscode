import ballerina/http;

service /api on httpListener {
   function init() {
   }

   function hello(string name) returns string {
       return "Hello, World!";
   }
}
