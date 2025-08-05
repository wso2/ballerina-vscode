import { CoreMessage, generateText, streamText } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../connection";
import { GenerationType, getAllLibraries } from "../libs/libs";
import { getLibraryProviderTool } from "../libs/libraryProviderTool";
import {
    getRewrittenPrompt,
    populateHistory,
    transformProjectSource,
    getErrorMessage,
    extractResourceDocumentContent,
} from "../utils";
import { LANGLIBS } from "./../libs/langlibs";
import { Library } from "./../libs/libs_types";
import {
    DiagnosticEntry,
    FileAttatchment,
    GenerateCodeRequest,
    OperationType,
    PostProcessResponse,
    ProjectSource,
    RepairParams,
    RepairResponse,
    SourceFiles,
    Command,
} from "@wso2/ballerina-core";
import { getProjectSource, postProcess } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { getRequirementAnalysisCodeGenPrefix, getRequirementAnalysisTestGenPrefix } from "./np_prompts";

// Core code generation function that emits events
export async function generateCodeCore(params: GenerateCodeRequest, eventHandler: CopilotEventHandler): Promise<void> {
    const project: ProjectSource = await getProjectSource(params.operationType);
    const packageName = project.projectName;
    const sourceFiles: SourceFiles[] = transformProjectSource(project);
    const prompt = getRewrittenPrompt(params, sourceFiles);
    const historyMessages = populateHistory(params.chatHistory);

    // Fetch all libraries for tool description
    const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
    const libraryDescriptions =
        allLibraries.length > 0
            ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
            : "- No libraries available";

    const allMessages: CoreMessage[] = [
        {
            role: "system",
            content: `${getSystemPromptPrefix([], sourceFiles, params.operationType)}
${getSystemPromptSuffix(LANGLIBS)}`,
        },
        ...historyMessages,
        {
            role: "user",
            content: getUserPrompt(
                prompt,
                sourceFiles,
                params.fileAttachmentContents,
                packageName,
                params.operationType
            ),
        },
    ];

    const tools = {
        LibraryProviderTool: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
    };


    const { fullStream } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxTokens: 4096 * 4,
        temperature: 0,
        messages: allMessages,
        maxSteps: 10,
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    eventHandler({ type: "start" });
    let assistantResponse: string = "";
    for await (const part of fullStream) {
        switch (part.type) {
            case "text-delta": {
                const textPart = part.textDelta;
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
                    break;
                }
                const postProcessedResp: PostProcessResponse = await postProcess({
                    assistant_response: assistantResponse,
                });
                assistantResponse = postProcessedResp.assistant_response;
                let diagnostics: DiagnosticEntry[] = postProcessedResp.diagnostics.diagnostics;

                const MAX_REPAIR_ATTEMPTS = 3;
                let repair_attempt = 0;
                let diagnosticFixResp = assistantResponse;
                while (
                    hasCodeBlocks(diagnosticFixResp) &&
                    diagnostics.length > 0 &&
                    repair_attempt < MAX_REPAIR_ATTEMPTS
                ) {
                    console.log("Repair iteration: ", repair_attempt);
                    console.log("Diagnostics trying to fix: ", diagnostics);

                    const repairedResponse: RepairResponse = await repairCode({
                        previousMessages: allMessages,
                        assistantResponse: diagnosticFixResp,
                        diagnostics: diagnostics,
                    });
                    diagnosticFixResp = repairedResponse.repairResponse;
                    diagnostics = repairedResponse.diagnostics;
                    repair_attempt++;
                }
                console.log("Final Diagnostics ", diagnostics);
                eventHandler({ type: "content_replace", content: diagnosticFixResp });
                eventHandler({ type: "diagnostics", diagnostics: diagnostics });
                eventHandler({ type: "messages", messages: allMessages });
                eventHandler({ type: "stop", command: Command.Code });
                break;
            }
        }
    }
}

