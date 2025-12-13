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

import { CoreMessage, ModelMessage, generateObject } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../utils/ai-client";
import {
    CodeRepairResult,
    DatamapperResponse,
    DataModelStructure,
    MappingFields,
    RepairedFiles,
} from "./types";
import { GeneratedMappingSchema, RepairedSourceFilesSchema } from "./schema";
import { AIPanelAbortController } from "../../../rpc-managers/ai-panel/utils";
import { DataMapperModelResponse, DMModel, Mapping, repairCodeRequest, SourceFile, DiagnosticList, ImportInfo, ProcessMappingParametersRequest, Command, MetadataWithAttachments, InlineMappingsSourceResult, ProcessContextTypeCreationRequest, ProjectImports, ImportStatements, TemplateId, GetModuleDirParams, TextEdit, DataMapperSourceResponse, DataMapperSourceRequest, AllDataMapperSourceRequest, DataMapperModelRequest, DeleteMappingRequest } from "@wso2/ballerina-core";
import { getDataMappingPrompt } from "./prompts/mapping-prompt";
import { getBallerinaCodeRepairPrompt } from "./prompts/repair-prompt";
import { CopilotEventHandler, createWebviewEventHandler } from "../utils/events";
import { getErrorMessage } from "../utils/ai-utils";
import { buildMappingFileArray, buildRecordMap, collectExistingFunctions, collectModuleInfo, prepareMappingContext, determineCustomFunctionsPath, getUniqueFunctionFilePaths } from "./utils/mapping-context";
import { createTempBallerinaDir, getFunctionDefinitionFromSyntaxTree, extractImports, getCustomFunctionsContent } from "./utils/temp-project";
import { generateInlineMappingsSource } from "./utils/inline-mappings";
import { generateTypesFromContext } from "./utils/types-generation";
import { repairCodeAndGetUpdatedContent, repairAndCheckDiagnostics } from "./utils/repair";
import { createTempFileAndGenerateMetadata, generateDataMapperModel, generateMappings } from "./utils/model";
import { addCheckExpressionErrors } from "../../../rpc-managers/ai-panel/repair-utils";
import { BiDiagramRpcManager, getBallerinaFiles } from "../../../rpc-managers/bi-diagram/rpc-manager";
import { updateSourceCode } from "../../../utils/source-utils";
import { StateMachine } from "../../../stateMachine";
import { extractVariableDefinitionSource, getHasStopped, setHasStopped } from "../../../rpc-managers/data-mapper/utils";
import { commands, Uri, window } from "vscode";
import { CLOSE_AI_PANEL_COMMAND } from "../constants";
import { openAIPanelWithPrompt } from "../../../views/ai-panel/aiMachine";
import path from "path";
import { URI } from "vscode-uri";
import fs from 'fs';
import { writeBallerinaFileDidOpenTemp } from "../../../utils/modification";
import { getTempProject, cleanupTempProject } from "../utils/project/temp-project";
import { integrateCodeToWorkspace } from "../agent/utils";
import { createExecutionContextFromStateMachine } from "../agent";
import { ExecutionContext } from "@wso2/ballerina-core";

// =============================================================================
// ENHANCED MAIN ORCHESTRATOR FUNCTION
// =============================================================================

// Generates AI-powered data mappings with retry logic for handling failures
async function generateAIPoweredDataMappings(dataMapperModelResponse: DataMapperModelResponse): Promise<DatamapperResponse> {
    if (!dataMapperModelResponse.mappingsModel) {
        throw new Error("Mappings model is required in the data mapper response");
    }

    const maxRetries = 3;
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
            console.debug("Retrying to generate mappings for the payload.");
        }

        try {
            const mappingsModel = dataMapperModelResponse.mappingsModel as DMModel;
            const existingMappings = mappingsModel.mappings;
            const userProvidedMappingHints = mappingsModel.mapping_fields || {};
            const existingSubMappings = mappingsModel.subMappings as Mapping[] || [];

            if (!mappingsModel.inputs || !mappingsModel.output) {
                throw new Error("Mappings model must contain both inputs and output fields");
            }

            // Extract only inputs, output, and refs from mappingsModel
            const dataModelStructure: DataModelStructure = {
                inputs: mappingsModel.inputs,
                output: mappingsModel.output,
                refs: mappingsModel.refs
            };

            const aiGeneratedMappings = await generateAIMappings(
                dataModelStructure,
                existingMappings,
                userProvidedMappingHints,
                existingSubMappings
            );

            if (Object.keys(aiGeneratedMappings).length === 0) {
                throw new Error("No valid fields were identified for mapping between the given input and output records.");
            }

            return { mappings: aiGeneratedMappings };

        } catch (error) {
            console.error(`Error occurred while generating mappings: ${error}`);
            lastError = error as Error;
        }
    }

    throw lastError!;
}

// Calls Claude AI to generate mappings based on data model, user mappings, and mapping hints
async function generateAIMappings(
    dataModelStructure: DataModelStructure,
    existingUserMappings: Mapping[],
    userProvidedMappingHints: { [key: string]: MappingFields },
    existingSubMappings: Mapping[]
): Promise<Mapping[]> {
    if (!dataModelStructure.inputs || !dataModelStructure.output) {
        throw new Error("Data model structure must contain inputs and output");
    }

    // Build prompt for AI
    const aiPrompt = getDataMappingPrompt(
        JSON.stringify(dataModelStructure),
        JSON.stringify(existingUserMappings || []),
        JSON.stringify(userProvidedMappingHints || {}),
        JSON.stringify(existingSubMappings || [])
    );

    const chatMessages: ModelMessage[] = [
        { role: "user", content: aiPrompt }
    ];

    try {
        const { object } = await generateObject({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            maxOutputTokens: 8192,
            temperature: 0,
            messages: chatMessages,
            schema: GeneratedMappingSchema,
            abortSignal: AIPanelAbortController.getInstance().signal,
        });

        const aiGeneratedMappings = object.generatedMappings as Mapping[];
        return aiGeneratedMappings;
    } catch (error) {
        console.error("Failed to parse response:", error);
        throw new Error(`Failed to parse mapping response: ${error}`);
    }
}

