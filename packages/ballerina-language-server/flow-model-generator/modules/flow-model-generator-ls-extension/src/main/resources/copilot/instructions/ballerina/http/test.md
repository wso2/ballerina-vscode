# Test Generation Instructions for HTTP Services

Generated test code following these strict guidelines:

## Library Requirements
- Search for `ballerina/test` library if you still haven't done so to get information on the core test framework and adhere to instructions provided there in addition to these.

## Test File Structure:
- Start with necessary imports, including `ballerina/http`, `ballerina/test` any other imports that is required.
- Define an HTTP Client at the module level named `clientEp`
- Organize tests logically: create, read, update, delete
- Create helper functions only when improving readability
- Don't redefine existing types from the codebase, reuse them.

## Test Function Generation:
- MUST generate AT LEAST ONE test case for EACH resource function
- Ensure each test function returns `error?` and use `check` keyword for error propagation.
- Use proper HTTP method invocation syntax as per the provided example.
    - GET:
        - Ballerina Resource -> resource function get books/[string isbn]() returns Book|Error
        - Resource invocation -> {Type} {variableName} = check clientEp->/books/[{isbn}]();
        - Example -> Book book = check clientEp->/books/[12345678]();
    - POST:
        - Ballerina Resource -> resource function post books(@http:Payload Book newBook) returns string|error
        - Resource invocation -> {Type} {variableName} = clientEp->/books.post({payload});
        - Example -> Book book = check clientEp->/books.post(definedBook);
    - PUT:
        - Ballerina Resource -> resource function put books/[string isbn](@http:Payload Book updatedBook, @http:Query string name) returns string|error
        - Resource invocation -> {Type} {variableName} = clientEp->/books/[{isbn}].put({payload}, name = {value});
        - Example -> Book book = check clientEp->/books/isbn-number.put(definedUpdatedBook, name = "BookName");
    - DELETE:
        - Ballerina Resource -> resource function delete books(@http:Query string isbn) returns string|error
        - Resource invocation -> {Type} {variableName} = clientEp->/books.delete(isbn = {value});
    - PATCH:
        - Ballerina Resource -> resource function patch books/[string isbn](@http:Payload Book updatedBook, @http:Query string name) returns string|error
        - Resource invocation -> {Type} {variableName} = clientEp->/books/[{isbn}].patch({payload}, name = {value});
- For non-annotated resource function parameters, treat records as body params and others as query params.
- When generating negative test cases, focus only on scenarios that are explicitly handled in the existing code base and avoid generating tests for theoretical edge cases not addressed in the current codebase.

## Response Handling:
- Use direct data binding for positive test cases based on source code or type schemas.
- For negative test cases, use `http:Response` variables and check status codes.
- Always assign responses to variables with specific types.
