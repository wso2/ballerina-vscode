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

import { ModelMessage, generateText, streamText, stepCountIs } from "ai";
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

interface TextEditorResult {
    success: boolean;
    message: string;
    content?: string;
    error?: string;
}

function handleTextEditorCommands(
    updatedSourceFiles: SourceFiles[],
    updatedFileNames: string[],
    args: ExecuteArgs
): TextEditorResult {
    const { command, path: filePath, file_text, insert_line, new_str, old_str, view_range } = args;

    try {
        console.log(`[Text Editor] Command: '${command}', File: '${filePath}'`);

        // Validate file path for all commands
        const pathValidation = validateFilePath(filePath);
        if (!pathValidation.valid) {
            return {
                success: false,
                message: `Invalid file path: ${pathValidation.error}`,
                error: 'Error: INVALID_PATH'
            };
        }

        switch (command) {
            case TextEditorCommand.VIEW: {
                const content = getFileContent(updatedSourceFiles, filePath);
                
                // File not found error
                if (content === null) {
                    return {
                        success: false,
                        message: `File '${filePath}' not found. Please create it first or double check the file path.`,
                        error: 'Error: FILE_NOT_FOUND'
                    };
                }

                if (view_range && view_range.length === 2) {
                    const [start, end] = view_range;
                    const lines = content.split('\n');
                    
                    // Validate line range
                    if (start < 1 || end < start || start > lines.length) {
                        return {
                            success: false,
                            message: `Invalid line range [${start}, ${end}]. File has ${lines.length} lines. Please double check the range.`,
                            error: 'Error: INVALID_RANGE'
                        };
                    }

                    const rangedContent = lines.slice(start - 1, Math.min(end, lines.length)).join('\n');
                    return {
                        success: true,
                        message: `Viewing lines ${start}-${Math.min(end, lines.length)} of ${filePath}.`,
                        content: rangedContent
                    };
                }

                return {
                    success: true,
                    message: `Viewing entire file ${filePath}).`,
                    content
                };
            }

            case TextEditorCommand.CREATE: {
                if (file_text === undefined) {
                    return {
                        success: false,
                        message: "The 'file_text' parameter is required for the 'create' command.",
                        error: 'Error: MISSING_PARAMETER'
                    };
                }

                // Check if file already exists
                const existingFile = getFileContent(updatedSourceFiles, filePath);
                if (existingFile !== null) {
                    return {
                        success: false,
                        message: `File '${filePath}' already exists. Use 'str_replace' command to modify it or double check the filepath.`,
                        error: 'Error: FILE_ALREADY_EXISTS'
                    };
                }

                updateOrCreateFile(updatedSourceFiles, filePath, file_text);
                if (!updatedFileNames.includes(filePath)) {
                    updatedFileNames.push(filePath);
                }

                return {
                    success: true,
                    message: `Successfully created file '${filePath}' with ${file_text.split('\n').length} lines.`
                };
            }

            case TextEditorCommand.STR_REPLACE: {
                if (old_str === undefined || new_str === undefined) {
                    return {
                        success: false,
                        message: "Both 'old_str' and 'new_str' parameters are required for 'str_replace' command.",
                        error: 'Error: MISSING_PARAMETER'
                    };
                }

                const content = getFileContent(updatedSourceFiles, filePath);
                
                // File not found error
                if (content === null) {
                    return {
                        success: false,
                        message: `File '${filePath}' not found. Cannot perform replacement. double check the file path.`,
                        error: 'Error: FILE_NOT_FOUND'
                    };
                }

                // Count occurrences for validation
                const occurrenceCount = countOccurrences(content, old_str);

                // No matches for replacement
                if (occurrenceCount === 0) {
                    return {
                        success: false,
                        message: `String to replace was not found in '${filePath}'. Please verify the exact text to replace, including whitespace and line breaks.`,
                        error: 'Error: NO_MATCH_FOUND',
                        content: content.substring(0, 500) + '...'
                    };
                }

                // Multiple matches for replacement
                if (occurrenceCount > 1) {
                    return {
                        success: false,
                        message: `Found ${occurrenceCount} occurrences of the text in '${filePath}'. The 'str_replace' command requires exactly one unique match. Please make 'old_str' more specific..`,
                        error: 'Error: MULTIPLE_MATCHES',
                        content: `Occurrences: ${occurrenceCount}`
                    };
                }

                // Save to history before making changes
                saveToHistory(updatedSourceFiles, filePath);
                
                // Perform replacement (exactly one occurrence)
                const newContent = content.replace(`${old_str}`, new_str);
                updateOrCreateFile(updatedSourceFiles, filePath, newContent);
                
                if (!updatedFileNames.includes(filePath)) {
                    updatedFileNames.push(filePath);
                }

                return {
                    success: true,
                    message: `Successfully replaced text in '${filePath}'. Changed ${old_str.split('\n').length} line(s).`
                };
            }

            case TextEditorCommand.INSERT: {
                if (insert_line === undefined || new_str === undefined) {
                    return {
                        success: false,
                        message: "Both 'insert_line' and 'new_str' parameters are required for 'insert' command.",
                        error: 'Error: MISSING_PARAMETER'
                    };
                }

                const content = getFileContent(updatedSourceFiles, filePath);
                
                // File not found error
                if (content === null) {
                    return {
                        success: false,
                        message: `File '${filePath}' not found. Cannot insert text.`,
                        error: 'Error: FILE_NOT_FOUND'
                    };
                }

                const lines = content.split('\n');
                
                // Validate insert line
                if (insert_line < 0 || insert_line > lines.length) {
                    return {
                        success: false,
                        message: `Invalid insert line ${insert_line}. File has ${lines.length} lines. Use line 0-${lines.length}.`,
                        error: 'Error: INVALID_LINE_NUMBER'
                    };
                }

                // Save to history before making changes
                saveToHistory(updatedSourceFiles, filePath);

                const clampedLine = Math.max(0, Math.min(lines.length, insert_line));
                lines.splice(clampedLine, 0, new_str);
                const newContent = lines.join('\n');

                updateOrCreateFile(updatedSourceFiles, filePath, newContent);
                
                if (!updatedFileNames.includes(filePath)) {
                    updatedFileNames.push(filePath);
                }

                return {
                    success: true,
                    message: `Successfully inserted ${new_str.split('\n').length} line(s) at line ${insert_line} in '${filePath}'.`
                };
            }

            case TextEditorCommand.DELETE: {
                if (old_str === undefined) {
                    return {
                        success: false,
                        message: "The 'old_str' parameter is required for 'delete' command.",
                        error: 'Error: MISSING_PARAMETER'
                    };
                }

                const content = getFileContent(updatedSourceFiles, filePath);
                
                // File not found error
                if (content === null) {
                    return {
                        success: false,
                        message: `File '${filePath}' not found. Cannot delete text.`,
                        error: 'Error: FILE_NOT_FOUND'
                    };
                }

                const occurrenceCount = countOccurrences(content, old_str);

                // No matches found
                if (occurrenceCount === 0) {
                    return {
                        success: false,
                        message: `String to delete was not found in '${filePath}'. No changes made. Double check the text to delete, including whitespace and line breaks.`,
                        error: 'Error: NO_MATCH_FOUND'
                    };
                }

                // Save to history before making changes
                saveToHistory(updatedSourceFiles, filePath);

                const newContent = content.replaceAll(old_str, '');
                updateOrCreateFile(updatedSourceFiles, filePath, newContent);
                
                if (!updatedFileNames.includes(filePath)) {
                    updatedFileNames.push(filePath);
                }

                return {
                    success: true,
                    message: `Successfully deleted ${occurrenceCount} occurrence(s) of text from '${filePath}'.`
                };
            }

            case TextEditorCommand.UNDO_EDIT: {
                const history = editHistory.get(filePath);
                
                if (!history || history.length === 0) {
                    return {
                        success: false,
                        message: `No edit history found for '${filePath}'. Cannot undo.`,
                        error: 'NO_HISTORY'
                    };
                }

                const lastState = history.pop()!;
                updateOrCreateFile(updatedSourceFiles, filePath, lastState);
                
                if (!updatedFileNames.includes(filePath)) {
                    updatedFileNames.push(filePath);
                }

                return {
                    success: true,
                    message: `Successfully undid last edit on '${filePath}'. ${history.length} undo(s) remaining.`
                };
            }

            default:
                return {
                    success: false,
                    message: `Unknown command '${command}'. Valid commands: view, create, str_replace, insert, delete, undo_edit.`,
                    error: 'INVALID_COMMAND'
                };
        }
    } catch (error) {
        // Catch any unexpected errors
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error(`[Text Editor] Failed to execute '${command}':`, error);
        
        // Check for permission errors (if you have file system access)
        if (errorMessage.includes('EACCES') || errorMessage.includes('EPERM')) {
            return {
                success: false,
                message: `Permission denied: Cannot access '${filePath}'. Check file permissions.`,
                error: 'PERMISSION_DENIED'
            };
        }

        return {
            success: false,
            message: `Error executing '${command}': ${errorMessage}`,
            error: 'EXECUTION_ERROR'
        };
    }
}

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
        str_replace_editor: anthropic.tools.textEditor_20250124({
            async execute({ command, path, old_str, new_str, file_text, insert_line, view_range }) {
                const result = handleTextEditorCommands(updatedSourceFiles, updatedFileNames, 
                    { command, path, old_str, new_str, file_text, insert_line, view_range });
                return result;
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
                } else {
                    // assistantResponse += `\n\n<toolcall>Applying code changes to the project files...</toolcall>`;
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
                    toolResult = libraryNames
                } else if (toolName == "str_replace_editor") {
                    console.log(`[Tool Call] Tool call finished: ${toolName}`);
                    toolResult = [updatedFileNames[updatedFileNames.length - 1]];
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
Once the explanation is finished, you must apply surgical edits to the existing source code using the **text_editor_20250124** tool.
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
    const allMessages: ModelMessage[] = [
        ...params.previousMessages,
        {
            role: "assistant",
            content: params.assistantResponse,
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
        str_replace_editor: anthropic.tools.textEditor_20250124({
            async execute({ command, path, old_str, new_str, file_text, insert_line, view_range }) {
                const result = handleTextEditorCommands(updatedSourceFiles, updatedFileNames, 
                    { command, path, old_str, new_str, file_text, insert_line, view_range });
                return result; 
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

enum TextEditorCommand {
    VIEW = 'view',
    CREATE = 'create',
    STR_REPLACE = 'str_replace',
    INSERT = 'insert',
    DELETE = 'delete',
    UNDO_EDIT = 'undo_edit'
}

interface ExecuteArgs {
    command: string;
    path: string;
    file_text?: string;
    insert_line?: number;
    new_str?: string;
    old_str?: string;
    view_range?: number[];
}

const editHistory = new Map<string, string[]>();
const MAX_HISTORY_SIZE = 50;

function saveToHistory(
    updatedSourceFiles: SourceFiles[],
    filePath: string
): void {
    const sourceFile = updatedSourceFiles.find(f => f.filePath === filePath);
    if (!sourceFile) { return; }

    if (!editHistory.has(filePath)) {
        editHistory.set(filePath, []);
    }

    const history = editHistory.get(filePath)!;
    history.push(sourceFile.content);

    if (history.length > MAX_HISTORY_SIZE) {
        history.shift();
    }
}

function validateFilePath(filePath: string): { valid: boolean; error?: string } {
    if (!filePath || typeof filePath !== 'string') {
        return { valid: false, error: 'File path is required and must be a string.' };
    }

    if (filePath.includes('..') || filePath.includes('~')) {
        return { valid: false, error: 'File path contains invalid characters (.., ~).' };
    }

    const validExtensions = ['.bal', '.toml', '.md'];
    const hasValidExtension = validExtensions.some(ext => filePath.endsWith(ext));
    
    if (!hasValidExtension) {
        return { valid: false, error: `File must have a valid extension: ${validExtensions.join(', ')}` };
    }

    return { valid: true };
}

function findFileIndex(files: SourceFiles[], filePath: string): number {
    return files.findIndex(f => f.filePath === filePath);
}

function getFileContent(files: SourceFiles[], filePath: string): string {
    const file = files.find(f => f.filePath === filePath);
    return file?.content ?? null;
}

function countOccurrences(text: string, searchString: string): number {
    if (searchString.trim().length == 0 && text.trim().length == 0) {
        return 1; // Edge case: empty string occurs once in an empty string
    }

    if (!searchString) { return 0; }
    let count = 0;
    let position = 0;
    
    while ((position = text.indexOf(`${searchString}`, position)) !== -1) {
        count++;
        if (count > 1) {
            break;
        }
        position += searchString.length;
    }
    
    return count;
}

function updateOrCreateFile(
    files: SourceFiles[],
    filePath: string,
    content: string
): void {
    const index = findFileIndex(files, filePath);
    if (index !== -1) {
        files[index].content = content;
    } else {
        files.push({ filePath, content });
    }
}
