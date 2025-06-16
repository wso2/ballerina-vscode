import { CoreMessage, generateObject, generateText, streamText } from "ai";
import { anthropic } from "../connection";
import { GenerationType, getRelevantLibrariesAndFunctions } from "../libs/libs";
import { getReadmeQuery, populateHistory, transformProjectSource, getErrorMessage } from "../utils";
import { getMaximizedSelectedLibs, libraryContains, selectRequiredFunctions, toMaximizedLibrariesFromLibJson } from "../libs/funcs";
import { GetFunctionResponse, GetFunctionsRequest, getFunctionsResponseSchema } from "../libs/funcs_inter_types";
import { LANGLIBS } from "../libs/langlibs";
import { GetTypeResponse, GetTypesRequest, GetTypesResponse, getTypesResponseSchema, Library, MiniType, TypeDefinition } from "../libs/libs_types";
import { ChatNotify, DiagnosticEntry, FileAttatchment, GenerateCodeRequest, onChatNotify, PostProcessResponse, ProjectDiagnostics, ProjectSource, RepairParams, RepairResponse, SourceFiles } from "@wso2/ballerina-core";
import { getProjectSource, postProcess } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";

// Core healthcare code generation function that emits events
export async function generateHealthcareCodeCore(params: GenerateCodeRequest, eventHandler: CopilotEventHandler): Promise<void> {
    const project: ProjectSource = await getProjectSource("CODE_GENERATION");
    const sourceFiles: SourceFiles[] = transformProjectSource(project);
    const prompt = getReadmeQuery(params, sourceFiles);
    const relevantTrimmedFuncs: Library[] = (await getRelevantLibrariesAndFunctions({query:prompt}, GenerationType.HEALTHCARE_GENERATION)).libraries;

    const historyMessages = populateHistory(params.chatHistory);

    const allMessages: CoreMessage[] = [
            {
                role: "system",
                content: getSystemPromptPrefix(relevantTrimmedFuncs),
            },
            {
                role: "system",
                content: getSystemPromptSuffix(LANGLIBS, [], sourceFiles, params.fileAttachmentContents, prompt),
                providerOptions: {
                    anthropic: { cacheControl: { type: "ephemeral" } },
                },
            },
            ...historyMessages,
            {
                role: "user",
                content: prompt,
                providerOptions: {
                    anthropic: { cacheControl: { type: "ephemeral" } },
                },
            },
    ];

    try {
        const { fullStream } = streamText({
            model: anthropic("claude-3-5-sonnet-20241022"),
            maxTokens: 4096,
            temperature: 0,
            messages: allMessages,
        });

        eventHandler({ type: 'start' });
        let assistantResponse: string = "";
        for await (const part of fullStream) {
            switch (part.type) {
                case "text-delta": {
                    const textPart = part.textDelta;
                    assistantResponse += textPart;
                    eventHandler({ type: 'content_block', content: textPart });
                    break;
                }
                case "error": {
                    const error = part.error;
                    console.error("Error during Code generation:", error);
                    eventHandler({ type: 'error', content: getErrorMessage(error) });
                    break;
                }
                case "finish": {
                    const finishReason = part.finishReason;
                    const postProcessedResp: PostProcessResponse = await postProcess({
                        assistant_response: assistantResponse
                    });
                    assistantResponse = postProcessedResp.assistant_response;

                    eventHandler({ type: 'content_replace', content: assistantResponse });
                    eventHandler({ type: 'stop' });
                    break;
                }
            }
        }
    } catch (error) {
        console.error("Error during Healthcare code generation:", error);
        eventHandler({ type: 'error', content: getErrorMessage(error) });
    }
}

// Main public function that uses the default event handler
export async function generateHealthcareCode(params: GenerateCodeRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler();
    await generateHealthcareCodeCore(params, eventHandler);
}

function getSystemPromptPrefix(apidocs: Library[]) {
    return `You are an expert assistant who specializes in writing Ballerina code for healthcare integrations. Your goal is to ONLY answer Ballerina related queries. You should always answer with accurate and functional Ballerina code that addresses the specified query while thinking step-by-step and following the instructions provided.

First, review and learn about the Ballerina libraries available for healthcare integration scenarios:
<healthcare_docs>
${JSON.stringify(apidocs)}
</healthcare_docs>
`;
}

