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

import { ModelMessage, generateText, streamText, stepCountIs, AssistantModelMessage } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4, getProviderCacheControl, ProviderCacheOptions } from "../connection";
import { GenerationType, getAllLibraries } from "../libs/libs";
import { getLibraryProviderTool } from "../libs/libraryProviderTool";
import { anthropic } from "@ai-sdk/anthropic";
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
import { getProjectFromResponse, getProjectSource, postProcess } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { getRequirementAnalysisCodeGenPrefix, getRequirementAnalysisTestGenPrefix } from "./np_prompts";
import { handleTextEditorCommands } from "../libs/text_editor_tool";

function appendFinalMessages(
    history: ModelMessage[],
    finalMessages: ModelMessage[],
    cacheOptions: ProviderCacheOptions
): void {
    for (let i = 0; i < finalMessages.length - 1; i++) {
        const message = finalMessages[i];
        if (message.role === "assistant" || message.role === "tool") {
            if (i === finalMessages.length - 2) {
                message.providerOptions = cacheOptions;
            }
            history.push(message);
        }
    }
}

// Core code generation function that emits events
export async function generateCodeCore(params: GenerateCodeRequest, eventHandler: CopilotEventHandler): Promise<void> {
    const project: ProjectSource = await getProjectSource(params.operationType);
    const packageName = project.projectName;
    const sourceFiles: SourceFiles[] = transformProjectSource(project);
    let updatedSourceFiles: SourceFiles[] = [...sourceFiles];
    let updatedFileNames: string[] = [];
    const prompt = getRewrittenPrompt(params, sourceFiles);
    const historyMessages = populateHistory(params.chatHistory);
    const cacheOptions = await getProviderCacheControl();

    // Fetch all libraries for tool description
    const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
    const libraryDescriptions =
        allLibraries.length > 0
            ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
            : "- No libraries available";

    const allMessages: ModelMessage[] = [
        {
            role: "system",
            content: getSystemPromptPrefix(sourceFiles, params.operationType, GenerationType.CODE_GENERATION),
        },
        {
            role: "system",
            content: getSystemPromptSuffix(LANGLIBS),
            providerOptions: cacheOptions,
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
            providerOptions: cacheOptions,
            // Note: This cache control block can be removed if needed, as we use 3 out of 4 allowed cache blocks.
        },
    ];

    const tools = {
        LibraryProviderTool: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
        str_replace_editor: anthropic.tools.textEditor_20250728({
            async execute({ command, path, old_str, new_str, file_text, insert_line, view_range }) {
                const result = handleTextEditorCommands(updatedSourceFiles, updatedFileNames, 
                    { command, path, old_str, new_str, file_text, insert_line, view_range });
                return result.message;
            }
        })
    };

    const { fullStream, response } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 4096 * 4,
        temperature: 0,
        messages: allMessages,
        stopWhen: stepCountIs(10),
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    eventHandler({ type: "start" });
    let assistantResponse: string = "";
    let finalResponse: string = "";

    for await (const part of fullStream) {
        switch (part.type) {
            case "tool-call": {
                const toolName = part.toolName;
                console.log(`[Tool Call] Tool call started: ${toolName}`);
                eventHandler({ type: "tool_call", toolName });
                if (toolName == "LibraryProviderTool") {
                    assistantResponse += `\n\n<toolcall>Analyzing request & selecting libraries...</toolcall>`;
                }
                break;
            }
            case "tool-result": {
                const toolName = part.toolName;
                let toolResult: string[] = [];
                if (toolName == "LibraryProviderTool") {
                                    console.log(`[Tool Call] Tool call finished: ${toolName}`);
                    console.log(`[Tool Call] Tool call finished: ${toolName}`);
                    console.log(
                        "[LibraryProviderTool] Library Relevant trimmed functions By LibraryProviderTool Result: ",
                        part.output as Library[]
                    );
                    const libraryNames = (part.output as Library[]).map((lib) => lib.name);
                    assistantResponse = assistantResponse.replace(
                        `<toolcall>Analyzing request & selecting libraries...</toolcall>`,
                        `<toolcall>Fetched libraries: [${libraryNames.join(", ")}]</toolcall>`
                    );
                    toolResult = libraryNames;
                } else if (toolName == "str_replace_editor") {
                    console.log(`[Tool Call] Tool call finished: ${toolName}`);
                    break;
                }
                eventHandler({ type: "tool_result", toolName, libraryNames: toolResult });
                break;
            }
            case "text-delta": {
                assistantResponse += part.text;
                eventHandler({ type: "content_block", content: part.text });
                break;
            }
            case "error": {
                const error = part.error;
                console.error("Error during Code generation:", error);
                eventHandler({ type: "error", content: getErrorMessage(error) });
                break;
            }
            case "text-start": {
                if (assistantResponse !== "") {
                    eventHandler({ type: "content_block", content: " \n" });
                    assistantResponse += " \n";
                }
                break;
            }
            case "finish": {
                const finishReason = part.finishReason;
                console.log("Finish reason: ", finishReason);
                if (finishReason === "error") {
                    // Already handled in error case.
                    break;
                }

                const { messages: finalMessages } = await response;
                appendFinalMessages(allMessages, finalMessages, cacheOptions);

                const lastAssistantMessage = finalMessages
                    .slice()
                    .reverse()
                    .find((msg) => msg.role === "assistant");
                finalResponse = lastAssistantMessage
                    ? (lastAssistantMessage.content as any[]).find((c) => c.type === "text")?.text || finalResponse
                    : finalResponse;

                finalResponse = updateFinalResponseWithCodeBlocks(finalResponse, updatedSourceFiles, updatedFileNames);
                const postProcessedResp: PostProcessResponse = await postProcess({
                    assistant_response: finalResponse
                });

                finalResponse = postProcessedResp.assistant_response;
                let diagnostics: DiagnosticEntry[] = postProcessedResp.diagnostics.diagnostics;

                const MAX_REPAIR_ATTEMPTS = 3;
                let repair_attempt = 0;
                let diagnosticFixResp = finalResponse; //TODO: Check if we need this variable
                while (
                    hasCodeBlocks(diagnosticFixResp) &&
                    diagnostics.length > 0 &&
                    repair_attempt < MAX_REPAIR_ATTEMPTS
                ) {
                    console.log("Repair iteration: ", repair_attempt);
                    console.log("Diagnostics trying to fix: ", diagnostics);

                    const repairedResponse: RepairResponse = await repairCode(
                        {
                            previousMessages: allMessages,
                            assistantResponse: diagnosticFixResp,
                            diagnostics: diagnostics,
                        },
                        libraryDescriptions
                    );
                    diagnosticFixResp = repairedResponse.repairResponse;
                    diagnostics = repairedResponse.diagnostics;
                    repair_attempt++;
                }

                // Replace the final response segment in assistant response
                const lastAssistantMessageContent = lastAssistantMessage
                    ? (lastAssistantMessage.content as any[]).find((c) => c.type === "text")?.text || ""
                    : "";

                if (lastAssistantMessageContent && assistantResponse.includes(lastAssistantMessageContent)) {
                    assistantResponse = assistantResponse.replace(lastAssistantMessageContent, diagnosticFixResp);
                } else {
                    // Fallback: append the final response if replacement fails
                    assistantResponse += "\n\n" + diagnosticFixResp;
                }
                console.log("Final Diagnostics ", diagnostics);
                eventHandler({ type: "content_replace", content: assistantResponse });
                eventHandler({ type: "diagnostics", diagnostics: diagnostics });
                eventHandler({ type: "messages", messages: allMessages });
                eventHandler({ type: "stop", command: Command.Code });
                break;
            }
        }
    }
}