// Main public function that uses the default event handler
export async function generateCode(params: GenerateCodeRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.Code);
    try {
        await generateCodeCore(params, eventHandler);
    } catch (error) {
        console.error("Error during code generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}

function getSystemPromptPrefix(apidocs: Library[], sourceFiles: SourceFiles[], op: OperationType): string {
    if (op === "CODE_FOR_USER_REQUIREMENT") {
        return (
            getRequirementAnalysisCodeGenPrefix([], extractResourceDocumentContent(sourceFiles)) +
            `\nUse the LibraryProviderTool to fetch library details when needed. Do not assume library contents unless provided by the tool.`
        );
    } else if (op === "TESTS_FOR_USER_REQUIREMENT") {
        return (
            getRequirementAnalysisTestGenPrefix([], extractResourceDocumentContent(sourceFiles)) +
            `\nUse the LibraryProviderTool to fetch library details when needed. Do not assume library contents unless provided by the tool.`
        );
    }
    return `You are an expert assistant specializing in Ballerina code generation. Use the LibraryProviderTool to fetch library details (name, description, clients, functions, types) when needed. Generate accurate Ballerina code based on the query and tool output, adhering to Ballerina conventions.`;
}

function getSystemPromptSuffix(langlibs: Library[]) {
    return `2. Langlibs
<langlibs>
${JSON.stringify(langlibs)}
</langlibs>

If the query doesn't require code examples, answer the code by utilizing the api documentation.
If the query requires code, Follow these steps to generate the Ballerina code:

1. Carefully analyze the provided API documentation:
   - Identify the available libraries, clients, their functions and their relevant types.

2. Thoroughly read and understand the given query:
   - Identify the main requirements and objectives of the integration.
   - Determine which libraries, functions and their relevant records and types from the API documentation which are needed to achieve the query and forget about unused API docs.
   - Note the libraries needed to achieve the query and plan the control flow of the application based input and output parameters of each function of the connector according to the API documentation.

3. Plan your code structure:
   - Decide which libraries need to be imported (Avoid importing lang.string, lang.boolean, lang.float, lang.decimal, lang.int, lang.map langlibs as they are already imported by default).
   - Determine the necessary client initialization.
   - Define Types needed for the query in the types.bal file.
   - Outline the service OR main function for the query.
   - Outline the required function usages as noted in Step 2.
   - Based on the types of identified functions, plan the data flow. Transform data as necessary.

4. Generate the Ballerina code:
   - Start with the required import statements.
   - Define required configurables for the query. Use only string, int, boolean types in configurable variables.
   - Initialize any necessary clients with the correct configuration at the module level(before any function or service declarations).
   - Implement the main function OR service to address the query requirements.
   - Use defined connectors based on the query by following the API documentation.
   - Use only the functions, types, and clients specified in the API documentation.
   - Use dot notation to access a normal function. Use -> to access a remote function or resource function.
   - Ensure proper error handling and type checking.
   - Do not invoke methods on json access expressions. Always use separate statements.
   - Use langlibs ONLY IF REQUIRED.

5. Review and refine your code:
   - Check that all query requirements are met.
   - Verify that you're only using elements from the provided API documentation.
   - Ensure the code follows Ballerina best practices and conventions.

Provide a brief explanation of how your code addresses the query and then output your generated Ballerina code.

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
- A submodule MUST BE imported before being used.  The import statement should only contain the package name and submodule name.  For package my_pkg, folder structure generated/fooApi the import should be \`import my_pkg.fooApi;\`
- If the return parameter typedesc default value is marked as <> in the given API docs, define a custom record in the code that represents the data structure based on the use case and assign to it.
- Whenever you have a Json variable, NEVER access or manipulate Json variables. ALWAYS define a record and convert the Json to that record and use it.
- When invoking resource function from a client, use the correct paths with accessor and parameters. (eg: exampleClient->/path1/["param"]/path2.get(key="value"))
- When you are accessing a field of a record, always assign it into new variable and use that variable in the next statement.
- Avoid long comments in the code. Use // for single line comments.
- Always use named arguments when providing values to any parameter. (eg: .get(key="value"))
- Mention types EXPLICITLY in variable declarations and foreach statements.
- Do not modify the README.md file unless asked to be modified explicitly in the query.
- Do not add/modify toml files(Config.toml/Ballerina.toml) unless asked.
- In the library API documentation if the service type is specified as generic, adhere to the instructions specified there on writing the service.
- For GraphQL service related queries, If the user haven't specified their own GraphQL Schema, Write the proposed GraphQL schema for the user query right after explanation before generating the Ballerina code. Use same names as the GraphQL Schema when defining record types.

Begin your response with the explanation, once the entire explanation is finished only, include codeblock segments(if any) in the end of the response.
The explanation should explain the control flow decided in step 2, along with the selected libraries and their functions.

Each file which needs modifications, should have a codeblock segment and it MUST have complete file content with the proposed change.
The codeblock segments should only have .bal contents and it should not generate or modify any other file types. Politely decline if the query requests for such cases.

Example Codeblock segment:
<code filename="main.bal">
\`\`\`ballerina
//code goes here
\`\`\`
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
        fileInstructions = `4. File Upload Contents. : Contents of the file which the user uploaded as additional information for the query.

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

export async function triggerGeneratedCodeRepair(params: RepairParams): Promise<RepairResponse> {
    // add null as the command since this is a repair operation is not a command
    const eventHandler = createWebviewEventHandler(undefined);
    try {
        return await repairCodeCore(params, eventHandler);
    } catch (error) {
        console.error("Error during code repair:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}

// Core repair function that emits events
export async function repairCodeCore(params: RepairParams, eventHandler: CopilotEventHandler): Promise<RepairResponse> {
    eventHandler({ type: "start" });
    const resp = await repairCode(params);
    eventHandler({ type: "content_replace", content: resp.repairResponse });
    console.log("Manual Repair Diagnostics left: ", resp.diagnostics);
    eventHandler({ type: "diagnostics", diagnostics: resp.diagnostics });
    eventHandler({ type: "stop", command: undefined });
    return resp;
}

export async function repairCode(params: RepairParams): Promise<RepairResponse> {
    const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
    const libraryDescriptions =
        allLibraries.length > 0
            ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
            : "- No libraries available";

    const allMessages: CoreMessage[] = [
        {
            role: "system",
            content: `${getSystemPromptPrefix([], [], "CODE_GENERATION")}
${getSystemPromptSuffix(LANGLIBS)}`,
        },
        ...params.previousMessages,
        {
            role: "assistant",
            content: params.assistantResponse,
        },
        {
            role: "user",
            content:
                "Generated code returns following errors. Double-check all functions, types, record field access against the API documentation again. Fix the compiler errors and return the new response. \n Errors: \n " +
                params.diagnostics.map((d) => d.message).join("\n"),
        },
    ];

    const tools = {
        LibraryProviderTool: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
    };

    const { text, usage, providerMetadata } = await generateText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxTokens: 4096 * 4,
        temperature: 0,
        messages: allMessages,
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    // replace original response with new code blocks
    let diagnosticFixResp = replaceCodeBlocks(params.assistantResponse, text);
    const postProcessResp: PostProcessResponse = await postProcess({
        assistant_response: diagnosticFixResp,
    });
    diagnosticFixResp = postProcessResp.assistant_response;
    console.log("After auto repair, Diagnostics : ", postProcessResp.diagnostics.diagnostics);

    return { repairResponse: diagnosticFixResp, diagnostics: postProcessResp.diagnostics.diagnostics };
}

export function stringifyExistingCode(existingCode: SourceFiles[], op: OperationType): string {
    let existingCodeStr = "";
    for (const file of existingCode) {
        const filePath = file.filePath;
        if (op !== "CODE_GENERATION" && !filePath.endsWith(".bal")) {
            continue;
        }

        existingCodeStr = existingCodeStr + "filepath : " + filePath + "\n";
        existingCodeStr = existingCodeStr + file.content + "\n";
    }
    return existingCodeStr;
}

export function hasCodeBlocks(text: string) {
    const codeBlockRegex = /<code[^>]*>[\s\S]*?<\/code>/i;
    return codeBlockRegex.test(text);
}

export function replaceCodeBlocks(originalResp: string, newResp: string): string {
    // Create a map to store new code blocks by filename
    const newCodeBlocks = new Map<string, string>();

    // Extract code blocks from newResp
    const newCodeRegex = /<code filename="(.+?)">\s*```ballerina\s*([\s\S]*?)```\s*<\/code>/g;
    let match;
    while ((match = newCodeRegex.exec(newResp)) !== null) {
        newCodeBlocks.set(match[1], match[2].trim());
    }

    // Replace code blocks in originalResp
    const updatedResp = originalResp.replace(
        /<code filename="(.+?)">\s*```ballerina\s*([\s\S]*?)```\s*<\/code>/g,
        (match, filename, content) => {
            const newContent = newCodeBlocks.get(filename);
            if (newContent !== undefined) {
                return `<code filename="${filename}">\n\`\`\`ballerina\n${newContent}\n\`\`\`\n</code>`;
            }
            return match; // If no new content, keep the original
        }
    );

    // Remove replaced code blocks from newCodeBlocks
    const originalCodeRegex = /<code filename="(.+?)">/g;
    while ((match = originalCodeRegex.exec(originalResp)) !== null) {
        newCodeBlocks.delete(match[1]);
    }

    // Append any remaining new code blocks
    let finalResp = updatedResp;
    newCodeBlocks.forEach((content, filename) => {
        finalResp += `\n\n<code filename="${filename}">\n\`\`\`ballerina\n${content}\n\`\`\`\n</code>`;
    });

    return finalResp;
}
