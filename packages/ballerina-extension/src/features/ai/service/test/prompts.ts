// Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com/) All Rights Reserved.

// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at

// http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied. See the License for the
// specific language governing permissions and limitations
// under the License.

import { TestGenerationRequest1, ProjectSource, Diagnostic } from "./test";
import { ModelMessage } from "ai";
import { flattenProjectToText, getExternalTypesAsJsonSchema, getTypesAsJsonSchema, getDiagnosticsAsText, extractSectionToFix } from "./utils";

// ==============================================
//            SYSTEM PROMPTS
// ==============================================

export function getServiceTestGenerationSystemPrompt(): string {
    return `You are an expert Ballerina developer specializing in test automation. Your task is to analyze Ballerina source code and generate comprehensive and compilable test cases that cover functionality, edge cases, and error scenarios.`;
}

export function getServiceTestGenAssistant1Prompt(): string {
    return `I have analyzed both the Ballerina service implementation and the OpenAPI component definitions. I understand:
  - All HTTP endpoints and their respective methods
  - The request/response payload structures
  - External type definitions from OpenAPI components
  - How the service uses the OpenAPI-defined types
  - Parameter handling (path params, query params)
  - Service configurations and listener setup
  - Error scenarios and status code mappings
  - External service dependencies

I am ready to generate appropriate test cases for this service.
`;
}

export function getServiceTestDiagnosticsSystemPrompt(): string {
    return `You are an expert Ballerina developer, code debugger and fixer with deep knowledge of JSON schemas and test generation. Your task is to analyze the provided Ballerina codebase, JSON schema, generated test file, and its diagnostics, then provide corrected test code that resolves all issues. Follow these guidelines:

1. Carefully review each diagnostic and its corresponding line number.
2. Identify the root cause of each issue.
3. Apply best practices and maintain code style consistency when making corrections.
4. Provide the full corrected code, not just the changed lines.
5. If any fixes introduce new variables or functions, ensure they're properly integrated.
6. Verify that your fixes don't introduce new issues.`;
}

export function getFunctionTestGenerationSystemPrompt(): string {
    return `You are an expert Ballerina developer, code debugger and fixer with deep knowledge of JSON schemas and test generation. Your task is to analyze the provided Ballerina codebase, JSON schema, generated test file, and its diagnostics, then provide corrected test code that resolves all issues. Follow these guidelines:

1. Carefully review each diagnostic and its corresponding line number.
2. Identify the root cause of each issue.
3. Apply best practices and maintain code style consistency when making corrections.
4. Provide the full corrected code, not just the changed lines.
5. If any fixes introduce new variables or functions, ensure they're properly integrated.
6. Verify that your fixes don't introduce new issues.`;
}

// ==============================================
//            SERVICE TEST GEN PROMPTS
// ==============================================

export function getServiceTestGenUser1Prompt(sourceCode: string, typeSchemas: string): string {
    return `I will provide you with:
  1. A Ballerina service implementation
  2. OpenAPI component specifications containing type definitions used by the service

Please carefully analyze and understand:
  - The HTTP endpoints and their methods (GET, POST, PUT, DELETE, PATCH, etc.)
  - Request/response payload structures and types
  - External type definitions from the OpenAPI components section
  - Mapping between service types and OpenAPI-defined types
  - Path parameters and query parameters
  - Service configuration and listener details
  - Error handling and response status codes
  - Service dependencies and external service calls

1. Ballerina Source Code (The first line of the source contains the commented file path and name):
[BEGIN_SOURCE]
${sourceCode}
[END_SOURCE]


2. Type Schemas for External Libraries:
[BEGIN_SCHEMAS]
${typeSchemas}
[END_SCHEMAS]
`;
}