// Uses Claude AI to repair Ballerina source files based on diagnostics and import information
async function repairBallerinaCode(
    filesToRepair: SourceFile[],
    compilationDiagnostics: DiagnosticList,
    availableImports: ImportInfo[]
): Promise<SourceFile[]> {
    if (!filesToRepair || filesToRepair.length === 0) {
        throw new Error("Source files to repair are required and cannot be empty");
    }

    if (!compilationDiagnostics) {
        throw new Error("Compilation diagnostics are required for code repair");
    }

    // Build repair prompt
    const codeRepairPrompt = getBallerinaCodeRepairPrompt(
        JSON.stringify(filesToRepair),
        JSON.stringify(compilationDiagnostics),
        JSON.stringify(availableImports || [])
    );

    const chatMessages: CoreMessage[] = [
        { role: "user", content: codeRepairPrompt }
    ];

    try {
        const { object } = await generateObject({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            maxOutputTokens: 8192,
            temperature: 0,
            messages: chatMessages,
            schema: RepairedSourceFilesSchema,
            abortSignal: AIPanelAbortController.getInstance().signal,
        });

        return object.repairedFiles as SourceFile[];
    } catch (error) {
        console.error("Failed to parse response:", error);
        throw new Error(`Failed to parse repaired files response: ${error}`);
    }
}

// =============================================================================
// MAIN EXPORT FUNCTION
// =============================================================================

// Main entry point for generating automatic data mappings from data mapper model
export async function generateAutoMappings(dataMapperModelResponse?: DataMapperModelResponse): Promise<Mapping[]> {
    if (!dataMapperModelResponse) {
        throw new Error("Data mapper model response is required for generating auto mappings");
    }
    try {
        const mappingResponse: DatamapperResponse = await generateAIPoweredDataMappings(dataMapperModelResponse);
        return mappingResponse.mappings;
    } catch (error) {
        console.error(`Error generating auto mappings: ${error}`);
        throw error;
    }
}

// Generates repaired Ballerina code by fixing diagnostics with retry logic
export async function generateRepairCode(codeRepairRequest?: repairCodeRequest): Promise<RepairedFiles> {
    if (!codeRepairRequest) {
        throw new Error("Code repair request is required for generating repair code");
    }

    const maxRetries = 3;
    let attemptCount = 0;
    let lastError: Error;

    while (attemptCount < maxRetries) {
        if (attemptCount > 0) {
            console.debug("Retrying to generate repair code for the payload.");
        }

        try {
            // Generate AI-powered repaired source files using Claude
            const aiRepairedFiles = await repairBallerinaCode(codeRepairRequest.sourceFiles, codeRepairRequest.diagnostics, codeRepairRequest.imports);

            if (!aiRepairedFiles || aiRepairedFiles.length === 0) {
                const error = new Error("No repaired files were generated. Unable to fix the provided source code.");
                lastError = error;
                attemptCount += 1;
                continue;
            }

            return { repairedFiles: aiRepairedFiles };

        } catch (error) {
            console.error(`Error occurred while generating repaired code: ${error}`);
            lastError = error as Error;
            attemptCount += 1;
            continue;
        }
    }

    throw lastError!;
}

// =============================================================================
// MAPPING CODE GENERATION WITH EVENT HANDLERS
// =============================================================================

