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
import {
    getRewrittenPrompt,
    populateHistory,
    flattenProjectToFiles,
    getErrorMessage,
    extractResourceDocumentContent,
    parseSourceFilesFromXML,
    buildFilePaths,
    buildPackageContext,
    formatFileUploadContents,
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
    SourceFile,
    Command,
} from "@wso2/ballerina-core";
import { getProjectSource, postProcess } from "../../../../rpc-managers/ai-panel/rpc-manager";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { getRequirementAnalysisCodeGenPrefix, getRequirementAnalysisTestGenPrefix } from "./np_prompts";
import { createEditExecute, createEditTool, createMultiEditExecute, createBatchEditTool, createReadExecute, createReadTool, createWriteExecute, createWriteTool, FILE_BATCH_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME } from "../libs/text_editor_tool";

const SEARCH_LIBRARY_TOOL_NAME = "LibraryProviderTool";

function appendFinalMessages(
    history: ModelMessage[],
    finalMessages: ModelMessage[],
    cacheOptions: ProviderCacheOptions
): void {
    for (let i = 0; i < finalMessages.length; i++) {
        const message = finalMessages[i];
        if (message.role === "assistant" || message.role === "tool") {
            if (i === finalMessages.length - 1) {
                message.providerOptions = cacheOptions;
            }
            history.push(message);
        }
    }
}