export function getServiceTestGenUser2Prompt(serviceName: string): string {
    return `Generate comprehensive test cases for ALL resource functions in the Ballerina service named as ${serviceName}. Your response MUST follow this exact structure:

Note: In the response don't mention the fact that you are following a defined structure. And don't break the response into sections, just give the response in a natuaral flow.

1. CONFIGURATION GENERATION (enclosed in <config> tags and use \`\`\`toml{content}\`\`\`);
Generate a Config.toml for the configurable variables in the source code
Note: If there are no any configurable variables just ignore this section

2. TEST IMPLEMENTATION (enclosed in <code> tags and use \`\`\`ballerina{code}\`\`\`):
Generated test code following these strict guidelines:

A. Test File Structure:
  - Start with necessary imports, including \`ballerina/http\`, \`ballerina/test\` any other imports that is required.
  - Define an HTTP Client at the module level named \`clientEp\`
  - Include @test:BeforeSuite and @test:AfterSuite if needed
  - Organize tests logically: create, read, update, delete
  - Create helper functions only when improving readability
  - Don't redefine existing types from OpenAPI components

B. Test Function Generation:
  - MUST generate AT LEAST ONE test case for EACH resource function
  - Use \`@test:Config {}\` annotation for each test function, with dependsOn property when applicable.
  - Ensure each test function returns \`error?\` and use \`check\` keyword for error propagation.
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
      - Example -> Book book = check clientEp->/books/isbn\-number.put(definedUpdatedBook, name = "BookName");
    - DELETE:
      - Ballerina Resource -> resource function delete books(@http:Query string isbn) returns string|error
      - Resource invocation -> {Type} {variableName} = clientEp->/books.delete(isbn = {value});
    - PATCH:
      - Ballerina Resource -> resource function patch books/[string isbn](@http:Payload Book updatedBook, @http:Query string name) returns string|error
      - Resource invocation -> {Type} {variableName} = clientEp->/books/[{isbn}].patch({payload}, name = {value});
  - For non-annotated resource function parameters, treat records as body params and others as query params.
  - When generating negative test cases, focus only on scenarios that are explicitly handled in the existing code base and avoid generating tests for theoretical edge cases not addressed in the current codebase.

C. Response Handling:
  - Use direct data binding for positive test cases based on source code or type schemas.
  - For negative test cases, use \`http:Response\` variables and check status codes.
  - Check for \`x-ballerina-type\` extension in type schemas and if those types were used in the code, include necessary imports.
  - Always assign responses to variables with specific types.

D. Assertions and Validation:
  - Use only \`test:assertEquals(actualVar, expectedVar, msg)\` for assertions.
    - When asserting decimals, use \`d\` at the end of the decimal literal (e.g., 123.45d).
  - Provide clear and descriptive messages for each assertion.

E. Code Quality:
  - Follow Ballerina naming conventions and best practices.
  - Add comments explaining the purpose of each test and any complex logic.
  - Ensure the generated code is comprehensive, robust, maintainable, and clear.

3. COMPLETION STATUS (enclosed in <status> tags):
Indicate "DONE" if all resource functions are covered, or "CONTINUE" if more tests are pending.

Important Notes:
- Generate tests for EVERY single resource function in the service
- If response length limits prevent complete coverage, generate as many tests as possible
- Remaining tests can be requested in subsequent prompts
- If there are any remaining tests to be generated don't mention that as a comment as part of the generated code.
`;
}