// Core mapping code generation function that emits events
export async function generateMappingCodeCore(
    mappingRequest: ProcessMappingParametersRequest,
    eventHandler: CopilotEventHandler
): Promise<{ modifiedFiles: string[], sourceFiles: SourceFile[] }> {
    if (!mappingRequest.parameters) {
        throw new Error("Parameters are required in the mapping request");
    }

    if (!mappingRequest.parameters.functionName) {
        throw new Error("Function name is required in the mapping parameters");
    }

    const ctx = createExecutionContextFromStateMachine();
    const { path: tempProjectPath } = await getTempProject(ctx);
    try {
        // Initialize generation process
        eventHandler({ type: "start" });
        eventHandler({ type: "content_block", content: "Building the transformation logic using your provided data structures and mapping hints\n\n" });
        eventHandler({ type: "content_block", content: "<progress>Reading project files and collecting imports...</progress>" });
        const biDiagramRpcManager = new BiDiagramRpcManager();
        const langClient = StateMachine.langClient();
        const context = StateMachine.context();
        const projectRoot = tempProjectPath;

    const targetFunctionName = mappingRequest.parameters.functionName;

    const [projectImports, currentActiveFile, projectComponents] = await Promise.all([
        collectAllImportsFromProject(),
        getCurrentActiveFileName(),
        biDiagramRpcManager.getProjectComponents(),
        langClient
    ]);

    const allImportStatements = projectImports.imports.flatMap(file => file.statements || []);

    // Remove duplicates based on moduleName
    const uniqueImportStatements = Array.from(
        new Map(allImportStatements.map(imp => [imp.moduleName, imp])).values()
    );

    const moduleInfoList = collectModuleInfo(projectComponents);
    const moduleDirectoryMap = new Map<string, string>();

    for (const moduleInfo of moduleInfoList) {
        const moduleDirectoryType = getModuleDirectory({
            moduleName: moduleInfo.moduleName,
            filePath: moduleInfo.packageFilePath
        });
        moduleDirectoryMap.set(moduleInfo.moduleName, moduleDirectoryType);
    }

    const recordTypeMap = buildRecordMap(projectComponents, moduleDirectoryMap);
    const existingFunctionsInProject = collectExistingFunctions(projectComponents, moduleDirectoryMap);

    const functionFileContents = new Map<string, string>();
    if (existingFunctionsInProject.length > 0) {
        const uniqueFunctionFilePaths = getUniqueFunctionFilePaths(existingFunctionsInProject);
        const fileContentResults = await Promise.all(
            uniqueFunctionFilePaths.map(async (filePath) => {
                const projectFsPath = URI.parse(filePath).fsPath;
                const fileContent = await fs.promises.readFile(projectFsPath, "utf-8");
                return { filePath, content: fileContent };
            })
        );
        fileContentResults.forEach(({ filePath, content }) => {
            functionFileContents.set(filePath, content);
        });
    }

    const mappingContext = await prepareMappingContext(
        mappingRequest.parameters,
        recordTypeMap,
        existingFunctionsInProject,
        uniqueImportStatements,
        functionFileContents,
        currentActiveFile,
        langClient,
        projectRoot
    );

    // Use temp directory provided by state machine (no double temp creation)
    const tempDirectory = tempProjectPath;
    const doesFunctionAlreadyExist = existingFunctionsInProject.some(func => func.name === targetFunctionName);

    const tempFileMetadata = await createTempFileAndGenerateMetadata({
        tempDir: tempDirectory,
        filePath: mappingContext.filePath,
        metadata: mappingRequest.metadata,
        inputs: mappingContext.mappingDetails.inputs,
        output: mappingContext.mappingDetails.output,
        functionName: targetFunctionName,
        inputNames: mappingContext.mappingDetails.inputNames,
        imports: mappingContext.mappingDetails.imports,
        hasMatchingFunction: doesFunctionAlreadyExist,
    }, langClient, context);

    const allMappingsRequest = await generateMappings({
        metadata: tempFileMetadata,
        attachments: mappingRequest.attachments
    }, context, eventHandler);

    const sourceCodeResponse = await getAllDataMapperSource(allMappingsRequest);

    await updateSourceCode({ textEdits: sourceCodeResponse.textEdits, skipPayloadCheck: true });
    await new Promise((resolve) => setTimeout(resolve, 100));

    let customFunctionsTargetPath: string;
    let customFunctionsFileName: string;

    if (allMappingsRequest.customFunctionsFilePath) {
        const absoluteCustomFunctionsPath = determineCustomFunctionsPath(projectRoot, currentActiveFile);
        customFunctionsFileName = path.basename(absoluteCustomFunctionsPath);

        // For workspace projects, make path relative to workspace root
        const workspacePath = context.workspacePath;
        if (workspacePath) {
            customFunctionsTargetPath = path.relative(workspacePath, absoluteCustomFunctionsPath);
        } else {
            // Normal project: use relative path from project root
            customFunctionsTargetPath = path.relative(projectRoot, absoluteCustomFunctionsPath);
        }
    }

    // Check if mappings file and custom functions file are the same
    const mainFilePath = tempFileMetadata.codeData.lineRange.fileName;
    const isSameFile = customFunctionsTargetPath && 
        path.resolve(mainFilePath) === path.resolve(path.join(tempDirectory, customFunctionsFileName));

    let codeRepairResult: CodeRepairResult;
    const customContent = await getCustomFunctionsContent(allMappingsRequest.customFunctionsFilePath);
    eventHandler({ type: "content_block", content: "\n<progress>Repairing generated code...</progress>" });

    if (isSameFile) {
        const mainContent = fs.readFileSync(mainFilePath, 'utf8');

        if (customContent) {
            // Merge: main content + custom functions
            const mergedContent = `${mainContent}\n\n${customContent}`;
            fs.writeFileSync(mainFilePath, mergedContent, 'utf8');
        }
        
        codeRepairResult = await repairCodeAndGetUpdatedContent({
            tempFileMetadata,
            customFunctionsFilePath: undefined,
            imports: uniqueImportStatements,
            tempDir: tempDirectory
        }, langClient, projectRoot);

        codeRepairResult.customFunctionsContent = '';
    } else {
        // Files are different, repair them separately
        codeRepairResult = await repairCodeAndGetUpdatedContent({
            tempFileMetadata,
            customFunctionsFilePath: allMappingsRequest.customFunctionsFilePath,
            imports: uniqueImportStatements,
            tempDir: tempDirectory
        }, langClient, projectRoot);
    }

    // Handle check expression errors and repair diagnostics
    const filePaths = await handleCheckExpressionErrorsAndRepair(
        langClient,
        projectRoot,
        tempFileMetadata,
        allMappingsRequest,
        tempDirectory,
        isSameFile,
        codeRepairResult
    );

    // Remove compilation error mappings
    const { updatedMainContent, updatedCustomContent } = await removeCompilationErrorMappingFields(
        langClient,
        projectRoot,
        mainFilePath,
        targetFunctionName,
        allMappingsRequest,
        tempDirectory,
        filePaths,
        isSameFile
    );

    // For workspace projects, compute relative file path from workspace root
    const workspacePath = context.workspacePath;
    let targetFilePath = mappingContext.filePath;

    if (workspacePath) {
        // Workspace project: need to include package path prefix (e.g., "foo/mappings.bal")
        const absoluteFilePath = path.join(projectRoot, mappingContext.filePath);
        targetFilePath = path.relative(workspacePath, absoluteFilePath);
    }

    const generatedSourceFiles = buildMappingFileArray(
        targetFilePath,
        updatedMainContent,
        customFunctionsTargetPath,
        updatedCustomContent,
    );

        // Extract modified file paths
        const modifiedFiles = generatedSourceFiles.map(file => file.filePath);

        // Integrate code to workspace automatically
        if (modifiedFiles.length > 0) {
            eventHandler({ type: "content_block", content: "<progress>Integrating code to workspace...</progress>" });
            const modifiedFilesSet = new Set(modifiedFiles);
            await integrateCodeToWorkspace(tempProjectPath, modifiedFilesSet, ctx);
            console.log(`[DataMapper] Integrated ${modifiedFiles.length} file(s) to workspace`);
        }

        eventHandler({ type: "stop", command: Command.DataMap });

        return {
            modifiedFiles,
            sourceFiles: generatedSourceFiles
        };
    } catch (error) {
        console.error("Error during mapping code generation:", error);

        // Enhanced error message for integration failures
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('Failed to integrate code')) {
            eventHandler({
                type: "error",
                content: `Integration failed: ${getErrorMessage(error)}\n\nPlease check file permissions and try again.`
            });
        } else {
            eventHandler({ type: "error", content: getErrorMessage(error) });
        }
        throw error;
    } finally {
        // Always cleanup temp project
        cleanupTempProject(tempProjectPath);
    }
}

