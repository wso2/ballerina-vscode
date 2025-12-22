/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com) All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// ==============================================
//         CODE AND API DOCS SYNC PROMPT
// ==============================================

export function getCodeAndApiDocsSyncPrompt(ballerinaSourceFiles: string): string {
    return `## **Terminology**

- **Program**: The actual Ballerina program with API documentation and implementation.
- **Entity**: A function, resource, service, class, variable definition, or class method in the Ballerina program.
- **Nested Entity**: An entity (e.g., resource, class method) that is defined within another entity (e.g., service, class, function).
- **Implementation**: Only the Ballerina implementation of an entity without any API documentation.
- **API Documentation**: The API documentation provided in the Ballerina program that starts with \`#\`. Comments (\`//\`) are **not** considered API documentation and MUST be ignored entirely.
- **Extra Spaces**: Blank lines or white spaces.
- **Synchronized**: When an entity is synchronized, it means either there is no documentation present for the entity, or the implementation perfectly aligns with the documentation. If API documentation is present and synchronized, it means the documentation accurately describes the entity's behavior, function signatures, return types, and edge cases, matching the actual implementation. This ensures consistency and removes any discrepancies between the documented and actual behavior of the entity in the program.
- **Natural Programming Function**: A function where the implementation is described in a \`prompt\` parameter, and the function definition ends with \`= @np:LlmCall external;\`. For such functions, the \`prompt\` parameter's value is treated as the function's implementation. These function may have parameters other than \`prompt\`.
- **callLlm Invocation**: The \`callLlm\` function calls a Large Language Model (LLM) with the prompt passed as an argument and returns the result. The \`prompt\` argument describes the task that the function performs.

You are an expert Ballerina programmer tasked with verifying the synchronization between implementation and API documentation (**only if API documentation is present**) for entities in a Ballerina program.

## **Input:**

\`\`\`xml
${ballerinaSourceFiles}
\`\`\`

Follow these steps:

1. Iterate through each \`<file>\` tag within the \`<project>\`.
2. Each file represents a Ballerina program with line numbers for reference.
3. For each and every \`<file>\` tag:
   - Extract the filename from the \`filename\` attribute.
   - Identify all entities and nested entities that contains API documentation in the file.
   - Analyze the implementation and API documentation of each (identified in the step b) entities separately. Determine whether they are synchronized or not.
        - Do not assume or infer any details not explicitly mentioned in the API documentation or implementation.
        - If the entity is synchronized, ignore it.
   - If the entity is not synchronized:
        - Generate a response object with the following fields:
            - **\`id\`**: Unique string identifier for the issue.
            - **\`cause\`**: Reason why the implementation and API documentation are not synchronized.
            - **\`fileName\`**: Filename from the \`filename\` attribute in the \`<file>\` tag.
            - **Response fields to identify solutions for synchronizing the entity**:
                - **Synchronization Approach**
                    - Synchronization between the implementation and API documentation can be achieved in two ways:
                        - **Modifying the implementation** to align with the API documentation.
                        - **Updating the API documentation** to align with the implementation.
                    - **Key Step**: Analyze the implementation and API documentation of the entity to determine:
                        - Whether synchronization can be achieved by **changing the implementation only**.
                        - Whether synchronization can be achieved by **changing the API documentation only**.
                        - Every possible effort should be made to find a solution through implementation changes. **Only if no viable solution exists** (e.g., due to architectural mismatches, major feature gaps, or fundamental constraints), should **API documentation changes be considered as the sole approach** to achieve synchronization.
                        - Otherwise, provide **both solutions** (implementation changes and API documentation changes) to ensure synchronization.
                - **Changing the API documentation to synchronize with the implementation**:
                    - **\`startRowforDocChangedAction\`**: The start row number of the API documentation that needs to be changed to align with the implementation.
                    - **\`endRowforDocChangedAction\`**: The end row number of the API documentation that needs to be changed to align with the implementation.
                    - **\`docChangeSolution\`**: The corrected API documentation for the specified lines. This must include the complete lines from \`startRowforDocChangedAction\` to \`endRowforDocChangedAction\`, ensuring it contains only API documentation (no implementation or comments without \`#\`).
                - **If synchronization can be achieved by changing the implementation**, include the following fields:
                    - **Changing the implementation to synchronize with the API documentation**:
                        - **\`startRowforImplementationChangedAction\`**: The start row number of the implementation that needs to be changed to align with the API documentation.
                        - **\`endRowforImplementationChangedAction\`**: The end row number of the implementation that needs to be changed to align with the API documentation.
                        - **\`implementationChangeSolution\`**: The corrected implementation code for the specified lines. This must include the complete lines from \`startRowforImplementationChangedAction\` to \`endRowforImplementationChangedAction\`, ensuring it contains only implementation code (no API documentation or comments starting with \`#\`).
                - **If synchronization can not be achieved by changing the implementation**, include the following fields:
                        - **\`startRowforImplementationChangedAction\`**: -1
                        - **\`endRowforImplementationChangedAction\`**: -1
                        - **\`implementationChangeSolution\`**: empty string (\`""\`)
                - Always refer to the **exact line numbers** from the original program for:
                    - \`startRowforImplementationChangedAction\` and \`endRowforImplementationChangedAction\` (for implementation changes).
                    - \`startRowforDocChangedAction\` and \`endRowforDocChangedAction\` (for documentation changes).
                - Preserve all comments in the orginal program for \`implementationChangeSolution\` and \`docChangeSolution\`.
                - Ensure that \`implementationChangeSolution\` and \`docChangeSolution\` are **complete and syntactically correct** within their respective line ranges.
                - Do not include any extra spaces or comments in the \`implementationChangeSolution\` or \`docChangeSolution\`.
        - Validate the correctness of the response in following way:
            - **Exclude Responses for Missing or Empty API Documentation**:
                - If the \`cause\` in the response indicates issues such as:
                - Missing API documentation for an entity.
                - Empty API documentation (e.g., no content or only whitespace).
                - Missing implementation for an entity.
                - Empty implementation (e.g., no content or only whitespace).
                - **Remove such responses entirely** from the final \`results\` array. These issues are not related to synchronization between the program and its API documentation and do not require fixes within the existing implementation or documentation.
            - **Validate the \`implementationChangeSolution\`**:
                - If \`implementationChangeSolution\` is not an empty string:
                    - validation process for \`implementationChangeSolution\`:
                        - Ensure \`implementationChangeSolution\` does not contain program lines starting with \`#\`.
                        - Ensure \`implementationChangeSolution\` is not blank.
                        - Ensure \`implementationChangeSolution\` does not contains any extra spaces, extra comments, explinations compared to the original program.
                        - Ensure \`implementationChangeSolution\` does not contains any syntax errors or invalid program snippets.
                        - Search the code snippet from \`startRowforImplementationChangedAction\` to \`endRowforImplementationChangedAction\` in the original program.
                        - Replace the extracted code snippet in above with \`implementationChangeSolution\` in the original program file.
                        - Check if the updated entity is now synchronized with the relevant API documentation.
                    - If validation fails, correct the \`implementationChangeSolution\`, \`startRowforImplementationChangedAction\`, \`endRowforImplementationChangedAction\` and revalidate.
            - **Validate the \`docChangeSolution\`**:
                - validation process for \`docChangeSolution\`:
                    - If \`docChangeSolution\` is not present in the response, its an invalid response.
                    - Ensure \`docChangeSolution\` contains only lines starting with \`#\`.
                    - Ensure \`docChangeSolution\` is not blank.
                    - Ensure \`docChangeSolution\` does not contains any extra spaces, extra comments, explinations compared to the original program.
                    - Ensure \`docChangeSolution\` does not contains any syntax errors or invalid program snippets.
                    - Search the API documentation from \`startRowforDocChangedAction\` to \`endRowforDocChangedAction\` in the original program.
                    - Replace the extracted API documentation in above with \`docChangeSolution\` in the program file.
                    - Check if the updated entity is now synchronized with the relevant implementation.
                - If validation fails, correct the \`docChangeSolution\`, \`startRowforDocChangedAction\`, \`endRowforDocChangedAction\` and revalidate.
            - **Validate the \`cause\` field**:
                - validation process for \`cause\`:
                    - Ensure the \`cause\` does not contains empty or invalid reason.
                - If the validation fails, correct the \`cause\` and revalidate.
        - If all validations are got passed for a response, include it in the final \`results\` array.
   - Identify and report as many unsynchronized issues as possible.
4. After processing all files, combine all result objects into a single \`results\` array.
5. If no issues are found, return a valid JSON object with an empty \`results\` array.
6. Validate the corrcetness of the final response array as follows:
    - Validation rules:
        - The final response **MUST** strictly adhere to the JSON schema provided in below.
        - Do not include any additional text, explanations, or notes outside the JSON structure.
        - Do not include Markdown formatting (e.g., \`\`\`json\`\`\`) or any other text outside the response.
        - Do not generate incomplete JSON responses, invalid JSON, or wrong JSON responses.
        - If the response includes any non-JSON text or fails validation, the system **MUST** correct the response to ensure it is a valid JSON object that adheres to the schema.
    - If the all validations are got passed, return the response
    - If validation failed correct the final response and revalidate


## **JSON Schema for Response**

\`\`\`json
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string"
                    },
                    "fileName": {
                        "type": "string"
                    },
                    "startRowforImplementationChangedAction": {
                        "type": "integer"
                    },
                    "endRowforImplementationChangedAction": {
                        "type": "integer"
                    },
                    "implementationChangeSolution": {
                        "type": "string"
                    },
                    "startRowforDocChangedAction": {
                        "type": "integer"
                    },
                    "endRowforDocChangedAction": {
                        "type": "integer"
                    },
                    "docChangeSolution": {
                        "type": "string"
                    },
                    "cause": {
                        "type": "string"
                    }
                },
                "required": [
                    "id",
                    "fileName",
                    "startRowforDocChangedAction",
                    "endRowforDocChangedAction",
                    "docChangeSolution",
                    "cause",
                    "startRowforImplementationChangedAction",
                    "endRowforImplementationChangedAction",
                    "implementationChangeSolution"
                ],
                "additionalProperties": false
            }
        }
    },
    "required": [
        "results"
    ],
    "additionalProperties": false
}
\`\`\`

### Example Responses

#### Example 1: Not Synchronized Entities

\`\`\`xml
<project>
    <file filename="main.bal">
        1|# Calculates the factorial of a given integer.
        2|# + n - The integer number to calculate factorial for
        3|# + return - The factorial of the input number, or 0 if input is negative
        4|public function factorial(int n) returns int {
        5|    if n == 0 || n == 1 {
        6|        return 1;
        7|    }
        8|    return n * factorial(n - 1);
        9|}
    </file>
</project>
\`\`\`

The correct response is:

\`\`\`json
{
    "results": [
        {
            "id": "1",
            "fileName": "main.bal",
            "startRowforImplementationChangedAction": 5,
            "endRowforImplementationChangedAction": 5,
            "implementationChangeSolution": "if n < 0 {\\n    return 0;\\n}\\nif n == 0 || n == 1 {",
            "startRowforDocChangedAction": 3,
            "endRowforDocChangedAction": 3,
            "docChangeSolution": "# + return - The factorial of the input number. Returns 1 for input 0 or 1.",
            "cause": "The API documentation states that the function returns 0 for negative input, but the implementation does not handle negative numbers."
        }
    ]
}
\`\`\`

#### Example 2: Nested Entities

**Ballerina Program:**

\`\`\`xml
<project>
    <file filename="service.bal">
        1|# Service to manage user operations.
        2|service /users on new http:Listener(8080) {
        3|    # Retrieves a list of all users.
        4|    # + return - A JSON array of user details.
        5|    resource function get ./[string userId]() returns json|error {
        6|        if userId == "123" {
        7|            return {id: "123", name: "John Doe", age: 30};
        8|        }
        9|        return error("User not found");
        10|   }
        11|}
    </file>
</project>
\`\`\`

The correct response is:

\`\`\`json
{
    "results": [
        {
            "id": "1",
            "fileName": "service.bal",
            "startRowforImplementationChangedAction": 6,
            "endRowforImplementationChangedAction": 9,
            "implementationChangeSolution": "return [{id: \\"123\\", name: \\"John Doe\\", age: 30}, {id: \\"456\\", name: \\"Jane Doe\\", age: 25}];",
            "startRowforDocChangedAction": 4,
            "endRowforDocChangedAction": 4,
            "docChangeSolution": "# + return - A JSON of User details, if userId is 123, else an error.",
            "cause": "The API documentation specifies that the function retrieves a list of all users, but the implementation only handles a specific user ID (\\"123\\") and does not return a list."
        }
    ]
}
\`\`\`

### Example 3: Incorrect API Documentation for Edge Case

**Ballerina Program:**

\`\`\`xml
<project>
    <file filename="division.bal">
        1|# Divides two numbers.
        2|# + a - The dividend
        3|# + b - The divisor
        4|# + return - The result of the division
        5|public function divide(float a, float b) returns float {
        6|    if b == 0 {
        7|        return 0.0;
        8|    }
        9|    return a / b;
        10|}
    </file>
</project>
\`\`\`

**JSON Response:**

\`\`\`json
{
    "results": [
        {
            "id": "1",
            "fileName": "division.bal",
            "startRowforImplementationChangedAction": 6,
            "endRowforImplementationChangedAction": 9,
            "implementationChangeSolution": "return a / b;",
            "startRowforDocChangedAction": 4,
            "endRowforDocChangedAction": 4,
            "docChangeSolution": "# + return - The result of the division, or 0.0 if the divisor is 0",
            "cause": "The API documentation does not mention the edge case where the divisor is 0, and the implementation returns 0.0 instead of NaN."
        }
    ]
}
\`\`\`

### Example 4: No API Documentation at All

This example demonstrates a file with no API documentation for any entity.

**Ballerina Program:**

\`\`\`xml
<project>
    <file filename="no_docs.bal">
        1|public function greet(string name) returns string {
        2|    return "Hello, " + name + "!";
        3|}
        4|
        5|service /greet on new http:Listener(8083) {
        6|    resource function get ./[string orderId]() returns json|error {
        7|        if orderId == "o1" {
        8|            return {id: "o1", product: "Product 1", quantity: 10};
        9|        }
        10|       return error("Order not found");
        11|   }
        12|}
    </file>
</project>
\`\`\`

**JSON Response:**

\`\`\`json
{
    "results": []
}
\`\`\`

---

#### Example 5: Natural Programming Function with \`prompt\` Parameter and \`@np:LlmCall\` annotation

**Ballerina Program:**

\`\`\`xml
<project>
    <file filename="filter_questions.bal">
        1|# Filters and merges questions for a session.
        2|# + session - The session details
        3|# + currentQuestions - The current list of questions
        4|# + newQuestions - The new list of questions
        5|# + return - A merged and filtered list of questions
        6|public isolated function filterQuestions(
        7|    SessionDetails session,
        8|    string[] currentQuestions,
        9|    string[] newQuestions,
        10|    np:Prompt prompt = \`Select list of most relevent question for the \${session} using \${currentQuestions} and \${newQuestions}\`
        11|) returns Result|error = @np:LlmCall external;
    </file>
    <file filename="summarize.bal">
        1|# Summarize a text.
        2|# + text - Text that needs to be summarized.
        6|public isolated function summarize(
        7|    string text
        8|    np:Prompt prompt = \`Summarize the given text\`
        9|) returns Result|error = @np:LlmCall external;
    </file>
    <file filename="filter_countries.bal">
        1|public isolated function filterCountries(
        2|    string[] countries,
        3|    np:Prompt prompt = \`Filter countries based on the population\`
        4|) returns Result|error = @np:LlmCall external;
    </file>
</project>
\`\`\`

**JSON Response:**

\`\`\`json
{
    "results": [
        {
            "id": "1",
            "fileName": "filter_questions.bal",
            "startRowforImplementationChangedAction": 10,
            "endRowforImplementationChangedAction": 10,
            "implementationChangeSolution": "np:Prompt prompt = \`Analyse the questions and return merged and filtered list of questions\`",
            "startRowforDocChangedAction": 5,
            "endRowforDocChangedAction": 5,
            "docChangeSolution": "# + return - Get list of most relevant question for the given session",
            "cause": "The API documentation says the function returns a merged and filtered list of questions, but the actual implementation returns a list of the most relevant questions for the session."
        }
    ]
}
\`\`\`

---

#### Example 6: CalLLM invocation

**Ballerina Program:**

\`\`\`xml
<project>
    <file filename="rate_blog.bal">
        1|import ballerina/np;
        2|
        3|# Rates a blog based on its title and content
        4|# + title - Title of the blog
        5|# + content - Content of the blog
        6|# + return - Rating of the blog out of 10
        7|function rateBlog(string title, string content) returns int|error? {
        8|    int rating = check np:callLlm(\`Rate this blog out of 10.
        9|        Title: "\${title}"
        10|        Content: \${content}\`);
        11|    return rating;
        12|}
        13|
    </file>
    <file filename="summarize.bal">
        1|import ballerina/np as naturalprogramming;
        2|
        3|# Summarize a text.
        4|# + text - Text that needs to summarize
        5|# + return - summarized text
        6|function summarizeText(string text) returns string|error? {
        7|    return check naturalprogramming:callLlm(\`Summarize this text.
        8|        Text: "\${text}"\`);
        9|}
        10|
        11|# Adds two integers.
        12|# + a - The first integer
        13|# + b - The second integer
        14|# + return - The sum of the two integers
        15|public function add(int a, int b, int c) returns int {
        16|    return a + b + c;
        17|}
        18|
    </file>
    <file filename="substract.bal">
        1|import ballerina/np;
        2|
        3|# Substract two integers.
        4|# + a - first integer
        5|# + b - second integer
        6|# + return - substraction between two integers
        7|function substract(int a, int b) returns int {
        8|    return check np:callLlm(\`Multiply this two integers, \${a}, \${b}\`);
        10|}
        11|
    </file>
    <file filename="multiplication.bal">
        1|import ballerina/np as naturalprogramming;
        2|
        3|# Multiply two integers.
        4|# + a - first integer
        5|# + b - second integer
        6|# + return - multiplication between two integers
        7|function multiply(int a, int b) returns int {
        8|    return check np:callLlm(\`Substract this two integers, \${a}, \${b}\`);
        10|}
        11|
    </file>
</project>
\`\`\`

**JSON Response:**

\`\`\`json
{
    "results": [
        {
            "id": "1",
            "fileName": "math_operations.bal",
            "startRowforImplementationChangedAction":15,
            "endRowforImplementationChangedAction": 15,
            "implementationChangeSolution": "public function add(int a, int b) returns int {",
            "startRowforDocChangedAction": 13,
            "endRowforDocChangedAction": 13,
            "docChangeSolution": "# + b - The second integer\\n# + c - The third integer",
            "cause": "The function signature includes a third parameter 'c', but the API documentation only describes two parameters."
        },
        {
            "id": "1",
            "fileName": "substract.bal",
            "startRowforImplementationChangedAction":8,
            "endRowforImplementationChangedAction": 8,
            "implementationChangeSolution": "    return check np:callLlm(\`Substract this two integers, \${a}, \${b}\`);",
            "startRowforDocChangedAction": 3,
            "endRowforDocChangedAction": 6,
            "docChangeSolution": "# Multiply two integers.\\n# + a - first integer\\n# + b - second integer\\n# + return - multiplication between two integers",
            "cause": "The API documentation implies substraction while implementation do the multiplication"
        },
        {
            "id": "1",
            "fileName": "multiplication.bal",
            "startRowforImplementationChangedAction":8,
            "endRowforImplementationChangedAction": 8,
            "implementationChangeSolution": "    return check np:callLlm(\`Multiply this two integers, \${a}, \${b}\`);",
            "startRowforDocChangedAction": 3,
            "endRowforDocChangedAction": 6,
            "docChangeSolution": "# Substract two integers.\\n# + a - first integer\\n# + b - second integer",
            "cause": "The API documentation implies multiplication while implementation do the substraction"
        }
    ]
}
\`\`\``;
}