export function getServiceTestGenUser2WithPlanPrompt(serviceName: string, testPlan: string): string {
    return `Generate comprehensive test cases for ALL resource functions in the Ballerina service named as ${serviceName}, based on the provided test plan.

The test implementation MUST:
  1. Address each test scenario in the test plan sequentially
  2. Implement exact test conditions specified in the test plan
  3. Validate all expected outcomes mentioned in the test plan
  4. Follow any specific test data requirements provided in the test plan
  5. Not deviate from or add scenarios not mentioned in the test plan

[BEGIN_TEST_PLAN]
${testPlan}
[END_TEST_PLAN]

1. CONFIGURATION GENERATION (enclosed in <config> tags and use \`\`\`toml{content}\`\`\`);
Generate a Config.toml for the configurable variables in the source code
Note: If there are no any configurable variables just ignore this section

2. TEST IMPLEMENTATION (enclosed in <code> tags and use \`\`\`ballerina{code}\`\`\`):
Generated test code following these strict guidelines:

A. Test File Structure:
  - Start with necessary imports, including \`ballerina/http\`, \`ballerina/test\` any other imports that is required.
  - Define an HTTP Client at the module level named \`clientEp\`
  - Include @test:BeforeSuite and @test:AfterSuite if needed
  - Organize tests logically: create, read, update, delete
  - Create helper functions only when improving readability
  - Don't redefine existing types from OpenAPI components

B. Test Function Generation:
  - MUST strictly follow the test scenarios outlined in the provided test plan
  - Generate individual test functions for EACH test scenario mentioned in the test plan
  - Name test functions to clearly indicate which test plan scenario they cover
  - Include comments referencing the specific test plan scenario being implemented
  - Ensure test implementation covers all acceptance criteria mentioned in each test scenario
  - For each test scenario in the test plan:
    - Implement the exact test conditions specified
    - Validate all expected outcomes mentioned
    - Handle any specific error cases noted
    - Follow any specific test data requirements
  - Use \`@test:Config {}\` annotation for each test function, with dependsOn property when applicable
  - Ensure each test function returns \`error?\` and use \`check\` keyword for error propagation
  - Use proper HTTP method invocation syntax as per the provided example
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
      - Example -> Book book = check clientEp->/books/isbn\-number.put(definedUpdatedBook, name = "BookName");
    - DELETE:
      - Ballerina Resource -> resource function delete books(@http:Query string isbn) returns string|error
      - Resource invocation -> {Type} {variableName} = clientEp->/books.delete(isbn = {value});
    - PATCH:
      - Ballerina Resource -> resource function patch books/[string isbn](@http:Payload Book updatedBook, @http:Query string name) returns string|error
      - Resource invocation -> {Type} {variableName} = clientEp->/books/[{isbn}].patch({payload}, name = {value});
  - For non-annotated resource function parameters, treat records as body params and others as query params
  - When generating negative test cases, implement only those scenarios explicitly mentioned in the test plan

C. Response Handling:
  - Use direct data binding for positive test cases based on source code or type schemas.
  - For negative test cases, use \`http:Response\` variables and check status codes.
  - Check for \`x-ballerina-type\` extension in type schemas and if those types were used in the code, include necessary imports.
  - Always assign responses to variables with specific types.

D. Assertions and Validation:
  - Use only \`test:assertEquals(actualVar, expectedVar, msg)\` for assertions.
    - When asserting decimals, use \`d\` at the end of the decimal literal (e.g., 123.45d).
  - Provide clear and descriptive messages for each assertion.

E. Code Quality:
  - Follow Ballerina naming conventions and best practices.
  - Add comments explaining the purpose of each test and any complex logic.
  - Ensure the generated code is comprehensive, robust, maintainable, and clear.

3. COMPLETION STATUS (enclosed in <status> tags):
Indicate "DONE" if all resource functions are covered, or "CONTINUE" if more tests are pending.

Important Notes:
- Generate tests for EVERY single resource function in the service
- If response length limits prevent complete coverage, generate as many tests as possible
- Remaining tests can be requested in subsequent prompts
- If there are any remaining tests to be generated don't mention that as a comment as part of the generated code.
`;
}

export function getServiceTestDiagnosticsAssistant1Prompt(): string {
    return `Thank you for providing the Ballerina codebase and JSON schema. I've carefully analyzed both components and am now prepared to receive the generated test file and its diagnostics. This information will allow me to understand the context fully and identify any inconsistencies or issues between the test file, the codebase, and the schema.

Please proceed with sharing the generated test file and the diagnostics in your next message. Once I have all the information, I'll be able to provide a comprehensive fix for the test file, ensuring it aligns with the codebase and conforms to the JSON schema.
`;
}