// Main public function that uses the default event handler for mapping generation
export async function generateMappingCode(mappingRequest: ProcessMappingParametersRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.DataMap);
    try {
        await generateMappingCodeCore(mappingRequest, eventHandler);
    } catch (error) {
        console.error("Error during mapping code generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
        throw error;
    }
}

async function collectAllImportsFromProject(): Promise<ProjectImports> {
    const projectPath = StateMachine.context().projectPath;

    const ballerinaSourceFiles = await getBallerinaFiles(Uri.file(projectPath).fsPath);

    const importStatements: ImportStatements[] = [];

    for (const ballerinaFile of ballerinaSourceFiles) {
        const sourceFileContent = fs.readFileSync(ballerinaFile, "utf8");
        const extractedImports = extractImports(sourceFileContent, ballerinaFile);
        importStatements.push(extractedImports);
    }

    return {
        projectPath: projectPath,
        imports: importStatements,
    };
}

function getCurrentActiveFileName(): string {
    const activeTabGroup = window.tabGroups.all.find(group => {
        return group.activeTab.isActive && group.activeTab?.input;
    });

    if (activeTabGroup && activeTabGroup.activeTab && activeTabGroup.activeTab.input) {
        const activeTabInput = activeTabGroup.activeTab.input as { uri: { fsPath: string } };

        if (activeTabInput.uri) {
            const activeFileUri = activeTabInput.uri;
            const activeFileName = activeFileUri.fsPath.split('/').pop();
            return activeFileName || '';
        }
    }
}

function getModuleDirectory(params: GetModuleDirParams): string {
    const { filePath, moduleName } = params;
    const generatedPath = path.join(filePath, "generated", moduleName);
    if (fs.existsSync(generatedPath) && fs.statSync(generatedPath).isDirectory()) {
        return "generated";
    } else {
        return "modules";
    }
}

export async function getAllDataMapperSource(
    mappingSourceRequest: AllDataMapperSourceRequest
): Promise<DataMapperSourceResponse> {
    setHasStopped(false);

    const individualSourceRequests = buildSourceRequests(mappingSourceRequest);
    const sourceResponses = await processSourceRequests(individualSourceRequests);
    const consolidatedTextEdits = consolidateTextEdits(sourceResponses, mappingSourceRequest.mappings.length);

    return { textEdits: consolidatedTextEdits };
}


// Builds individual source requests from the provided parameters by creating a request for each mapping
export function buildSourceRequests(allMappingsRequest: AllDataMapperSourceRequest): DataMapperSourceRequest[] {
    return allMappingsRequest.mappings.map(singleMapping => ({
        filePath: allMappingsRequest.filePath,
        codedata: allMappingsRequest.codedata,
        varName: allMappingsRequest.varName,
        targetField: allMappingsRequest.targetField,
        mapping: singleMapping
    }));
}

// Processes source requests with cancellation support and error handling for each request
export async function processSourceRequests(sourceRequests: DataMapperSourceRequest[]): Promise<PromiseSettledResult<DataMapperSourceResponse>[]> {
    return Promise.allSettled(
        sourceRequests.map(async (singleRequest) => {
            if (getHasStopped()) {
                throw new Error("Operation was stopped");
            }
            try {
                return await StateMachine.langClient().getDataMapperSource(singleRequest);
            } catch (error) {
                console.error("Error in getDataMapperSource:", error);
                throw error;
            }
        })
    );
}

// Consolidates text edits from multiple source responses into a single optimized collection
export function consolidateTextEdits(
    sourceResponses: PromiseSettledResult<DataMapperSourceResponse>[],
    totalMappingCount: number
): { [key: string]: TextEdit[] } {
    const allTextEditsByFile: { [key: string]: TextEdit[] } = {};

    sourceResponses.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`>>> Completed mapping ${index + 1}/${totalMappingCount}`);
            mergeTextEdits(allTextEditsByFile, result.value.textEdits);
        } else {
            console.error(`>>> Failed mapping ${index + 1}:`, result.reason);
        }
    });

    return optimizeTextEdits(allTextEditsByFile);
}

// Merges new text edits into the existing collection, grouping by file path
export function mergeTextEdits(
    existingTextEdits: { [key: string]: TextEdit[] },
    newTextEditsToMerge?: { [key: string]: TextEdit[] }
): void {
    if (!newTextEditsToMerge) { return; }

    Object.entries(newTextEditsToMerge).forEach(([filePath, editsForFile]) => {
        if (!existingTextEdits[filePath]) {
            existingTextEdits[filePath] = [];
        }
        existingTextEdits[filePath].push(...editsForFile);
    });
}

// Optimizes text edits by sorting and combining them into single edits per file
export function optimizeTextEdits(allTextEditsByFile: { [key: string]: TextEdit[] }): { [key: string]: TextEdit[] } {
    const optimizedEditsByFile: { [key: string]: TextEdit[] } = {};

    Object.entries(allTextEditsByFile).forEach(([filePath, editsForFile]) => {
        if (editsForFile.length === 0) { return; }

        const sortedEditsForFile = sortTextEdits(editsForFile);
        const combinedEditForFile = combineTextEdits(sortedEditsForFile);

        optimizedEditsByFile[filePath] = [combinedEditForFile];
    });

    return optimizedEditsByFile;
}