function getSystemPromptSuffix(langlibs: Library[], types: string[], existingCode: SourceFiles[], fileUploadContents: FileAttatchment[], usecase: string): string {
    return `Then, learn and understand the core Ballerina language libraries, the types and the functions they offer: 
<langlibs>
${JSON.stringify(langlibs)}
</langlibs>

Consider the following types and their corresponding libraries when generating the code:
<types>
${JSON.stringify(types)}
</types>
If you require these types, you have to import the corresponding libraries related to the selected types. 

Have a look and understand the current healthcare integrations that the user is being working on:
<existing_code>
${JSON.stringify(existingCode)}
</existing_code>

Read and try to understand the files user have attached to the query:
${JSON.stringify(fileUploadContents)}

Now, consider this user query that explains the healthcare integration requirement to be considered when generating the Ballerina code:
<query>
${usecase}
</query>

Your goal is to generate accurate Ballerina code for the given query considering the knowledge you have, existing code and the files that are uploaded. I encourage you to plan the implementation first, before start writing code. Follow these steps in order:
- planning_phase
- writing_code phase
- verify_code phase
- generate_output phase

<planning_phase>
Think step-by-step and plan your code generation flow. Follow these steps when planning the code generation task:

1. Understand whether the query requires code generation or not. If no code generation is required, skip the planning and codegen phases and answer the query based on your current understanding. 
2. Deeply understand the query that requires code generation. Follow these steps:
 - Carefully read and analyze the query.
 - Identify input requirements, expected outputs, and constraints.
 - Clarify any ambiguities, take judgemental calls and take necessary assumptions. Write down your assumptions.  
3. Break the Problem Down. Follow these steps:
 - Decompose the problem into smaller, manageable parts.
 - Identify dependencies between different components.
4. Identify Edge Cases and Constraints. Follow these steps:
 - Consider boundary conditions (e.g., empty inputs, large datasets).
 - Identify performance constraints like time complexity and memory usage.
5. Choose the Right Approach. Follow these steps:
 - Determine if existing algorithms or data structures can be applied.
 - Select an optimal approach.
6. Design the Solution. Follow these steps:
 - Create a high-level algorithm or flowchart.
 - Define the key functions, data structures, and logic required.
 - Identify whether these required functions, data structures are already available through the knowledge you have. 
 - Identify the model objects and use the types provided as much as possible.
 - Identify the required libraries. Note the special Ballerina libraries that you ALWAYS have to import into your code:
      <imports>
      import ballerinax/health.fhir.r4.international401 as international401;
      import ballerinax/health.fhir.r4 as r4;
      import ballerinax/health.fhir.r4.parser as parser;
      import ballerina/io as io;
      import ballerinax/health.hl7v2 as hl7v2;
      import ballerinax/health.hl7v2commons as hl7v2commons;
      </imports>
7. Write Pseudocode. Follow these steps:
 - Draft a step-by-step logical representation of the solution.
 - This helps validate the logic before coding.
8. Review and Iterate. Follow these steps:
 - Validate whether you covered the requirements collected in step 2. 
 - Plan any thing you missed using the steps in the planning phase.
</planning_phase>

<writing_code>
Think step-by-step and start writing code. Adhere to the outcomes of the planning phase and follow these steps:
  - You are writing a Ballerina program. 
    Important reminders:
      - Only use the libraries, functions, types, and clients specified in the provided healthcare docs and types.
      - Always strictly respect the types given in the types section.
      - Do not introduce any additional libraries or functions not mentioned in the healthcare docs.
      - Only use specified fields in records according to the healthcare docs. this applies to array types of that record as well.
      - Ensure your code is syntactically correct and follows Ballerina conventions.
      - Do not use dynamic listener registrations.
      - Do not write code in a way that requires updating/assigning values of function parameters.
      - ALWAYS Use two words camel case identifiers (variable, function parameter, resource function parameter and field names).
      - If the library name contains a . Always use an alias in the import statement. 
        To find the alias, split the library name from . and get the last element of the array as the name of the alias.
      - If the return parameter typedesc default value is marked as <> in the given API docs, define a custom record in the code that represents the data structure based on the use case and assign to it. 
      - Whenever you have a Json variable, NEVER access or manipulate Json variables. ALWAYS define a record and convert the Json to that record and use it.
      - When you are accessing fields of a record, always assign it into new variables.
      - Avoid long comments in the code.
      - Always use named arguments when providing values to any parameter. (eg: .get(key="value"))
      _ Do not use var keyword (variable declarations, for loops ...). Use explicit types instead.
      - Do not modify the README.md file unless asked to be modified explicitly in the query.
      - Do not add/modify toml files(Config.toml/Ballerina.toml) unless asked.
  - Start with the required import statements. Add all the must to have imports mentioned in Step 6 of the planning phase section.
  - Define required configurables for the query. Use only string, int, boolean types in configurable variables.
  - Initialize any necessary clients with the correct configuration at the module level (before any function or service declarations).
  - Implement the main function OR service to address the query requirements.
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
      Note the use of \`Album\` instead of a json payload etc.
  - Use defined connectors based on the query by following the healthcare docs.
  - Use only the functions, types, and clients specified in the healthcare docs.
  - Use dot notation to access a normal function. Use -> to access a remote function or resource function.
  - Ensure proper error handling and type checking.
  - Do not invoke methods on json access expressions. Always Use separate statements.
<writing_code>

<verify_code>
  Review and refine your code. Follow the steps below:
    - Check that all query requirements are met.
    - Make sure the special imports noted in step 6 of the planning phase are added in the code.
    - Verify that you are only using elements from the provided healthcare docs.
    - Ensure all the imports are properly specified and accurate.
    - Make sure the types of the variables are correct based on the types specified in the types section. DOUBLE CHECK and FIX any incorrect imports. ALWAYS respect the <types> section.
    - Ensure the code follows Ballerina best practices and conventions.
</verify_code>

<generate_output>
  Begin your response with the very high level explanation about overall changes, then end the response with the codeblock segments(if any). Each file which needs modifications, should have a codeblock segment and it MUST have complete file content with the proposed change. Do not provide any explanation after codeblocks.


  Example Codeblock segment:
  If the generated code is a service, use an appropriate name for the file. Use \`service\` as a prefix to the file name. Example:
  <code filename="service_abc.bal">
  \`\`\ballerina
  //code goes here
  \`\`\
  </code>

  If the generated code is a main function, use an appropriate name for the file. Use \`service\` as a prefix to the file name. Example:
  <code filename="main_abc.bal">
  \`\`\ballerina
  //code goes here
  \`\`\
  </code>
</generate_output>
`;
}

export async function getRequiredTypesFromLibJson(libraries: string[], prompt: string, librariesJson: Library[]): Promise<GetTypeResponse[]> {
    if (librariesJson.length === 0) {
        return [];
    }

    const typeDefs: GetTypesRequest[] = librariesJson
        .filter(lib => libraryContains(lib.name, libraries))
        .map(lib => ({
            name: lib.name,
            description: lib.description,
            types: filteredTypes(lib.typeDefs)
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

    const messages: CoreMessage[] = [
        { role: "system", content: getLibSystemPrompt },
        { role: "user", content: getLibUserPrompt }
    ];
    try {
        const { object } = await generateObject({
            model: anthropic("claude-3-5-haiku-20241022"),
            maxTokens: 8192,
            temperature: 0,
            messages: messages,
            schema: getTypesResponseSchema
        });

        const libList = object as GetTypesResponse;
        return libList.libraries;
    } catch (error) {
        throw new Error(`Failed to parse bulk functions response: ${error}`);
    }
}

function filteredTypes(typeDefinitions: TypeDefinition[]): MiniType[] {
    return typeDefinitions.map(typeDef => ({
        name: typeDef.name,
        description: typeDef.description
    }));
}