export function getServiceTestDiagnosticsUser2Prompt(diagnostics: string, sourceCode: string): string {
    return `Here's the second part of the information:

3. Generated Test File:
[GENERATED_TEST_FILE]
\`\`\`ballerina
${sourceCode}
\`\`\`
[GENERATED_TEST_FILE]

4. Diagnostics:
[BEGIN_DIAGNOSTICS]
${diagnostics}
[END_DIAGNOSTICS]

5. StatusCode responses
- http:Continue
- http:SwitchingProtocols
- http:Processing
- http:EarlyHints
- http:Ok
- http:Created
- http:Accepted
- http:NonAuthoritativeInformation
- http:NoContent
- http:ResetContent
- http:PartialContent
- http:MultiStatus
- http:AlreadyReported
- http:IMUsed
- http:MultipleChoices
- http:MovedPermanently
- http:Found
- http:SeeOther
- http:NotModified
- http:UseProxy
- http:TemporaryRedirect
- http:PermanentRedirect
- http:BadRequest
- http:Unauthorized
- http:PaymentRequired
- http:Forbidden
- http:NotFound
- http:MethodNotAllowed
- http:NotAcceptable
- http:ProxyAuthenticationRequired
- http:RequestTimeout
- http:Conflict
- http:Gone
- http:LengthRequired
- http:PreconditionFailed
- http:PayloadTooLarge
- http:UriTooLong
- http:UnsupportedMediaType
- http:RangeNotSatisfiable
- http:ExpectationFailed
- http:MisdirectedRequest
- http:UnprocessableEntity
- http:Locked
- http:FailedDependency
- http:TooEarly
- http:PreconditionRequired
- http:UnavailableDueToLegalReasons
- http:UpgradeRequired
- http:TooManyRequests
- http:RequestHeaderFieldsTooLarge
- http:InternalServerError
- http:NotImplemented
- http:BadGateway
- http:ServiceUnavailable
- http:GatewayTimeout
- http:HttpVersionNotSupported
- http:VariantAlsoNegotiates
- http:InsufficientStorage
- http:LoopDetected
- http:NotExtended
- http:NetworkAuthorizationRequired
- http:NetworkAuthenticationRequired

Task:
Analyze the provided test file, diagnostics and the status code responses, then produce a corrected version of the entire test file that resolves all identified issues. Ensure that the fixed test file is compatible with the given Ballerina codebase and JSON schema.

Key Considerations:
1. Data Binding Rules:
   a. For records that contains Ballerina status code response as inclusions (e.g., \`*http:Ok\`, \`*http:Created\`, \`*http:NotFound\`), bind data to the \`body\` field:
      Example:
      \`\`\`ballerina
      type RecordType record {|
          *http:Ok;
          Body body;
      |};

      // Service code
      service /test on new http:Listener(8080) {
        resource function get name() returns RecordType|error {
          return {
            // values
            body: {
              // values
            }
          }
        }
      }

      // When data binding,
      final http:Client clientEP = check new ("http://localhost:8080/test");
      Body body = check clientEP->/name;
      \`\`\`
      Bind to 'Body' instead of 'RecordType'.

   b. For pure Ballerina status code responses, bind data to \`http:Response\`.

   c. In positive test cases, always bind data directly to the expected type(Except for the above mentioned cases).

2. Error Handling: Use check expressions instead of error unions, as the function returns an error type.

3. Make sure to remove any unused imports.

4. Maintain Existing Correctness: When fixing issues, ensure that you don't introduce new problems or revert correct implementations.

Output:
Provide the complete, corrected test file with all issues resolved, incorporating the above considerations. Include clear comments explaining significant changes or complex logic.

Additional Instructions:
- Prioritize code correctness and adherence to Ballerina best practices.
- Ensure all imports are correct and necessary.
- Verify that all test cases are properly implemented and cover the required scenarios.
- Double-check that the corrected code addresses all points in the diagnostics.
`;
}

// ==============================================
//           FUNCTION TEST GEN PROMPTS
// ==============================================

