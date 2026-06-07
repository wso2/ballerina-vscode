# Writing Test cases

- Tests should only be inside the `tests` directory of the package.
- You should always import `ballerina/test` library in the test files.
- Each test function should be annotated with `@test:Config {}` annotation.
  Example:
```
import ballerina/test;

// Test function
@test:Config {}
function testFunction() {
    test:assertTrue(true, msg = "Failed!");
}
```
- Prefer to have the test functions return `error?` and use `check` keyword in the cases where you don't care about the error details, test will automatically fail if the test function returns an error.
- Utilize type narrowing to avoid unneccessary type casting and assert only the necessary fields.
- Use only `test:assertEquals(actualVar, expectedVar, msg)` for assertions.
- Provide clear and descriptive messages for each assertion.
- When asserting decimals, use `d` at the end of the decimal literal (e.g., 123.45d).
- Create helper functions only when improving readability.
- Don't redefine existing types from the codebase, reuse them.

- You must use dependsOn property in `@test:Config` annotation to control test execution order. This will be useful if the test scenario requires certain tests to be executed before others.

```
import ballerina/io;
import ballerina/test;

@test:Config { 
    dependsOn: [testFunction2] }
function testFunction1() {
    io:println("I'm getting executed second!");
    test:assertTrue(true, msg = "Failed!");
}

@test:Config {}
function testFunction2() {
    io:println("I'm getting executed first!");
    test:assertTrue(true, msg = "Failed!");
}

@test:Config { 
    dependsOn: [testFunction1] }
function testFunction3() {
    io:println("I'm getting executed third!");
    test:assertTrue(true, msg = "Failed!");
}

```
- Use `@test:BeforeSuite` and `@test:AfterSuite` annotations for setup and teardown functions that run before and after all tests in the module respectively.

```
@test:BeforeSuite
function beforeSuit() {
    // initialize or execute pre-requisites
}

@test:AfterSuite
function afterSuit() {
    // tear-down
}
```