// Core code generation function that emits events
export async function generateCodeCore(params: GenerateCodeRequest, eventHandler: CopilotEventHandler): Promise<void> {
    const projects: ProjectSource[] = await getProjectSource(params.operationType);
    const activeProject = projects.find(p => p.isActive) || projects[0];
    const packageName = activeProject.projectName;
    const sourceFiles: SourceFile[] = flattenProjectToFiles(projects);
    let updatedSourceFiles: SourceFile[] = [...sourceFiles];
    let updatedFileNames: string[] = [];
    const prompt = getRewrittenPrompt(params, projects);
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
            content: getSystemPromptPrefix(projects, params.operationType),
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
                projects,
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
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(updatedSourceFiles, updatedFileNames)),
        [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(updatedSourceFiles, updatedFileNames)),
        [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(createMultiEditExecute(updatedSourceFiles, updatedFileNames)),
        [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(updatedSourceFiles, updatedFileNames)),
    };

    const { fullStream, response, providerMetadata } = streamText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 4096 * 4,
        temperature: 0,
        messages: allMessages,
        stopWhen: stepCountIs(50),
        tools,
        abortSignal: AIPanelAbortController.getInstance().signal,
    });

    eventHandler({ type: "start" });
    let assistantResponse: string = "";
    let selectedLibraries: string[] = [];
    let codeGenStart = false;
    const tempCodeSegment = '<code filename="temp.bal">\n```ballerina\n// Code Generation\n```\n</code>';
    for await (const part of fullStream) {
        switch (part.type) {
            case "tool-call": {
                const toolName = part.toolName;
                console.log(`[Tool Call] Tool call started: ${toolName}`);
                if (toolName == "LibraryProviderTool") {
                    selectedLibraries = (part.input as any)?.libraryNames ? (part.input as any).libraryNames : [];
                    assistantResponse += `\n\n<toolcall>Analyzing request & selecting libraries...</toolcall>`;
                }
                else if ([FILE_WRITE_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_BATCH_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME].includes(toolName)) {
                    if(!codeGenStart) {
                        codeGenStart = true;
                        // TODO: temporary solution until this get refactored properly
                        // send this pattern <code\s+filename="([^"]+)"(?:\s+type=("test"|"ai_map"|"ai_map_inline"))?>\s*```(\w+)\s*([\s\S]*?)```\s*<\/code>
                        // to temprorily indicate the start of code generation in the webview
                        assistantResponse += `\n${tempCodeSegment}`;
                        eventHandler({ type: "content_block", content: `\n${tempCodeSegment}` });
                    }
                }
                eventHandler({ type: "tool_call", toolName });
                break;
            }
            case "tool-result": {
                const toolName = part.toolName;
                console.log(`[Tool Call] Tool call finished: ${toolName}`);
                if (toolName == "LibraryProviderTool") {
                    const libraryNames = (part.output as Library[]).map((lib) => lib.name);
                    const fetchedLibraries = libraryNames.filter((name) => selectedLibraries.includes(name));
                    console.log(
                        "[LibraryProviderTool] Library Relevant trimmed functions By LibraryProviderTool Result: ",
                        part.output as Library[]
                    );
                    if (fetchedLibraries.length === 0) {
                        assistantResponse = assistantResponse.replace(
                            `<toolcall>Analyzing request & selecting libraries...</toolcall>`,
                            `<toolcall>No relevant libraries found.</toolcall>`
                        );
                    } else {
                        assistantResponse = assistantResponse.replace(
                            `<toolcall>Analyzing request & selecting libraries...</toolcall>`,
                            `<toolcall>Fetched libraries: [${fetchedLibraries.join(", ")}]</toolcall>`
                        );
                    }
                    eventHandler({ type: "tool_result", toolName, toolOutput: fetchedLibraries });
                }
                eventHandler({ type: "evals_tool_result", toolName, output: part.output });
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

                const finalProviderMetadata = await providerMetadata;
                // Emit usage metrics event for test tracking
                if (finalProviderMetadata?.anthropic?.usage) {
                    const anthropicUsage = finalProviderMetadata.anthropic.usage as any;
                    eventHandler({
                        type: "usage_metrics",
                        isRepair: false,
                        usage: {
                            inputTokens: anthropicUsage.input_tokens || 0,
                            cacheCreationInputTokens: anthropicUsage.cache_creation_input_tokens || 0,
                            cacheReadInputTokens: anthropicUsage.cache_read_input_tokens || 0,
                            outputTokens: anthropicUsage.output_tokens || 0,
                        },
                    });
                }

                const { messages: finalMessages } = await response;
                appendFinalMessages(allMessages, finalMessages, cacheOptions);
                const postProcessedResp: PostProcessResponse = await postProcess({
                    sourceFiles: updatedSourceFiles,
                    updatedFileNames: updatedFileNames,
                });

                updatedSourceFiles = postProcessedResp.sourceFiles;
                let diagnostics: DiagnosticEntry[] = postProcessedResp.diagnostics.diagnostics;

                const MAX_REPAIR_ATTEMPTS = 3;
                let repair_attempt = 0;
                while (
                    diagnostics.length > 0 &&
                    repair_attempt < MAX_REPAIR_ATTEMPTS
                ) {
                    console.log("Repair iteration: ", repair_attempt);
                    console.log("Diagnostics trying to fix: ", diagnostics);

                    const repairedResponse: RepairResponse = await repairCode(
                        {
                            previousMessages: allMessages,
                            sourceFiles: updatedSourceFiles,
                            updatedFileNames: updatedFileNames,
                            diagnostics: diagnostics,
                        },
                        libraryDescriptions,
                        eventHandler
                    );
                    updatedSourceFiles = repairedResponse.sourceFiles;
                    updatedFileNames = repairedResponse.updatedFileNames;
                    diagnostics = repairedResponse.diagnostics;
                    repair_attempt++;
                }

                // Generate final code blocks from repaired source files
                const finalCodeSegment = getCodeBlocks(updatedSourceFiles, updatedFileNames);

                // Update the final assistant response with the final code blocks
                assistantResponse = assistantResponse.replace(tempCodeSegment, finalCodeSegment);

                console.log("Final Diagnostics ", diagnostics);
                codeGenStart = false;
                eventHandler({ type: "content_replace", content: assistantResponse });
                eventHandler({ type: "diagnostics", diagnostics: diagnostics });
                eventHandler({ type: "messages", messages: allMessages });
                eventHandler({ type: "stop", command: Command.Code });
                break;
            }
        }
    }
}