export function getFunctionTestGenUserPrompt(resourceFunction: string, serviceCode: string, testPlan: string, typeSchemas: string): string {
    return `Generate comprehensive test cases for the below resource function, based on the provided test plan, service implementation and types.:

[BEGIN_RESOURCE_FUNCTION]
${resourceFunction}
[END_RESOURCE_FUNCTION]

Service Implementation Context:
[BEGIN_SERVICE_CODE]
${serviceCode}
[END_SERVICE_CODE]

Types Declared in the Source as Json Schema:
[BEGIN_SCHEMAS]
${typeSchemas}
[END_SCHEMAS]

The test implementation MUST:
  1. Address each test scenario in the test plan sequentially
  2. Implement exact test conditions specified in the test plan
  3. Validate all expected outcomes mentioned in the test plan
  4. Follow any specific test data requirements provided in the test plan
  5. Not deviate from or add scenarios not mentioned in the test plan

[BEGIN_TEST_PLAN]
${testPlan}
[END_TEST_PLAN]

1. CONFIGURATION GENERATION (enclosed in <config> tags and use \`\`\`toml{content}\`\`\`);
Generate a Config.toml for the configurable variables in the source code
Note: If there are no any configurable variables just ignore this section

2. TEST IMPLEMENTATION (enclosed in <code> tags and use \`\`\`ballerina{code}\`\`\`):
Generated test code following these strict guidelines:

A. Test File Structure:
  - Start with necessary imports, including \`ballerina/http\`, \`ballerina/test\` any other imports that is required
  - Define an HTTP Client at the module level named \`clientEp\`
  - Create helper functions only when improving readability
  - Don't redefine any additional record types

B. Test Function Generation:
  - MUST strictly follow the test scenarios outlined in the provided test plan
  - Generate individual test functions for EACH test scenario mentioned in the test plan
  - Name test functions to clearly indicate which test plan scenario they cover
  - Include comments referencing the specific test plan scenario being implemented
  - Ensure test implementation covers all acceptance criteria mentioned in each test scenario
  - For each test scenario in the test plan:
    - Implement the exact test conditions specified
    - Validate all expected outcomes mentioned
    - Handle any specific error cases noted
    - Follow any specific test data requirements
  - Use \`@test:Config {}\` annotation for each test function, with dependsOn property when applicable
  - Ensure each test function returns \`error?\` and use \`check\` keyword for error propagation
  - Use proper HTTP method invocation syntax as per the provided example
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
      - Example -> Book book = check clientEp->/books/isbn\-number.put(definedUpdatedBook, name = "BookName");
    - DELETE:
      - Ballerina Resource -> resource function delete books(@http:Query string isbn) returns string|error
      - Resource invocation -> {Type} {variableName} = clientEp->/books.delete(isbn = {value});
    - PATCH:
      - Ballerina Resource -> resource function patch books/[string isbn](@http:Payload Book updatedBook, @http:Query string name) returns string|error
      - Resource invocation -> {Type} {variableName} = clientEp->/books/[{isbn}].patch({payload}, name = {value});
  - For non-annotated resource function parameters, treat records as body params and others as query params
  - When generating negative test cases, implement only those scenarios explicitly mentioned in the test plan
  - Do not generate types if the type is already defined in the schemas.
  - NEVER implement custom mock classes; if mocking is necessary, use Ballerina's built-in test mocking syntax:
    \`\`\`ballerina
    // Create mock client
    clientEndpoint = test:mock(http:Client);
    
    // Stub method behavior
    test:prepare(clientEndpoint).when("methodName").thenReturn(mockResponse());
    
    // Stub with specific arguments if needed
    test:prepare(clientEndpoint).when("methodName").withArguments("/path").thenReturn(mockResponse());
    \`\`\`

C. Response Handling:
  - Use direct data binding for positive test cases based on source code or type schemas
  - For negative test cases, use \`http:Response\` variables and check status codes
  - Check for \`x-ballerina-type\` extension in type schemas and if those types were used in the code, include necessary imports
  - Always assign responses to variables with specific types

D. Assertions and Validation:
  - Use only \`test:assertEquals(actualVar, expectedVar, msg)\` for assertions
    - When asserting decimals, use \`d\` at the end of the decimal literal (e.g., 123.45d)
  - Provide clear and descriptive messages for each assertion

E. Code Quality:
  - Follow Ballerina naming conventions and best practices
  - Add comments explaining the purpose of each test and any complex logic
  - Ensure the generated code is comprehensive, robust, maintainable, and clear
`;
}

export function getFunctionTestGenUserSubsequentPrompt(resourceFunction: string, serviceCode: string, testPlan: string, typeSchemas: string, existingTestFile: string): string {
    return `Please generate additional unit tests for the following Ballerina function, extending the existing test suite.

FUNCTION TO TEST: ${resourceFunction}

SERVICE CODE:
${serviceCode}

TEST PLAN:
${testPlan}

TYPE SCHEMAS:
${typeSchemas}

EXISTING TEST FILE:
${existingTestFile}

Requirements:
- Extend the existing test suite with additional test cases
- Follow the test plan for new scenarios
- Maintain consistency with existing test structure
- Add new test cases without duplicating existing ones
- Include proper assertions and test data

Please provide the complete updated test file content.`;
}