// Sorts text edits by line number and character position to ensure proper ordering
export function sortTextEdits(textEdits: TextEdit[]): TextEdit[] {
    return textEdits.sort((editA, editB) => {
        if (editA.range.start.line !== editB.range.start.line) {
            return editA.range.start.line - editB.range.start.line;
        }
        return editA.range.start.character - editB.range.start.character;
    });
}

// Combines multiple text edits into a single edit with comma-separated content
export function combineTextEdits(sortedTextEdits: TextEdit[]): TextEdit {
    const formattedTextArray = sortedTextEdits.map((singleEdit, editIndex) => {
        const editContent = singleEdit.newText.trim();
        return editIndex < sortedTextEdits.length - 1 ? `${editContent},` : editContent;
    });

    return {
        range: sortedTextEdits[0].range,
        newText: formattedTextArray.join('\n').trimStart()
    };
}

// =============================================================================
// INLINE MAPPING CODE GENERATION WITH EVENT HANDLERS
// =============================================================================

// Core inline mapping code generation function that emits events and generates mappings inline
export async function generateInlineMappingCodeCore(
    inlineMappingRequest: MetadataWithAttachments,
    eventHandler: CopilotEventHandler
): Promise<{ modifiedFiles: string[], sourceFiles: SourceFile[] }> {
    if (!inlineMappingRequest.metadata) {
        throw new Error("Metadata is required in the inline mapping request");
    }

    if (!inlineMappingRequest.metadata.codeData) {
        throw new Error("Code data is required in the metadata");
    }

    // Create temp project using shared utilities
    const ctx = createExecutionContextFromStateMachine();
    const { path: tempProjectPath } = await getTempProject(ctx);

    try {
        // Initialize generation process
        eventHandler({ type: "start" });
        eventHandler({ type: "content_block", content: "Building the transformation logic using your provided data structures and mapping hints\n\n" });
        eventHandler({ type: "content_block", content: "<progress>Reading project files and collecting imports...</progress>" });
        const projectImports = await collectAllImportsFromProject();
        const allImportStatements = projectImports.imports.flatMap(file => file.statements || []);

    // Remove duplicates based on moduleName
    const uniqueImportStatements = Array.from(
        new Map(allImportStatements.map(imp => [imp.moduleName, imp])).values()
    );

    let targetFileName = inlineMappingRequest.metadata.codeData.lineRange.fileName;

    if (!targetFileName) {
        throw new Error("Target file name could not be determined from code data");
    }

    const langClient = StateMachine.langClient();
    const context = StateMachine.context();
    const projectRoot = tempProjectPath;

    const inlineMappingsResult: InlineMappingsSourceResult =
        await generateInlineMappingsSource(inlineMappingRequest, langClient, context, eventHandler);

    await updateSourceCode({ textEdits: inlineMappingsResult.sourceResponse.textEdits, skipPayloadCheck: true });
    await new Promise((resolve) => setTimeout(resolve, 100));

    let customFunctionsTargetPath: string | undefined;
    let customFunctionsFileName: string | undefined;

    if (inlineMappingsResult.allMappingsRequest.customFunctionsFilePath) {
        const absoluteCustomFunctionsPath = determineCustomFunctionsPath(projectRoot, targetFileName);
        customFunctionsFileName = path.basename(absoluteCustomFunctionsPath);

        // For workspace projects, make path relative to workspace root
        const workspacePath = context.workspacePath;
        if (workspacePath) {
            customFunctionsTargetPath = path.relative(workspacePath, absoluteCustomFunctionsPath);
        } else {
            // Normal project: use relative path from project root
            customFunctionsTargetPath = path.relative(projectRoot, absoluteCustomFunctionsPath);
        }
    }

    // Check if mappings file and custom functions file are the same
    const mainFilePath = inlineMappingsResult.tempFileMetadata.codeData.lineRange.fileName;
    const isSameFile = customFunctionsTargetPath && 
        path.resolve(mainFilePath) === path.resolve(path.join(inlineMappingsResult.tempDir, customFunctionsFileName));

    let codeRepairResult: CodeRepairResult;
    const customContent = await getCustomFunctionsContent(inlineMappingsResult.allMappingsRequest.customFunctionsFilePath);
    eventHandler({ type: "content_block", content: "\n<progress>Repairing generated code...</progress>" });

    if (isSameFile) {
        const mainContent = fs.readFileSync(mainFilePath, 'utf8');

        if (customContent) {
            // Merge: main content + custom functions
            const mergedContent = `${mainContent}\n\n${customContent}`;
            fs.writeFileSync(mainFilePath, mergedContent, 'utf8');
        }
        
        codeRepairResult = await repairCodeAndGetUpdatedContent({
            tempFileMetadata: inlineMappingsResult.tempFileMetadata,
            customFunctionsFilePath: undefined,
            imports: uniqueImportStatements,
            tempDir: inlineMappingsResult.tempDir
        }, langClient, projectRoot);

        codeRepairResult.customFunctionsContent = '';
    } else {
        // Files are different, repair them separately
        codeRepairResult = await repairCodeAndGetUpdatedContent({
            tempFileMetadata: inlineMappingsResult.tempFileMetadata,
            customFunctionsFilePath: inlineMappingsResult.allMappingsRequest.customFunctionsFilePath,
            tempDir: inlineMappingsResult.tempDir
        }, langClient, projectRoot);
    }

    const variableName = inlineMappingRequest.metadata.name || inlineMappingsResult.tempFileMetadata.name;

    // Handle check expression errors and repair diagnostics for inline mappings
    const { inlineFilePaths } = await handleInlineCheckExpressionErrorsAndRepair(
        langClient,
        projectRoot,
        inlineMappingsResult,
        isSameFile,
        codeRepairResult,
        variableName
    );

    // Remove compilation error mappings for inline mappings
    const { updatedMainContent, updatedCustomContent } = await removeInlineCompilationErrorMappingFields(
        langClient,
        projectRoot,
        mainFilePath,
        variableName,
        inlineMappingsResult,
        inlineFilePaths,
        isSameFile
    );

    const generatedSourceFiles = buildMappingFileArray(
        context.documentUri,
        updatedMainContent,
        customFunctionsTargetPath,
        updatedCustomContent,
    );

        // Extract modified file paths
        const modifiedFiles = generatedSourceFiles.map(file => file.filePath);

        // Integrate code to workspace automatically
        if (modifiedFiles.length > 0) {
            eventHandler({ type: "content_block", content: "<progress>Integrating code to workspace...</progress>" });
            const modifiedFilesSet = new Set(modifiedFiles);
            await integrateCodeToWorkspace(tempProjectPath, modifiedFilesSet, ctx);
            console.log(`[DataMapper] Integrated ${modifiedFiles.length} file(s) to workspace`);
        }

        eventHandler({ type: "stop", command: Command.DataMap });

        return {
            modifiedFiles,
            sourceFiles: generatedSourceFiles
        };
    } catch (error) {
        console.error("Error during inline mapping code generation:", error);

        // Enhanced error message for integration failures
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('Failed to integrate code')) {
            eventHandler({
                type: "error",
                content: `Integration failed: ${getErrorMessage(error)}\n\nPlease check file permissions and try again.`
            });
        } else {
            eventHandler({ type: "error", content: getErrorMessage(error) });
        }
        throw error;
    } finally {
        // Always cleanup temp project
        cleanupTempProject(tempProjectPath);
    }
}