function getCodeBlocks(updatedSourceFiles: SourceFile[], updatedFileNames: string[]) {
    const codeBlocks: string[] = [];

    for (const fileName of updatedFileNames) {
        const sourceFile = updatedSourceFiles.find((sf) => sf.filePath === fileName);

        if (sourceFile) {
            const formattedBlock = `<code filename="${sourceFile.filePath}">
\`\`\`ballerina
${sourceFile.content}
\`\`\`
</code>`;
            codeBlocks.push(formattedBlock);
        }
    }

    return codeBlocks.join("\n\n");
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

function getSystemPromptPrefix(projects: ProjectSource[], op: OperationType): string {
    const basePrompt = `You are an expert assistant specializing in Ballerina code generation. Your should ONLY answer Ballerina related queries.`;

    if (op === "CODE_FOR_USER_REQUIREMENT") {
        const sourceFiles = flattenProjectToFiles(projects);
        return getRequirementAnalysisCodeGenPrefix(extractResourceDocumentContent(sourceFiles));
    } else if (op === "TESTS_FOR_USER_REQUIREMENT") {
        const sourceFiles = flattenProjectToFiles(projects);
        return getRequirementAnalysisTestGenPrefix(extractResourceDocumentContent(sourceFiles));
    }
    return basePrompt;
}

function getSystemPromptSuffix(langlibs: Library[]) {
    return `If the query requires code, Follow these steps to generate the Ballerina code:
## Langlibs
<AVAILABLE LANGLIBS>
${JSON.stringify(langlibs, null, 2)}
</AVAILABLE LANGLIBS>

## Steps to generate Ballerina Code

1. Thoroughly read and understand the given query:
   - Identify the main requirements and objectives of the integration.
   - Determine the trigger (main or service), connector usage, control flow, and expected outcomes for the query.

2. Figure the necessary libraries and functions required:
   - Determine which libraries are required to fulfill the query and use the ${SEARCH_LIBRARY_TOOL_NAME} tool to get the libraries.
   - Plan the control flow of the application based on input and output parameters of each function of the connector according the received API documentation from the tool.

3. Write the Ballerina Code:
    - First thoroughly read and understand the Ballerina code constraints.
    - Then do the file modifications by strictly adhering to file modifications section mentioned in below.

## Ballerina Code Constraints

### Library Usage and Importing libraries
- Only use the libraries received from user query or the ${SEARCH_LIBRARY_TOOL_NAME} tool or langlibs.
- Examine the library API documentation provided by the ${SEARCH_LIBRARY_TOOL_NAME} carefully. Strictly follow the type definitions, function signatures, and all the other details provided when writing the code.
- Each .bal file must include its own import statements for any external library references.
- Do not import default langlibs (lang.string, lang.boolean, lang.float, lang.decimal, lang.int, lang.map).
- For packages with dots in names, use aliases: \`import org/package.one as one;\`
- Treat generated connectors/clients inside the generated folder as submodules.
- A submodule MUST BE imported before being used. The import statement should only contain the package name and submodule name. For package my_pkg, folder structure generated/fooApi, the import should be \`import my_pkg.fooApi;\`.
- In the library API documentation, if the service type is specified as generic, adhere to the instructions specified there on writing the service.
- For GraphQL service related queries, if the user hasn't specified their own GraphQL Schema, write the proposed GraphQL schema for the user query right after the explanation before generating the Ballerina code. Use the same names as the GraphQL Schema when defining record types.

### Code Structure
- Define required configurables for the query. Use only string, int, decimal, boolean types in configurable variables.
- Initialize any necessary clients with the correct configuration based on the retrieved libraries at the module level (before any function or service declarations).
- Implement the main function OR service to address the query requirements.

### Coding Rules
- Use records as canonical representations of data structures. Always define records for data structures instead of using maps or json and navigate using the record fields.
- Do not invoke methods on json access expressions. Always use separate statements.
- Use dot notation to access a normal function. Use -> to access a remote function or resource function.
- Do not use dynamic listener registrations.
- Do not write code in a way that requires updating/assigning values of function parameters.
- ALWAYS use two-word camel case all the identifiers (ex- variables, function parameter, resource function parameter, and field names).
- If the return parameter typedesc default value is marked as <> in the given API docs, define a custom record in the code that represents the data structure based on the use case and assign to it.
- Whenever you have a Json variable, NEVER access or manipulate Json variables. ALWAYS define a record and convert the Json to that record and use it.
- When invoking resource functions from a client, use the correct paths with accessor and parameters (e.g., exampleClient->/path1/["param"]/path2.get(key="value")).
- When accessing a field of a record, always assign it to a new variable and use that variable in the next statement.
- Avoid long comments in the code. Use // for single line comments.
- Always use named arguments when providing values to any parameter (e.g., .get(key="value")).
- Mention types EXPLICITLY in variable declarations and foreach statements.
- To narrow down a union type(or optional type), always declare a separate variable and then use that variable in the if condition.

### File modifications
- You must apply changes to the existing source code using the provided ${[FILE_BATCH_EDIT_TOOL_NAME, FILE_SINGLE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].join(", ")} tools. The complete existing source code will be provided in the <existing_code> section of the user prompt.
- When making replacements inside an existing file, provide the **exact old string** and the **exact new string** with all newlines, spaces, and indentation, being mindful to replace nearby occurrences together to minimize the number of tool calls.
- Do not modify documentation such as .md files unless explicitly asked to be modified in the query.
- Do not add/modify toml files (Config.toml/Ballerina.toml/Dependencies.toml).
- Prefer modifying existing bal files over creating new files unless explicitly asked to create a new file in the query.

Begin your response with the very consice explanation in the same language as the user query. The explanation should contain a very high level the control flow decided in step 1 along with the how libraries are utilized.
Once the explanation is finished, make the necessary File modifications. Avoid any usage guides or explanations after the file modifications.
`;
}

function getUserPrompt(
    usecase: string,
    projects: ProjectSource[],
    fileUploadContents: FileAttatchment[],
    packageName: string,
    op: OperationType
): string {
    const fileInstructions = formatFileUploadContents(fileUploadContents);
    const packageContext = buildPackageContext(projects, packageName);

    return `QUERY: The query you need to answer.
<query>
${usecase}
</query>

Existing Code: Users existing code.
<existing_code>
${stringifyExistingCode(projects, op)}
</existing_code>

${packageContext}

${fileInstructions}

`;
}

export async function triggerGeneratedCodeRepair(params: RepairParams): Promise<RepairResponse> {
    // add null as the command since this is a repair operation is not a command
    const eventHandler = createWebviewEventHandler(undefined);
    try {
        // Parse sourceFiles from assistantResponse XML if provided
        if (params.assistantResponse && !params.sourceFiles) {
            params.sourceFiles = parseSourceFilesFromXML(params.assistantResponse);
            params.updatedFileNames = params.sourceFiles.map(file => file.filePath);
        }

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
    const resp = await repairCode(params, libraryDescriptions, eventHandler);
    // Convert repaired sourceFiles to XML format for display
    const repairedCodeBlocks = getCodeBlocks(resp.sourceFiles, resp.updatedFileNames);
    eventHandler({ type: "content_replace", content: repairedCodeBlocks });
    console.log("Manual Repair Diagnostics left: ", resp.diagnostics);
    eventHandler({ type: "diagnostics", diagnostics: resp.diagnostics });
    eventHandler({ type: "stop", command: undefined });
    return resp;
}

export async function repairCode(
    params: RepairParams,
    libraryDescriptions: string,
    eventHandler?: CopilotEventHandler
): Promise<RepairResponse> {
    // Convert current sourceFiles to XML format for assistant message
    const assistantResponse = getCodeBlocks(params.sourceFiles, params.updatedFileNames);

    const allMessages: ModelMessage[] = [
        ...params.previousMessages,
        {
            role: "assistant",
            content: assistantResponse,
        },
        {
            role: "user",
            content:
                "Generated code returns the following compiler errors that uses the library details from the `LibraryProviderTool` results in previous messages. First check the context and API documentation already provided in the conversation history before making new tool calls. Only use the `LibraryProviderTool` if additional library information is needed that wasn't covered in previous tool responses. Double-check all functions, types, and record field access for accuracy." +
                "And also do not create any new files. Just carefully analyze the error descriptions and update the existing code to fix the errors. \n Errors: \n " +
                params.diagnostics.map((d) => d.message).join("\n"),
        },
    ];

    let updatedSourceFiles: SourceFile[] = [...params.sourceFiles];
    let updatedFileNames: string[] = [...params.updatedFileNames];

    const tools = {
        LibraryProviderTool: getLibraryProviderTool(libraryDescriptions, GenerationType.CODE_GENERATION),
        [FILE_WRITE_TOOL_NAME]: createWriteTool(createWriteExecute(updatedSourceFiles, updatedFileNames)),
        [FILE_SINGLE_EDIT_TOOL_NAME]: createEditTool(createEditExecute(updatedSourceFiles, updatedFileNames)),
        [FILE_BATCH_EDIT_TOOL_NAME]: createBatchEditTool(createMultiEditExecute(updatedSourceFiles, updatedFileNames)),
        [FILE_READ_TOOL_NAME]: createReadTool(createReadExecute(updatedSourceFiles, updatedFileNames)),
    };

    const { text, providerMetadata } = await generateText({
        model: await getAnthropicClient(ANTHROPIC_SONNET_4),
        maxOutputTokens: 4096 * 4,
        temperature: 0,
        tools,
        messages: allMessages,
        stopWhen: stepCountIs(50),
        abortSignal: AIPanelAbortController.getInstance().signal,
    });
    const repairProviderMetadata = await providerMetadata;
    // Emit repair usage metrics event if event handler is provided
    if (eventHandler && repairProviderMetadata?.anthropic?.usage) {
        const anthropicUsage = repairProviderMetadata.anthropic.usage as any;
        eventHandler({
            type: "usage_metrics",
            isRepair: true,
            usage: {
                inputTokens: anthropicUsage.input_tokens || 0,
                cacheCreationInputTokens: anthropicUsage.cache_creation_input_tokens || 0,
                cacheReadInputTokens: anthropicUsage.cache_read_input_tokens || 0,
                outputTokens: anthropicUsage.output_tokens || 0,
            },
        });
    }

    const postProcessResp: PostProcessResponse = await postProcess({
        sourceFiles: updatedSourceFiles,
        updatedFileNames: updatedFileNames,
    });
    console.log("After auto repair, Diagnostics : ", postProcessResp.diagnostics.diagnostics);

    return {
        sourceFiles: postProcessResp.sourceFiles,
        updatedFileNames: updatedFileNames,
        diagnostics: postProcessResp.diagnostics.diagnostics
    };
}

/**
 * Formats a file as XML with filename and optional external package attribute.
 */
function formatFileAsXml(filePath: string, content: string, externalAttr: string): string {
    return `<file filename="${filePath}"${externalAttr}>
<content>
${content}
</content>
</file>`;
}

export function stringifyExistingCode(projects: ProjectSource[], op: OperationType): string {
    const usePackagePrefix = projects.length > 1;
    const fileFilter = (filePath: string) =>
        op === "CODE_GENERATION" || filePath.endsWith(".bal");

    const files = buildFilePaths(projects, fileFilter);

    return files.map(({ filePath, content, packageName, isActive }) => {
        const externalAttr = (usePackagePrefix && packageName && !isActive)
            ? ` externalPackageName="${packageName}"`
            : "";

        return formatFileAsXml(filePath, content, externalAttr);
    }).join("\n");
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
