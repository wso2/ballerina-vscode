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

import { ModelMessage, generateObject, streamText } from "ai";
import { getAnthropicClient, ANTHROPIC_HAIKU, ANTHROPIC_SONNET_4, getProviderCacheControl } from "../connection";
import { GenerationType, getRelevantLibrariesAndFunctions } from "../libs/libs";
import { getRewrittenPrompt, populateHistory, transformProjectSource, getErrorMessage } from "../utils";
import { libraryContains } from "../libs/funcs";
import { LANGLIBS } from "../libs/langlibs";
import {
    GetTypeResponse,
    GetTypesRequest,
    GetTypesResponse,
    getTypesResponseSchema,
    Library,
    MiniType,
    TypeDefinition,
} from "../libs/libs_types";
import {
    FileAttatchment,
    GenerateCodeRequest,
    ProjectSource,
    SourceFiles,
    OperationType,
    Command
} from "@wso2/ballerina-core";
import { getProjectSource } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { stringifyExistingCode } from "../code/code";


// Core healthcare code generation function that emits events
export async function generateHealthcareCodeCore(
    params: GenerateCodeRequest,
    eventHandler: CopilotEventHandler
): Promise<void> {
    const project: ProjectSource = await getProjectSource(params.operationType);
    const packageName = project.projectName;
    const sourceFiles: SourceFiles[] = transformProjectSource(project);
    const prompt = getRewrittenPrompt(params, sourceFiles);
    const relevantTrimmedFuncs: Library[] = (
        await getRelevantLibrariesAndFunctions({ query: prompt }, GenerationType.HEALTHCARE_GENERATION)
    ).libraries;

    const historyMessages = populateHistory(params.chatHistory);
    const cacheOptions = await getProviderCacheControl();

    const allMessages: ModelMessage[] = [
        {
            role: "system",
            content: getSystemPromptPrefix(relevantTrimmedFuncs, sourceFiles),
        },
        {
            role: "system",
            content: getSystemPromptSuffix(LANGLIBS),
            providerOptions: cacheOptions,
        },
        ...historyMessages,
        {
            role: "user",
            content: getUserPrompt(prompt, sourceFiles, params.fileAttachmentContents, packageName, params.operationType),
            providerOptions: cacheOptions,
        },
    ];

    const { fullStream } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 4096 * 2,
        temperature: 0,
        messages: allMessages,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    eventHandler({ type: "start" });
    let assistantResponse: string = "";
    for await (const part of fullStream) {
        switch (part.type) {
            case "text-delta": {
                const textPart = part.text;
                assistantResponse += textPart;
                eventHandler({ type: "content_block", content: textPart });
                break;
            }
            case "error": {
                const error = part.error;
                console.error("Error during Code generation:", error);
                eventHandler({ type: "error", content: getErrorMessage(error) });
                break;
            }
            case "finish": {
                const finishReason = part.finishReason;
                console.log("Finish reason: ", finishReason);
                if (finishReason === "error") {
                    // Already handled in error case.
                    break;
                }
                eventHandler({ type: "stop", command: Command.Healthcare });
                break;
            }
        }
    }
}