// Main public function that uses the default event handler for inline mapping generation
export async function generateInlineMappingCode(inlineMappingRequest: MetadataWithAttachments): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.DataMap);
    try {
        await generateInlineMappingCodeCore(inlineMappingRequest, eventHandler);
    } catch (error) {
        console.error("Error during inline mapping code generation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
        throw error;
    }
}

// =============================================================================
// CONTEXT TYPE CREATION WITH EVENT HANDLERS
// =============================================================================

// Core context type creation function that emits events and generates Ballerina record types
export async function generateContextTypesCore(
    typeCreationRequest: ProcessContextTypeCreationRequest,
    eventHandler: CopilotEventHandler
): Promise<{ modifiedFiles: string[], sourceFiles: SourceFile[] }> {
    if (typeCreationRequest.attachments.length === 0) {
        throw new Error("Attachments are required for type creation");
    }

    // Create temp project using shared utilities
    const ctx = createExecutionContextFromStateMachine();
    const { path: tempProjectPath } = await getTempProject(ctx);

    try {
        // Initialize generation process
        eventHandler({ type: "start" });

        const biDiagramRpcManager = new BiDiagramRpcManager();
        const langClient = StateMachine.langClient();
        const projectComponents = await biDiagramRpcManager.getProjectComponents();

        // Generate types from context with validation
        const { typesCode, filePath } = await generateTypesFromContext(
            typeCreationRequest.attachments,
            projectComponents,
            langClient
        );

        // Create source files array
        const sourceFiles: SourceFile[] = [{
            filePath: filePath,
            content: typesCode
        }];
        const modifiedFiles = [filePath];

        // Integrate code to workspace automatically
        if (modifiedFiles.length > 0) {
            eventHandler({ type: "content_block", content: "<progress>Integrating code to workspace...</progress>" });
            const modifiedFilesSet = new Set(modifiedFiles);
            await integrateCodeToWorkspace(tempProjectPath, modifiedFilesSet, ctx);
            console.log(`[DataMapper] Integrated ${modifiedFiles.length} file(s) to workspace`);
        }

        eventHandler({ type: "stop", command: Command.TypeCreator });

        return {
            modifiedFiles,
            sourceFiles
        };
    } catch (error) {
        console.error("Error during context type creation:", error);

        // Enhanced error message for integration failures
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('Failed to integrate code')) {
            eventHandler({
                type: "error",
                content: `Integration failed: ${getErrorMessage(error)}\n\nPlease check file permissions and try again.`
            });
        } else {
            eventHandler({ type: "error", content: getErrorMessage(error) });
        }
        throw error;
    } finally {
        // Always cleanup temp project
        cleanupTempProject(tempProjectPath);
    }
}

// Main public function that uses the default event handler for context type creation
export async function generateContextTypes(typeCreationRequest: ProcessContextTypeCreationRequest): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.TypeCreator);
    try {
        await generateContextTypesCore(typeCreationRequest, eventHandler);
    } catch (error) {
        console.error("Error during context type creation:", error);
        eventHandler({ type: "error", content: getErrorMessage(error) });
        throw error;
    }
}

// Opens the AI panel with data mapper chat interface
export async function openChatWindowWithCommand(): Promise<void> {
    const langClient = StateMachine.langClient();
    const context = StateMachine.context();
    const model = await generateDataMapperModel({}, langClient, context);

    const { identifier, dataMapperMetadata } = context;

    // Automatically close and open AI mapping chat window with the generated model
    commands.executeCommand(CLOSE_AI_PANEL_COMMAND);
    openAIPanelWithPrompt({
        type: 'command-template',
        command: Command.DataMap,
        templateId: identifier ? TemplateId.MappingsForFunction : TemplateId.InlineMappings,
        ...(identifier && { params: new Map([['functionName', identifier]]) }),
        metadata: {
            ...dataMapperMetadata,
            mappingsModel: model.mappingsModel as DMModel
        }
    });
}