export function getFunctionTestGenUserDiagnosticPrompt(resourceFunction: string, serviceCode: string, testPlan: string, typeSchemas: string, existingTestFile: string, sectionToFix: string, diagnostics: string): string {
    return `Fix Generated Ballerina Test Code based on Diagnostics

Project Source Code:
[BEGIN_PROJECT_SOURCE]
${serviceCode}
[END_PROJECT_SOURCE]

Types Declared in the Source as Json Schema:
[BEGIN_SCHEMAS]
${typeSchemas}
[END_SCHEMAS]

Complete Test File:
[BEGIN_COMPLETE_TEST_FILE]
${existingTestFile}
[END_COMPLETE_TEST_FILE]

Part of Test File Needing Fixes:
[BEGIN_SECTION_TO_FIX]
${sectionToFix}
[END_SECTION_TO_FIX]

Diagnostics:
[BEGIN_DIAGNOSTICS]
${diagnostics}
[END_DIAGNOSTICS]

Task: Analyze the provided test file and diagnostics, then fix ONLY the section identified in SECTION_TO_FIX. Return only the corrected version of this section.

Key Considerations:
1. Data Binding Rules:
   a. For records that contain Ballerina status code response as inclusions (e.g., \`*http:Ok\`, \`*http:Created\`, \`*http:NotFound\`), bind data to the \`body\` field:
      Example:
      \`\`\`ballerina
      type RecordType record {|
          *http:Ok;
          Body body;
      |};

      // Service code
      service /test on new http:Listener(8080) {
        resource function get name() returns RecordType|error {
          return {
            // values
            body: {
              // values
            }
          }
        }
      }

      // When data binding,
      final http:Client clientEP = check new ("http://localhost:8080/test");
      Body body = check clientEP->/name;
      \`\`\`
      Bind to 'Body' instead of 'RecordType'.

   b. For pure Ballerina status code responses, bind data to \`http:Response\`.

   c. In positive test cases, always bind data directly to the expected type (except for the above mentioned cases).

2. Error Handling: Use check expressions instead of error unions, as the function returns an error type.

3. Make sure to identify and fix any unused imports.

4. Maintain Existing Correctness: When fixing issues, ensure that you don't introduce new problems or revert correct implementations.

Available Status Code Responses:
- http:Continue
- http:SwitchingProtocols
- http:Processing
- http:EarlyHints
- http:Ok
- http:Created
- http:Accepted
- http:NonAuthoritativeInformation
- http:NoContent
- http:ResetContent
- http:PartialContent
- http:MultiStatus
- http:AlreadyReported
- http:IMUsed
- http:MultipleChoices
- http:MovedPermanently
- http:Found
- http:SeeOther
- http:NotModified
- http:UseProxy
- http:TemporaryRedirect
- http:PermanentRedirect
- http:BadRequest
- http:Unauthorized
- http:PaymentRequired
- http:Forbidden
- http:NotFound
- http:MethodNotAllowed
- http:NotAcceptable
- http:ProxyAuthenticationRequired
- http:RequestTimeout
- http:Conflict
- http:Gone
- http:LengthRequired
- http:PreconditionFailed
- http:PayloadTooLarge
- http:UriTooLong
- http:UnsupportedMediaType
- http:RangeNotSatisfiable
- http:ExpectationFailed
- http:MisdirectedRequest
- http:UnprocessableEntity
- http:Locked
- http:FailedDependency
- http:TooEarly
- http:PreconditionRequired
- http:UnavailableDueToLegalReasons
- http:UpgradeRequired
- http:TooManyRequests
- http:RequestHeaderFieldsTooLarge
- http:InternalServerError
- http:NotImplemented
- http:BadGateway
- http:ServiceUnavailable
- http:GatewayTimeout
- http:HttpVersionNotSupported
- http:VariantAlsoNegotiates
- http:InsufficientStorage
- http:LoopDetected
- http:NotExtended
- http:NetworkAuthorizationRequired
- http:NetworkAuthenticationRequired

Output:
Provide ONLY the fixed code section. Your response should be enclosed in <code> tags and use \`\`\`ballerina{code}\`\`\` format.
`;
}