// Main public function that uses the default event handler
export async function generateHealthcareCode(params: GenerateCodeRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Healthcare);
    try {
        await generateHealthcareCodeCore(params, eventHandler);
    } catch (error) {
        console.error("Error during healthcare generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}

export function getSystemPromptPrefix(apidocs: Library[], sourceFiles: SourceFiles[]): string {
    return `You are an expert assistant who specializes in writing Ballerina code for healthcare integrations. Your goal is to ONLY answer Ballerina related queries. You should always answer with accurate and functional Ballerina code that addresses the specified query while adhering to the constraints of the given API documentation.

You will be provided with following inputs:

1. API_DOCS: A JSON string containing the API documentation for various Ballerina libraries and their functions, types, and clients.
<api_docs>
${JSON.stringify(apidocs)}
</api_docs>
`;
}

function getSystemPromptSuffix(langlibs: Library[]) {
    return `2. Langlibs
<langlibs>
${JSON.stringify(langlibs)}
</langlibs>

If the query doesn't require code examples, answer the code by utilzing the api documentation.
If the query requires code, Follow these steps to generate the Ballerina code:

1. Carefully analyze the provided API documentation:
   - Identify the available libraries, clients, their functions and their relavant types.

2. Thoroughly read and understand the given query:
   - Identify the main requirements and objectives of the integration.
   - Determine which libraries, functions and their relavant records and types from the API documentation which are needed to achieve the query and forget about unused API docs.
   - Note the libraries needed to achieve the query and plan the control flow of the applicaiton based input and output parameters of each function of the connector according to the API documentation.

3. Plan your code structure:
   - Decide which libraries need to be imported (Avoid importing lang.string, lang.boolean, lang.float, lang.decimal, lang.int, lang.map langlibs as they are already imported by default).
   - Determine the necessary client initialization.
   - Define Types needed for the query in the types.bal file.
   - Outline the service OR main function for the query.
   - Outline the required function usages as noted in Step 2.
   - Based on the types of identified functions, plan the data flow. Transform data as necessary.
   - Note the special Ballerina libraries that you ALWAYS have to import into your code:
        <imports>
        import ballerinax/health.fhir.r4.international401 as international401;
        import ballerinax/health.fhir.r4 as r4;
        import ballerinax/health.fhir.r4.parser as parser;
        import ballerina/io as io;
        import ballerinax/health.hl7v2 as hl7v2;
        import ballerinax/health.hl7v2commons as hl7v2commons;
        </imports>

4. Generate the Ballerina code:
   - Start with the required import statements.
   - Define required configurables for the query. Use only string, int, boolean types in configurable variables.
   - Initialize any necessary clients with the correct configuration at the module level(before any function or service declarations).
   - Implement the main function OR service to address the query requirements.
   - Use defined connectors based on the query by following the API documentation.
   - Use only the functions, types, and clients specified in the API documentation.
   - Use dot donation to access a normal function. Use -> to access a remote function or resource function.
   - Ensure proper error handling and type checking.
   - Do not invoke methods on json access expressions. Always Use seperate statements.
   - Use langlibs ONLY IF REQUIRED.

5. Review and refine your code:
   - Check that all query requirements are met.
   - Verify that you're only using elements from the provided API documentation.
   - Ensure the code follows Ballerina best practices and conventions.

Provide a brief explanation of how your code addresses the query and then output your generated ballerina code.

Important reminders:
- Only use the libraries, functions, types, services and clients specified in the provided API documentation.
- Always strictly respect the types given in the API Docs.
- Do not introduce any additional libraries or functions not mentioned in the API docs.
- Only use specified fields in records according to the api docs. this applies to array types of that record as well.
- Ensure your code is syntactically correct and follows Ballerina conventions.
- Do not use dynamic listener registrations.
- Do not write code in a way that requires updating/assigning values of function parameters.
- ALWAYS Use two words camel case identifiers (variable, function parameter, resource function parameter and field names).
- If the library name contains a . Always use an alias in the import statement. (import org/package.one as one;)
- Treat generated connectors/clients inside the generated folder as submodules.
- A submodule MUST BE imported before being used.  The import statement should only contain the package name and submodule name.  For package my_pkg, folder strucutre generated/fooApi the import should be \`import my_pkg.fooApi;\`
- If the return parameter typedesc default value is marked as <> in the given API docs, define a custom record in the code that represents the data structure based on the use case and assign to it.
- Whenever you have a Json variable, NEVER access or manipulate Json variables. ALWAYS define a record and convert the Json to that record and use it.
- When invoking resource function from a client, use the correct paths with accessor and paramters. (eg: exampleClient->/path1/["param"]/path2.get(key="value"))
- When you are accessing a field of a record, always assign it into new variable and use that variable in the next statement.
- Avoid long comments in the code. Use // for single line comments.
- Always use named arguments when providing values to any parameter. (eg: .get(key="value"))
- Mention types EXPLICITLY in variable declarations and foreach statements.
- Do not modify the README.md file unless asked to be modified explicitly in the query.
- Do not add/modify toml files(Config.toml/Ballerina.toml) unless asked.
- In the library API documentation if the service type is specified as generic, adhere to the instructions specified there on writing the service.
- ALWAYS use payload bindings when implementing the resource functions of the services.
    \`\`\
    import ballerina/http;
    type Album readonly & record {|
        string title;
        string artist;
    |};
    table<Album> key(title) albums = table [];
    service / on new http:Listener(9090) {
        // The \`album\` parameter in the payload annotation represents the entity body of the inbound request.
        resource function post albums(Album album) returns Album {
            albums.add(album);
            return album;
        }
    }
    \`\`\
    - Note the use of \`Album\` instead of a json payload.

Begin your response with the explanation, once the entire explanation is finished only, include codeblock segments(if any) in the end of the response.
The explanation should explain the control flow decided in step 2, along with the selected libraries and their functions.

Each file which needs modifications, should have a codeblock segment and it MUST have complete file content with the proposed change.
The codeblock segments should only have .bal contents and it should not generate or modify any other file types. Politely decline if the query requests for such cases.

Example Codeblock segments:
  If the generated code is a service, use an appropriate name for the file. Use \`service\` as a prefix to the file name. Example:
  <code filename="service_abc.bal">
  \`\`\ballerina
  //code goes here
  \`\`\
  </code>

  If the generated code is a main function, use an appropriate name for the file. Use \`main\` as a prefix to the file name. Example:
  <code filename="main_abc.bal">
  \`\`\ballerina
  //code goes here
  \`\`\
  </code>
`;
}

function getUserPrompt(
    usecase: string,
    existingCode: SourceFiles[],
    fileUploadContents: FileAttatchment[],
    packageName: string,
    op: OperationType
): string {
    let fileInstructions = "";
    if (fileUploadContents.length > 0) {
        fileInstructions = `4. File Upload Contents. : Contents of the file which the user uploaded as addtional information for the query.

${fileUploadContents
                .map(
                    (file) => `File Name: ${file.fileName}
Content: ${file.content}`
                )
                .join("\n")}`;
    }

    return `QUERY: The query you need to answer using the provided api documentation.
<query>
${usecase}
</query>

Existing Code: Users existing code.
<existing_code>
${stringifyExistingCode(existingCode, op)}
</existing_code>

Current Package name: ${packageName}

${fileInstructions}

`;
}

export async function getRequiredTypesFromLibJson(
    libraries: string[],
    prompt: string,
    librariesJson: Library[]
): Promise<GetTypeResponse[]> {
    if (librariesJson.length === 0) {
        return [];
    }

    const typeDefs: GetTypesRequest[] = librariesJson
        .filter((lib) => libraryContains(lib.name, libraries))
        .map((lib) => ({
            name: lib.name,
            description: lib.description,
            types: filteredTypes(lib.typeDefs),
        }));

    if (typeDefs.length === 0) {
        return [];
    }

    const getLibSystemPrompt = `You are an assistant tasked with selecting the Ballerina types needed to solve a given question based on a set of Ballerina libraries given in the context as a JSON.

Objective: Create a JSON output that includes a minimized version of the context JSON, containing only the selected libraries and types necessary to achieve a given question.

Context Format: A JSON Object that represents a library with its name and types.

Library Context JSON:
\`\`\`json
${JSON.stringify(typeDefs)}
\`\`\`

Think step-by-step to choose the required types in order to solve the given question.
1. Identify the unique entities that are required to answer the question. Create a small description for each identified entitiy to better explain their role.
2. When selecting the necessary Ballerina types that represents those entities, consider the following factors:
2.1 Take the description of the types from the context as a way to understand the entity represented by it.
2.2 Compare the types descriptions against the descriptions you generated for each identity and find the mapping types for each entity.
2.3 Find the Ballerina libraries of the selected types using the given context. Use ONLY the given context to find the libraries. 
3. For each selected type, find which fields of those types are required to answer the given question by referring to the given context. For each selected field; 
3.1 Understands the types of those fields by referring to the context. 
3.2 Context json has a link element which indicates the library name.
3.3 Make sure that you select those types and add to the output. When selecting those types pay attention to following:
3.3.1 For each new type, search the context and find the library which defines the new type. Use ONLY the given context to find the libraries. 
3.3.2 Add the found library and the types to the output. 
4. Once you select the types, please cross check and make sure they are placed under the correct library.
4.1 Go through each library and make sure they exist in the given context json.
4.2 Go through each library and verify the types by referring to the context.
4.2 Fix any issues found and try to re-identify the correct library the problematic type belongs to by referring to the context.
4.3 IT IS A MUST that you do these verification steps.
5. Simplify the type details as per the below rules.
5.1 Include only the type name in the context object. 
5.2 Include the name of the type as SAME as the original context.
6. For each selected type, Quote the original type from the context in the thinking field.
7. Respond using the Output format with the selected functions.

`;
    const getLibUserPrompt = "QUESTION\n```\n" + prompt + "\n```";

    const messages: ModelMessage[] = [
        { role: "system", content: getLibSystemPrompt },
        { role: "user", content: getLibUserPrompt },
    ];
    try {
        const { object } = await generateObject({
            model: await getAnthropicClient(ANTHROPIC_HAIKU),
            maxOutputTokens: 8192,
            temperature: 0,
            messages: messages,
            schema: getTypesResponseSchema,
            abortSignal: AIPanelAbortController.getInstance().signal,
        });

        const libList = object as GetTypesResponse;
        return libList.libraries;
    } catch (error) {
        throw new Error(`Failed to parse bulk functions response: ${error}`);
    }
}

function filteredTypes(typeDefinitions: TypeDefinition[]): MiniType[] {
    return typeDefinitions.map((typeDef) => ({
        name: typeDef.name,
        description: typeDef.description,
    }));
}