// Removes mapping fields with compilation errors for inline mappings and reads updated content
async function removeInlineCompilationErrorMappingFields(
    langClient: any,
    projectRoot: string,
    mainFilePath: string,
    variableName: string,
    inlineMappingsResult: InlineMappingsSourceResult,
    inlineFilePaths: string[],
    isSameFile: boolean
): Promise<{ updatedMainContent: string; updatedCustomContent: string }> {
    // For inline mappings, we use the variable's location from the codedata
    const updatedDataMapperMetadata: DataMapperModelRequest = {
        filePath: mainFilePath,
        codedata: inlineMappingsResult.allMappingsRequest.codedata,
        targetField: variableName,
        position: inlineMappingsResult.allMappingsRequest.codedata.lineRange.startLine
    };

    // Get DM model with mappings to check for mapping-level diagnostics
    const dataMapperModel = await langClient.getDataMapperMappings(updatedDataMapperMetadata) as DataMapperModelResponse;
    const dmModel = dataMapperModel.mappingsModel as DMModel;

    // Check if any mappings have diagnostics
    if (dmModel && dmModel.mappings && dmModel.mappings.length > 0) {
        const mappingsWithDiagnostics = dmModel.mappings.filter((mapping: Mapping) =>
            mapping.diagnostics && mapping.diagnostics.length > 0
        );

        if (mappingsWithDiagnostics.length > 0) {
            // Delete each mapping with diagnostics using the deleteMapping API
            for (const mapping of mappingsWithDiagnostics) {
                const deleteRequest: DeleteMappingRequest = {
                    filePath: mainFilePath,
                    codedata: updatedDataMapperMetadata.codedata,
                    mapping: mapping,
                    varName: inlineMappingsResult.allMappingsRequest.varName,
                    targetField: variableName,
                };

                const deleteResponse = await langClient.deleteMapping(deleteRequest);

                // Apply the text edits from the delete operation directly to temp files
                if (Object.keys(deleteResponse.textEdits).length > 0) {
                    await applyTextEditsToTempFile(deleteResponse.textEdits, mainFilePath);
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            await repairAndCheckDiagnostics(langClient, projectRoot, {
                tempDir: inlineMappingsResult.tempDir,
                filePaths: inlineFilePaths
            });
        }
    }

    // Read updated content after diagnostics handling
    const updatedMainContent = fs.readFileSync(mainFilePath, 'utf8');
    let updatedCustomContent = '';
    if (inlineMappingsResult.allMappingsRequest.customFunctionsFilePath && !isSameFile) {
        updatedCustomContent = fs.readFileSync(inlineMappingsResult.allMappingsRequest.customFunctionsFilePath, 'utf8');
    }

    return { updatedMainContent, updatedCustomContent };
}

// Handles check expression errors (BCE3032) and repairs diagnostics for inline mapping files
async function handleInlineCheckExpressionErrorsAndRepair(
    langClient: any,
    projectRoot: string,
    inlineMappingsResult: InlineMappingsSourceResult,
    isSameFile: boolean,
    codeRepairResult: CodeRepairResult,
    variableName: string
): Promise<{ inlineFilePaths: string[]; updatedCodeToDisplay?: string }> {
    // Build file paths array for both main file and custom functions file
    const inlineFilePaths = [inlineMappingsResult.tempFileMetadata.codeData.lineRange.fileName];
    if (inlineMappingsResult.allMappingsRequest.customFunctionsFilePath && !isSameFile) {
        inlineFilePaths.push(inlineMappingsResult.allMappingsRequest.customFunctionsFilePath);
    }

    // Repair and check diagnostics for all files
    let diags = await repairAndCheckDiagnostics(langClient, projectRoot, {
        tempDir: inlineMappingsResult.tempDir,
        filePaths: inlineFilePaths
    });

    // Check for inline mappings with 'check' expressions (BCE3032 error)
    const hasCheckError = diags.diagnosticsList.some(diagEntry =>
        diagEntry.diagnostics.some(d => d.code === "BCE3032")
    );

    let updatedCodeToDisplay: string;

    if (hasCheckError) {
        const isModified = await addCheckExpressionErrors(diags.diagnosticsList, langClient);
        if (isModified) {
            // Re-read the files after modifications
            const tempFilePath = inlineMappingsResult.tempFileMetadata.codeData.lineRange.fileName;
            codeRepairResult.finalContent = fs.readFileSync(tempFilePath, 'utf8');

            // Update the code to display if we're working with a variable
            if (variableName) {
                const extractedVariableDefinition = await extractVariableDefinitionSource(
                    tempFilePath,
                    inlineMappingsResult.tempFileMetadata.codeData,
                    variableName
                );
                if (extractedVariableDefinition) {
                    updatedCodeToDisplay = extractedVariableDefinition;
                }
            }

            if (inlineMappingsResult.allMappingsRequest.customFunctionsFilePath && !isSameFile) {
                codeRepairResult.customFunctionsContent = fs.readFileSync(
                    inlineMappingsResult.allMappingsRequest.customFunctionsFilePath,
                    'utf8'
                );
            }
        }
    }

    return { inlineFilePaths, updatedCodeToDisplay };
}

// Handles check expression errors (BCE3032) and repairs diagnostics for mapping files
async function handleCheckExpressionErrorsAndRepair(
    langClient: any,
    projectRoot: string,
    tempFileMetadata: any,
    allMappingsRequest: AllDataMapperSourceRequest,
    tempDirectory: string,
    isSameFile: boolean,
    codeRepairResult: CodeRepairResult
): Promise<string[]> {
    // Build file paths array for both main file and custom functions file
    const filePaths = [tempFileMetadata.codeData.lineRange.fileName];
    if (allMappingsRequest.customFunctionsFilePath && !isSameFile) {
        filePaths.push(allMappingsRequest.customFunctionsFilePath);
    }

    // Repair and check diagnostics for all files
    let diags = await repairAndCheckDiagnostics(langClient, projectRoot, {
        tempDir: tempDirectory,
        filePaths
    });

    // Check for mappings with 'check' expressions (BCE3032 error)
    const hasCheckError = diags.diagnosticsList.some((diagEntry) =>
        diagEntry.diagnostics.some(d => d.code === "BCE3032")
    );

    if (hasCheckError) {
        const isModified = await addCheckExpressionErrors(diags.diagnosticsList, langClient);
        if (isModified) {
            // Re-read the files after modifications
            const mainFilePath = tempFileMetadata.codeData.lineRange.fileName;
            codeRepairResult.finalContent = fs.readFileSync(mainFilePath, 'utf8');

            if (allMappingsRequest.customFunctionsFilePath && !isSameFile) {
                codeRepairResult.customFunctionsContent = fs.readFileSync(
                    allMappingsRequest.customFunctionsFilePath,
                    'utf8'
                );
            }
        }
    }

    return filePaths;
}

// Removes mapping fields with compilation errors to avoid syntax errors in generated code and reads updated content
async function removeCompilationErrorMappingFields(
    langClient: any,
    projectRoot: string,
    mainFilePath: string,
    targetFunctionName: string,
    allMappingsRequest: AllDataMapperSourceRequest,
    tempDirectory: string,
    filePaths: string[],
    isSameFile: boolean
): Promise<{ updatedMainContent: string; updatedCustomContent: string }> {
    // Get function definition from syntax tree
    const funcDefinitionNode = await getFunctionDefinitionFromSyntaxTree(
        langClient,
        mainFilePath,
        targetFunctionName
    );

    const updatedDataMapperMetadata: DataMapperModelRequest = {
        filePath: mainFilePath,
        codedata: {
            lineRange: {
                fileName: mainFilePath,
                startLine: {
                    line: funcDefinitionNode.position.startLine,
                    offset: funcDefinitionNode.position.startColumn,
                },
                endLine: {
                    line: funcDefinitionNode.position.endLine,
                    offset: funcDefinitionNode.position.endColumn,
                },
            },
        },
        targetField: targetFunctionName,
        position: {
            line: funcDefinitionNode.position.startLine,
            offset: funcDefinitionNode.position.startColumn
        }
    };

    // Get DM model with mappings to check for mapping-level diagnostics
    const dataMapperModel = await langClient.getDataMapperMappings(updatedDataMapperMetadata) as DataMapperModelResponse;
    const dmModel = dataMapperModel.mappingsModel as DMModel;

    // Check if any mappings have diagnostics
    if (dmModel && dmModel.mappings && dmModel.mappings.length > 0) {
        const mappingsWithDiagnostics = dmModel.mappings.filter((mapping: Mapping) =>
            mapping.diagnostics && mapping.diagnostics.length > 0
        );

        if (mappingsWithDiagnostics.length > 0) {
            // Delete each mapping with diagnostics using the deleteMapping API
            for (const mapping of mappingsWithDiagnostics) {
                const deleteRequest: DeleteMappingRequest = {
                    filePath: mainFilePath,
                    codedata: updatedDataMapperMetadata.codedata,
                    mapping: mapping,
                    varName: allMappingsRequest.varName,
                    targetField: targetFunctionName,
                };

                const deleteResponse = await langClient.deleteMapping(deleteRequest);

                // Apply the text edits from the delete operation directly to temp files
                if (Object.keys(deleteResponse.textEdits).length > 0) {
                    await applyTextEditsToTempFile(deleteResponse.textEdits, mainFilePath);
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            await repairAndCheckDiagnostics(langClient, projectRoot, {
                tempDir: tempDirectory,
                filePaths: filePaths
            });
        }
    }

    // Read updated content after diagnostics handling
    const updatedMainContent = fs.readFileSync(mainFilePath, 'utf8');
    let updatedCustomContent = '';
    if (allMappingsRequest.customFunctionsFilePath && !isSameFile) {
        updatedCustomContent = fs.readFileSync(allMappingsRequest.customFunctionsFilePath, 'utf8');
    }

    return { updatedMainContent, updatedCustomContent };
}

// Applies text edits to a temporary file without using VS Code workspace APIs
async function applyTextEditsToTempFile(textEdits: { [key: string]: TextEdit[] }, targetFilePath: string): Promise<void> {
    // Read current file content
    let fileContent = fs.readFileSync(targetFilePath, 'utf8');
    const lines = fileContent.split('\n');

    // Get edits for this file
    const editsForFile = textEdits[targetFilePath] || textEdits[Uri.file(targetFilePath).toString()];

    if (!editsForFile || editsForFile.length === 0) {
        return;
    }

    // Sort edits in reverse order (bottom to top) to maintain line positions
    const sortedEdits = [...editsForFile].sort((a, b) => {
        if (b.range.start.line !== a.range.start.line) {
            return b.range.start.line - a.range.start.line;
        }
        return b.range.start.character - a.range.start.character;
    });

    // Apply each edit
    for (const edit of sortedEdits) {
        const startLine = edit.range.start.line;
        const startChar = edit.range.start.character;
        const endLine = edit.range.end.line;
        const endChar = edit.range.end.character;

        // Handle single line edit
        if (startLine === endLine) {
            const line = lines[startLine];
            lines[startLine] = line.substring(0, startChar) + edit.newText + line.substring(endChar);
        } else {
            // Handle multi-line edit
            const firstLine = lines[startLine].substring(0, startChar);
            const lastLine = lines[endLine].substring(endChar);
            const newContent = firstLine + edit.newText + lastLine;

            // Remove the lines in the range and replace with new content
            lines.splice(startLine, endLine - startLine + 1, newContent);
        }
    }

    // Write updated content back to file
    const updatedContent = lines.join('\n');
    writeBallerinaFileDidOpenTemp(targetFilePath, updatedContent);
}