// ==============================================
//            MESSAGE CREATION FUNCTIONS
// ==============================================

export function createServiceTestGenMessages(request: TestGenerationRequest1): ModelMessage[] {
    const serviceTestGenUser1 = createServiceTestGenUser1Message(request);

    if (!request.diagnostics || !request.existingTests) {
        const serviceTestGenAssistant1 = createServiceTestGenAssistant1Message();
        const serviceTestGenUser2 = createServiceTestGenUser2Message(request);
        return [serviceTestGenUser1, serviceTestGenAssistant1, serviceTestGenUser2];
    } else {
        const serviceTestDiagnosticsAssistant1 = createServiceTestDiagnosticsAssistant1Message(request);
        const serviceTestDiagnosticsUser2 = createServiceTestDiagnosticsUser2Message(request);
        return [serviceTestGenUser1, serviceTestDiagnosticsAssistant1, serviceTestDiagnosticsUser2];
    }
}

export function createServiceTestGenUser1Message(request: TestGenerationRequest1): ModelMessage {
    if (!request.openApiSpec) {
        throw new Error("OpenAPI specification is required for test generation.");
    }

    const flattenedProject = flattenProjectToText(request.projectSource);
    const typeSchemas = getExternalTypesAsJsonSchema(request.openApiSpec);

    const prompt = getServiceTestGenUser1Prompt(flattenedProject, typeSchemas);

    return {
        role: "user",
        content: prompt,
        providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
        },
    };
}

export function createServiceTestGenAssistant1Message(): ModelMessage {
    return {
        role: "assistant",
        content: getServiceTestGenAssistant1Prompt()
    };
}

export function createServiceTestGenUser2Message(request: TestGenerationRequest1): ModelMessage {
    const prompt = request.testPlan 
        ? getServiceTestGenUser2WithPlanPrompt(request.targetIdentifier, request.testPlan)
        : getServiceTestGenUser2Prompt(request.targetIdentifier);

    return {
        role: "user",
        content: prompt
    };
}

export function createServiceTestDiagnosticsAssistant1Message(request: TestGenerationRequest1): ModelMessage {
    return {
        role: "assistant",
        content: getServiceTestDiagnosticsAssistant1Prompt()
    };
}

export function createServiceTestDiagnosticsUser2Message(request: TestGenerationRequest1): ModelMessage {
    if (!request.diagnostics) {
        throw new Error("Diagnostics are required for test generation.");
    }
    if (!request.existingTests) {
        throw new Error("Existing tests are required for test generation.");
    }

    const diagnosticsText = getDiagnosticsAsText(request.diagnostics);
    const prompt = getServiceTestDiagnosticsUser2Prompt(diagnosticsText, request.existingTests);

    return {
        role: "user",
        content: prompt
    };
}

export function createFunctionTestGenMessages(request: TestGenerationRequest1): ModelMessage[] {
    const functionTestGenUser = createFunctionTestGenUserMessage(request);
    return [functionTestGenUser];
}

export function createFunctionTestGenUserMessage(request: TestGenerationRequest1): ModelMessage {
    if (!request.testPlan) {
        throw new Error("Test plan is required for function test generation.");
    }

    const flattenedProject = flattenProjectToText(request.projectSource);
    const typeSchemas = getTypesAsJsonSchema(request.openApiSpec || "");
    
    let prompt: string;
    if (!request.existingTests) {
        prompt = getFunctionTestGenUserPrompt(request.targetIdentifier, flattenedProject, request.testPlan, typeSchemas);
    } else {
        if (!request.diagnostics) {
            prompt = getFunctionTestGenUserSubsequentPrompt(request.targetIdentifier, flattenedProject, request.testPlan, typeSchemas, request.existingTests);
        } else {
            const diagnosticsText = getDiagnosticsAsText(request.diagnostics);
            const sectionToFix = extractSectionToFix(request.existingTests);
            prompt = getFunctionTestGenUserDiagnosticPrompt(request.targetIdentifier, flattenedProject, request.testPlan, typeSchemas, request.existingTests, sectionToFix, diagnosticsText);
        }
    }

    return {
        role: "user",
        content: prompt,
        providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
        },
    };
}
