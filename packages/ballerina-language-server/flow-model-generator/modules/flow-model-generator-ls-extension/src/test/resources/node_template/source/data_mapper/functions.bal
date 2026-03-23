function foo() {
    string stringResult = stringReturn();
    string stringResult1 = stringReturn();
}

function stringReturn() returns string {
    return "Hello";
}