// ==============================================
//    CODE AND DOCUMENTATION SYNC PROMPT
// ==============================================

export function getCodeAndDocumentationSyncPrompt(
    ballerinaSourceFiles: string,
    requirementSpecification: string,
    readmeDocumentation: string,
    developerDocumentation: string
): string {
    return `## Terminology

1. **Program**: The actual Ballerina project containing Ballerina program files.
2. **Requirement Specification**: Defines the expected behavior, features, and functional and non-functional requirements of the Ballerina project.
3. **README Documentation (e.g., README.md)**: Explains the purpose, behavior, constraints, functional requirements, non-functional requirements, features, and functionalities of the Ballerina project.
4. **Project Documentation**: The requirement specification and README documentation files.
5. **Program-Requirement Synchronized**: The program is fully aligned with the requirement specification. If the requirement specification is missing, the program is considered synchronized.
6. **Program-README Documentation Synchronized**: The program is fully aligned with the README documentation. If the README is missing, the program is considered synchronized.
7. **Synchronized**: The program is both Program-Requirement Synchronized and Program-README Documentation Synchronized.
8. **Unsynchronized**: The program is not synchronized with either the requirement specification, README documentation, or both.
9. **Implementation**: The Ballerina implementation of an entity without any API Description.
10. **API Description**: Documentation in the Ballerina program starting with \`#\`. Comments (\`//\`) are **not** considered API Description.
11. **Developer Documentation (developer.md)**: Summarizes the developer's intentions during development, reflecting how the current version of the code was arrived at. Used to validate the program against the requirement specification and README documentation.
12. **Natural Programming Function**: A function where the implementation is described in a \`prompt\` parameter, and the function definition ends with \`= @np:LlmCall external;\`. The \`prompt\` parameter's value is treated as the function's implementation.
13. **callLlm Invocation**: The \`callLlm\` function calls a Large Language Model (LLM) with a prompt and returns the result. The \`prompt\` describes the task the function performs.
14. **Ballerina Config.toml**: A configuration file used in Ballerina to externalize configuration values.
15. **Configuration Variables**: Key-value pairs defined in the \`Config.toml\` file or environment variables that are used to configure the behavior of the Ballerina program.

---

## **Objective**

Your task is to verify the synchronization between a Ballerina project and its requirement specification and README documentation. Ensure that the Ballerina program files are accurately implemented in accordance with both the requirement specification and project README documentation.

---

## **Inputs**

1. **Requirement Specification**: ${requirementSpecification}
2. **README Documentation**: ${readmeDocumentation}
3. **Developer Documentation**: ${developerDocumentation}
4. **Ballerina Source Files**: ${ballerinaSourceFiles}

---

## **Steps for Analysis**

1. **Read Requirement Specification**:
   - If the requirement specification is missing or empty, consider the program as Program-Requirement Synchronized.
   - If the requirement specification is present
      - Thoroughly read the complete requirement specification and understand the content.
      - Understand all the expected behavior, constraints, functional requirements, non-functional requirements, features, and functionalities of the Ballerina project.

2. **Read README Documentation**:
   - If the README documentation is missing or empty, consider the program as Program-README Documentation Synchronized.
   - If the README documentation is present
      - Thoroughly read the complete README documentation and understand the content.
      - Understand the purpose, functionalities, usages, examples, constraints, dependencies, configurations, and development setups defined in the README documentation
      - Ignore unrelated information (e.g., License, Contributing Guidelines).

3. **Read Developer Documentation**:
   - If the developer documentation is missing or empty, proceed without it.
   - If the developer documentation is present
      - Thoroughly read the developer documentation and understand the content.
      - Understand the developer's intentions and how they arrived at the current version of the code

4. **Verify Ballerina Program Implements What the Requirement Specification and README Describe**
    - For each and every \`<file>\` tag in the \`<project>\`:
      - Read and analyze the **Ballerina program content** thoroughly.
      - while reading, **Ignore the API Description** present within the Ballerina program.
      - Understand the **actual implementation** of the Ballerina program.
      - **Cross-check** the implementation against the **requirement specification**:
        - **Identify all unsynchronized implementations** by thoroughly analyzing the program against the expected behavior, constraints, functional and non-functional requirements, features, and functionalities outlined in the requirement specification.
      - **Cross-check** the implementation against the **README documentation**:
        - **Identify all unsynchronized implementations** by thoroughly analyzing the program against the **purpose, functionalities, usages, examples, constraints, dependencies, configurations, and development setups** described in the README documentation.
      - **Ignore discrepancies** between the implementation and the API Description inside the program file.
      - Do not assume or infer any details **not explicitly mentioned** in the requirement specification or README documentation.
      - Ensure that all discrepancies are noted as unsynchronized implementations.

5. **Verify Requirement Specification and README Accurately Reflect the Ballerina Program**
    **Step 1: Analyze Requirement Specification & README**
    - For each key section in the **requirement specification** and **README documentation**:
      - Extract all **functional requirements**.
      - Extract all **functional and non-functional requirements**.
      - Identify all **purpose, functionalities, usages, examples, dependencies, configurations, and development setups**.
      - Extract all **specified behaviors, constraints, and expected system responses**.

    **Step 2: Map Requirements & Documentation to Ballerina Implementation**
    - For each extracted functional and non functional requirements, expected behavior, constraints, features, purpose, functionalities, usages, examples, dependencies, configurations, development setups:
      - Locate the corresponding **implementation** in the **Ballerina source files**.
      - Verify whether each functional requirement is:
        - **Fully implemented**
        - **Partially implemented**
        - **Not implemented**
      - Verify whether each non-functional requirement is:
        - **Fully implemented**
        - **Partially implemented**
        - **Not implemented**
      - Verify whether each **purpose, usage, examples, constraints, dependencies, configurations, and development setups** are:
        - **Fully implemented**
        - **Partially implemented**
        - **Not implemented**
      - Verify that each documented **functionality or feature** is:
        - **Fully implemented**
        - **Partially implemented**
        - **Not implemented**

    **Step 3: Identify Missing or Incomplete Implementations**
    - Identify all requirements that are **not implemented** in the Ballerina program and note them as unsynchronized implementations.
    - Identify all requirements that are **partially implemented** in the Ballerina program and note them as unsynchronized implementations.
    - Identify all features in the **README** that are **Described in the README but missing in the implementation.** and **Described in the README but partially implemented**, then note them as unsynchronized implementations

6. **Categorize unsynchronized implementations**:
   - For all unsynchronized implementations noted in above steps, categorize them as follows:
      - **Fixable Issues**: Issues that can be resolved with minor code changes, such as:
        - Missing simple tasks or validations.
        - Incorrect conditions or logic.
        - Mismatches in API endpoints or parameters.
        - Incorrect or incomplete LLM prompt values.
        - Parameter or return type mismatches.
      - **Non-Fixable Issues**: Issues that require significant changes or are not feasible to fix, such as:
        - Missing major features or modules.
        - Authentication or security-related gaps.
        - Architectural mismatches or design flaws.
        - Scenarios requiring complete function rewrites or reimplementation.

7. **Generate Response Object**:
    - For each and every unsynchronized implementation, create a response object with the following fields:
      - **\`id\`**: Unique identifier for the issue.
      - **\`cause\`**: Detailed, comprehensive description of why the program and requirement specification/README are unsynchronized, Clearly mention what is expected and what is implemented/not implemented
      - **\`fileName\`**: The filename of the requirement specification or README documentation related to the issue.
      - if the unsynchronized implementation is a fixable issue:
          - **\`codeFileName\`**: The filename of the Ballerina program file where the code change is required.
          - **\`startRowforImplementationChangedAction\`**: The start row number of the code that needs to be changed.
          - **\`endRowforImplementationChangedAction\`**: The end row number of the code that needs to be changed.
          - **\`implementationChangeSolution\`**: The corrected code for the specified lines.

8. **Duplicate Issue Handling**:
    - If the same code snippet causes unsynchronization in both the requirement specification and README:
      - Create **two separate response entries**, one for each project documentation file (requirement specification and README).
      - Ensure the \`cause\` message is **specific to each project documentation file**.
      - For **fixable issues**:
        - Include the \`implementationChangeSolution\` **only in the response for the requirement specification**.
        - For the README response, **exclude the \`implementationChangeSolution\`** but include all other fields (e.g., \`cause\`, \`fileName\`, etc.).

9. **Validate Response**:
    - **Exclude Responses for Missing or Empty Project Documentation**:
      - **If the \`fileName\` attribute in the response does not contain \`natural-programming/requirements.<extension>\` or \`README.md\` (case-insensitive), exclude the response.**
      - If the \`cause\` in the response indicates issues such as:
        - Not relevant to requirement specification document or README documentation.
        - validating Ballerina program against API Description.
        - Missing requirements file or the requirements file is empty.
        - Missing README file or the README content is empty.
        - Missing developer documentation or the developer documentation is empty.
        - Issues related to API Descriptions.
      - **Remove such responses entirely** from the final \`results\` array, as these issues are not related to code synchronization and do not require fixes within the program.
    - For fixable issues:
      - Ensure \`implementationChangeSolution\` does not contain program lines starting with \`#\`.
      - Search the code snippet from \`startRowforImplementationChangedAction\` to \`endRowforImplementationChangedAction\` in the original program.
      - Replace the extracted code snippet with \`implementationChangeSolution\` in the original program file.
      - Validate the updated program snippet against the relevant sections in the requirement specification/README documentation.
      - If validation fails, correct the \`implementationChangeSolution\`, \`startRowforImplementationChangedAction\`, \`endRowforImplementationChangedAction\` and revalidate.

10. **Combine Results**:
    - Combine all result objects into a single \`results\` array.
    - If no issues are found, return a valid JSON object with an empty \`results\` array.

11. **Validate the correctness of the final response array**
    - Validation rules:
        - The final response **MUST** be a valid JSON object that strictly adheres to the provided JSON schema.
        - The response **MUST NOT** include any additional text, explanations, or notes outside the JSON structure.
        - The response **MUST NOT** include Markdown formatting (e.g., \`\`\`json\`\`\`) or any other text outside the JSON object.
        - The response **MUST NOT** generate incomplete JSON, invalid JSON, or incorrect JSON responses.
        - If the response includes any non-JSON text or fails validation, the system **MUST** correct the response to ensure it is a valid JSON object that adheres to the schema.
    - The response **MUST** be returned as a pure JSON object with no extraneous content.
    - If the all validations are got passed, return the response array
    - If validation failed correct the final response array and revalidate

---

## **JSON Schema for Response**

\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "results": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "cause": { "type": "string" },
          "fileName": { "type": "string" },
          "codeFileName": { "type": "string" },
          "startRowforImplementationChangedAction": { "type": "integer" },
          "endRowforImplementationChangedAction": { "type": "integer" },
          "implementationChangeSolution": { "type": "string" }
        },
        "required": ["id", "cause", "fileName"],
        "oneOf": [
          { "required": ["codeFileName", "startRowforImplementationChangedAction", "endRowforImplementationChangedAction", "implementationChangeSolution"] },
          {}
        ]
      }
    }
  },
  "required": ["results"]
}
\`\`\`

---

## **Examples**

### **Example 1: Fixable Requirement Mismatch**

#### **Input:**

\`\`\`xml
<project>
    <file filename="factorial.bal">
        1|public function factorial(int n) returns int {
        2|    if n == 0 || n == 1  {
        3|        return 1;
        4|    }
        5|    return n * factorial(n - 1);
        6|}
    </file>
    <requirement_specification filename="requirements.md">
        This project provides a factorial function. It should handle negative inputs by returning an error.
    </requirement_specification>
    <readme filename="README.md">
        This project provides a factorial function.
    </readme>
</project>
\`\`\`

#### **Expected JSON Output:**

\`\`\`json
{
  "results": [{
    "id": "1",
    "fileName": "requirements.md",
    "codeFileName": "factorial.bal",
    "startRowforImplementationChangedAction": 2,
    "endRowforImplementationChangedAction": 2,
    "implementationChangeSolution": "if n < 0 \\n    return error(\\"Negative input\\");\\nif n == 0 || n == 1 return 1;",
    "cause": "requirement specifies negative input handling missing in code"
  }]
}
\`\`\`

### **Example 2: Non-Fixable README Mismatch**

#### **Input:**

\`\`\`xml
<project>
    <file filename="auth.bal">
        1|public function login(string user) returns boolean {
        2|    return true; // No actual authentication
        3|}
    </file>
    <requirement_specification filename="requirements.md">
        Implement basic login functionality
    </requirement_specification>
    <readme filename="README.md">
        Implements OAuth2 authentication
    </readme>
</project>
\`\`\`

#### **Expected JSON Output:**

\`\`\`json
{
  "results": [{
    "id": "2",
    "fileName": "README.md",
    "cause": "README claims OAuth2 implementation but code has basic login"
  }]
}
\`\`\`

---

### **Example 3: Synchronized**

#### **Input:**

\`\`\`xml
<project>
    <file filename="factorial.bal">
        1|public function factorial(int n) returns int {
        2|    if n == 0 || n == 1  {
        3|        return 1;
        4|    }
        5|    return n * factorial(n - 1);
        6|}
    </file>
    <requirement_specification filename="requirements.md">
        This project provides a factorial function for numbers that greater than 0.
    </requirement_specification>
    <readme filename="README.md">
        This project provides a factorial function for numbers that greater than 0.
    </readme>
</project>
\`\`\`

#### **Expected JSON Output:**

\`\`\`json
{
  "results": []
}
\`\`\`

---

#### **Example 4: Natural Programming Function Fix**

##### **Input:**

\`\`\`xml
<project>
    <file filename="filter.bal">
        1|public function filterData(
        2|    np:Prompt prompt = \`Filter inactive users\`
        3|) = @np:LlmCall external;
    </file>
    <requirement_specification filename="requirements.png">
        Filter users by registration date
    </requirement_specification>
    <readme filename="README.md">
        This project filters users by registration date.
    </readme>
</project>
\`\`\`

##### **Expected JSON Output:**

\`\`\`json
{
  "results": [{
    "id": "4",
    "fileName": "natural-programming/requirements.png",
    "codeFileName": "filter.bal",
    "startRowforImplementationChangedAction": 2,
    "endRowforImplementationChangedAction": 2,
    "implementationChangeSolution": "np:Prompt prompt = \`Filter users by registration date\`",
    "cause": "Filter criteria mismatch between implementation and requirements"
  }, {
    "id": "4",
    "fileName": "README.md",
    "cause": "Filter criteria mismatch between implementation and README"
  }]
}
\`\`\`

#### **Example 5: CallLLM Invocation Fix**

##### **Input:**

\`\`\`xml
<project>
    <file filename="summarize.bal">
        1|function summarize(string text) {
        2|    np:callLlm(
        3|       \`analyze text and check grammar errors, \${text}\`);
        4|}
    </file>
    <requirement_specification filename="requirements.pdf">
        Generate summary of the given text
    </requirement_specification>
    <readme filename="README.pdf">
        This project generates a summary of the input.
    </readme>
</project>
\`\`\`

##### **Expected JSON Output:**

\`\`\`json
{
  "results": [{
    "id": "5",
    "fileName": "natural-programming/requirements.md",
    "codeFileName": "summarize.bal",
    "startRowforImplementationChangedAction": 3,
    "endRowforImplementationChangedAction": 4,
    "implementationChangeSolution": "np:callLlm(\`Generate summary of the given text, \${text}\`)",
    "cause": "LLM task is to check grammar errors while requirements document asked to generate the summary"
  }, {
    "id": "6",
    "fileName": "README.md",
    "cause": "LLM task is to check grammar errors while README document asked to generate the summary"
  }]
}
\`\`\`

#### **Example 6: Non-Fixable Requirement Mismatch**

##### **Input:**

\`\`\`xml
<project>
    <file filename="service.bal">
        1|service /orders on new http:Listener(8080) {
        2|    resource function get order/[string orderId]() returns json|error {
        3|        return {id: 1, name: "order1"};
        4|    }
        5|}
    </file>
    <requirement_specification filename="requirements.md">
        Provide an HTTP-based service to retrieve order details by order ID, including error handling for invalid order IDs.
    </requirement_specification>
    <readme filename="README.md">
        This project provides a service to retrieve order details by order ID.
    </readme>
</project>
\`\`\`

##### **Expected JSON Output:**

\`\`\`json
{
  "results": [{
    "id": "1",
    "fileName": "natural-programming/requirements.md",
    "cause": "The requirement specifies error handling for invalid order IDs, but the program does not implement this functionality."
  }]
}
\`\`\`

#### **Example 7: Fixable README and Requirements Mismatch But more closer to README documentation**

##### **Input:**

\`\`\`xml
<project>
    <file filename="math_operations.bal">
        1|public function add(int a, int b) returns int {
        2|    return a + b;
        3|}
    </file>
    <requirement_specification filename="requirements.png">
        This project provides a function to multiply three integers.
    </requirement_specification>
    <readme filename="README.md">
        Implement addition of three integers
    </readme>
</project>
\`\`\`

##### **Expected JSON Output:**

\`\`\`json
{
  "results": [{
    "id": "1",
    "fileName": "requirements.png",
    "cause": "Requirements specify multiplication, but the code implements addition."
  }, {
    "id": "2",
    "fileName": "README.md",
    "codeFileName": "math_operations.bal",
    "startRowforImplementationChangedAction": 1,
    "endRowforImplementationChangedAction": 3,
    "implementationChangeSolution": "public function add(int a, int b, int c) returns int {\\n    return a + b + c;\\n}",
    "cause": "README specifies addition of three numbers, but the code implements addition of two numbers."
  }]
}
\`\`\``;
}