function updateFinalResponseWithCodeBlocks(finalResponse: string, updatedSourceFiles: SourceFiles[], updatedFileNames: string[]): string {
    const codeBlocks: string[] = [];

    for (const fileName of updatedFileNames) {
        const sourceFile = updatedSourceFiles.find(sf => sf.filePath === fileName);

        if (sourceFile) {
            const formattedBlock =
`<code filename="${sourceFile.filePath}">
\`\`\`ballerina
${sourceFile.content}
\`\`\`
</code>`;
            codeBlocks.push(formattedBlock);
        }
    }

    if (codeBlocks.length > 0) {
        return finalResponse + '\n\n' + codeBlocks.join('\n\n');
    }

    return finalResponse;
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

function getSystemPromptPrefix(sourceFiles: SourceFiles[], op: OperationType, generationType: GenerationType): string {
    const basePrompt = `You are an expert assistant specializing in Ballerina code generation. Your goal is to ONLY answer Ballerina related queries. You should always answer with accurate and functional Ballerina code that addresses the specified query while adhering to the constraints of the API documentation provided by the LibraryProviderTool.

# Instructions
- Analyze the user query to determine the required functionality.
- Do not include libraries unless they are explicitly needed for the query.
${
    generationType === GenerationType.HEALTHCARE_GENERATION
        ? "- For healthcare-related queries, ALWAYS include the following libraries in the LibraryProviderTool call in addition to those selected based on the query: ballerinax/health.base, ballerinax/health.fhir.r4, ballerinax/health.fhir.r4.parser, ballerinax/health.fhir.r4utils, ballerinax/health.fhir.r4.international401, ballerinax/health.hl7v2commons, ballerinax/health.hl7v2."
        : ""
}`;

    if (op === "CODE_FOR_USER_REQUIREMENT") {
        return getRequirementAnalysisCodeGenPrefix(extractResourceDocumentContent(sourceFiles));
    } else if (op === "TESTS_FOR_USER_REQUIREMENT") {
        return getRequirementAnalysisTestGenPrefix(extractResourceDocumentContent(sourceFiles));
    }
    return basePrompt;
}

function getSystemPromptSuffix(langlibs: Library[]) {
    return `You will be provided with default langlibs which are already imported in the Ballerina code.

Langlibs
<langlibs>
${JSON.stringify(langlibs)}
</langlibs>

If the query doesn't require code examples, answer the code by utilizing the API documentation (Tool Output).

If the query requires code, Follow these steps to generate the Ballerina code:

1. Carefully analyze the provided API documentation (Tool Output):
   - Identify the available libraries, clients, their functions, and their relevant types.

2. Thoroughly read and understand the given query:
   - Identify the main requirements and objectives of the integration.
   - Determine which libraries, functions, and their relevant records and types from the API documentation which are needed to achieve the query and ignore unused API docs.
   - Note the libraries needed to achieve the query and plan the control flow of the application based on input and output parameters of each function of the connector according to the API documentation.

3. Plan your code structure:
   - Decide which libraries need to be imported (Avoid importing lang.string, lang.boolean, lang.float, lang.decimal, lang.int, lang.map langlibs as they are already imported by default).
   - Determine the necessary client initialization.
   - Define Types needed for the query in the types.bal file.
   - Outline the service OR main function for the query.
   - Outline the required function usages as noted in Step 2.
   - Based on the types of identified functions, plan the data flow. Transform data as necessary.

4. Generate the Ballerina code:
   - Start with the required import statements IN EACH FILE that uses external libraries or types.
   - Each .bal file MUST include its own import statements for any external libraries, types, or clients it references.
   - Define required configurables for the query. Use only string, int, boolean types in configurable variables.
   - Initialize any necessary clients with the correct configuration at the module level (before any function or service declarations), resolving unions explicitly.
   - Implement the main function OR service to address the query requirements.
   - Use defined connectors based on the query by following the API documentation.
   - Use only the functions, types, and clients specified in the API documentation.
   - Use dot notation to access a normal function. Use -> to access a remote function or resource function.
   - Ensure proper error handling and type checking.
   - Do not invoke methods on json access expressions. Always use separate statements.
   - Use langlibs ONLY IF REQUIRED.

5. Review and refine your code:
   - Check that all query requirements are met.
   - Verify that you're only using elements from the provided API documentation, with unions resolved to avoid compiler errors.
   - Ensure the code follows Ballerina best practices and conventions, including type-safe handling of all return types and configurations.

Provide a brief explanation of how your code addresses the query and then output your generated Ballerina code.

Important reminders:
- Only use the libraries, functions, types, services, and clients specified in the provided API documentation.
- Always strictly respect the types given in the API Docs.
- Do not introduce any additional libraries or functions not mentioned in the API docs.
- Only use specified fields in records according to the API docs; this applies to array types of that record as well.
- Ensure your code is syntactically correct and follows Ballerina conventions.
- Do not use dynamic listener registrations.
- Do not write code in a way that requires updating/assigning values of function parameters.
- ALWAYS use two-word camel case identifiers (variable, function parameter, resource function parameter, and field names).
- If the library name contains a dot, always use an alias in the import statement (e.g., import org/package.one as one;).
- Treat generated connectors/clients inside the generated folder as submodules.
- A submodule MUST BE imported before being used. The import statement should only contain the package name and submodule name. For package my_pkg, folder structure generated/fooApi, the import should be \`import my_pkg.fooApi;\`.
- If the return parameter typedesc default value is marked as <> in the given API docs, define a custom record in the code that represents the data structure based on the use case and assign to it.
- Whenever you have a Json variable, NEVER access or manipulate Json variables. ALWAYS define a record and convert the Json to that record and use it.
- When invoking resource functions from a client, use the correct paths with accessor and parameters (e.g., exampleClient->/path1/["param"]/path2.get(key="value")).
- When accessing a field of a record, always assign it to a new variable and use that variable in the next statement.
- Avoid long comments in the code. Use // for single line comments.
- Always use named arguments when providing values to any parameter (e.g., .get(key="value")).
- Mention types EXPLICITLY in variable declarations and foreach statements.
- Do not modify the README.md file unless explicitly asked to be modified in the query.
- Do not add/modify toml files (Config.toml/Ballerina.toml) unless asked.
- In the library API documentation, if the service type is specified as generic, adhere to the instructions specified there on writing the service.
- For GraphQL service related queries, if the user hasn't specified their own GraphQL Schema, write the proposed GraphQL schema for the user query right after the explanation before generating the Ballerina code. Use the same names as the GraphQL Schema when defining record types.

Begin your response with the explanation. The explanation should detail the control flow decided in step 2, along with the selected libraries and their functions.
Once the explanation is finished, you must apply surgical edits to the existing source code using the **textEditor_20250728** tool.
The complete source code will be provided in the <existing_code> section of the user prompt.
If the file is already shown in the user prompt, do **not** try to create it again.
When making replacements inside an existing file, provide the **exact old string** and the **exact new string**, including all newlines, spaces, and indentation.

Your goal is to modify only the relevant parts of the code to address the user's query. 
Do not generate or modify any file types other than .bal. Politely decline if the query requests such cases.

- DO NOT mention if libraries are not required for the user query or task.
- Format responses using professional markdown with proper headings, lists, and styling
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

    return `QUERY: The query you need to answer.
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
        // Fetch all libraries for tool description
        const allLibraries = await getAllLibraries(GenerationType.CODE_GENERATION);
        const libraryDescriptions =
            allLibraries.length > 0
                ? allLibraries.map((lib) => `- ${lib.name}: ${lib.description}`).join("\n")
                : "- No libraries available";

        return await repairCodeCore(params, libraryDescriptions, eventHandler);
    } catch (error) {
        console.error("Error during code repair:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
    }
}

// Core repair function that emits events
export async function repairCodeCore(
    params: RepairParams,
    libraryDescriptions: string,
    eventHandler: CopilotEventHandler
): Promise<RepairResponse> {
    eventHandler({ type: "start" });
    const resp = await repairCode(params, libraryDescriptions);
    eventHandler({ type: "content_replace", content: resp.repairResponse });
    console.log("Manual Repair Diagnostics left: ", resp.diagnostics);
    eventHandler({ type: "diagnostics", diagnostics: resp.diagnostics });
    eventHandler({ type: "stop", command: undefined });
    return resp;
}

export async function repairCode(params: RepairParams, libraryDescriptions: string): Promise<RepairResponse> {
    const messages: ModelMessage[] = [...params.previousMessages];
    const lastMessage = messages[messages.length - 1];
    let isToolCallExistInLastMessage = false;
    let lastMessageToolCallInfo = {toolName: "", toolCallId: ""};

    const lastMessageIsAssistantCall = lastMessage?.role === 'assistant';
    if (lastMessageIsAssistantCall) {
        const assistantMessage: AssistantModelMessage = lastMessage as AssistantModelMessage;
        if (Array.isArray(assistantMessage.content)) {
            const lastToolCall = assistantMessage.content.filter(c => c.type === 'tool-call');
            isToolCallExistInLastMessage = lastToolCall.length > 0;
            lastMessageToolCallInfo = lastToolCall[0];
        }
    }

    const allMessages: ModelMessage[] = [
        ...params.previousMessages,
        !isToolCallExistInLastMessage? {
            role: "assistant",
            content: [
                {
                    type: "text",
                    text: params.assistantResponse
                }
            ]
        }: {
            role: "tool",
            content: [
                {
                    type: "tool-result",
                    toolName: lastMessageToolCallInfo?.toolName as string || "PreviousAssistantMessageCall",
                    result: params.assistantResponse,
                    toolCallId: lastMessageToolCallInfo?.toolCallId as string || "PreviousAssistantMessageCallId"
                }
            ]
        },
        {
            role: "user",
            content:
                "Generated code returns the following compiler errors. Using the library details from the LibraryProviderTool results in previous messages, first check the context and API documentation already provided in the conversation history before making new tool calls. Only use the LibraryProviderTool if additional library information is needed that wasn't covered in previous tool responses. Double-check all functions, types, and record field access for accuracy. Fix the compiler errors and return the corrected response. \n Errors: \n " +
                params.diagnostics.map((d) => d.message).join("\n"),
        },
    ];

    let updatedSourceFiles: SourceFiles[] = getProjectFromResponse(params.assistantResponse).sourceFiles;
    let updatedFileNames: string[] = [];

    const tools = {
        LibraryProviderTool: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
        str_replace_editor: anthropic.tools.textEditor_20250728({
            async execute({ command, path, old_str, new_str, file_text, insert_line, view_range }) {
                const result = handleTextEditorCommands(updatedSourceFiles, updatedFileNames, 
                    { command, path, old_str, new_str, file_text, insert_line, view_range });
                return result.message; 
            }
        })
    };

    const { text, usage, providerMetadata } = await generateText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 4096 * 4,
        temperature: 0,
        tools,
        messages: allMessages,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    const responseText = updateFinalResponseWithCodeBlocks(text, updatedSourceFiles, updatedFileNames);
    // replace original response with new code blocks
    let diagnosticFixResp = replaceCodeBlocks(params.assistantResponse, responseText);
    const postProcessResp: PostProcessResponse = await postProcess({
        assistant_response: diagnosticFixResp
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
