// Test file for workspace project
function internalHelper() returns string {
    return "internal";
}

public function publicMethod() returns string {
    // This should work - calling internal function within same package
    return internalHelper();
}
