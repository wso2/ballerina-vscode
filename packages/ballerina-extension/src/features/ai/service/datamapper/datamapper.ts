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
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../connection";
import {
    DatamapperResponse,
    DataModelStructure,
    MappingFields,
    RepairedFiles,
} from "./types";
import { GeneratedMappingSchema, RepairedSourceFilesSchema } from "./schema";
import { AIPanelAbortController } from "../../../../../src/rpc-managers/ai-panel/utils";
import { DataMapperModelResponse, DMModel, Mapping, repairCodeRequest, SourceFile, DiagnosticList, ImportInfo, ProcessMappingParametersRequest, Command, MetadataWithAttachments, InlineMappingsSourceResult, ProcessContextTypeCreationRequest, ProjectImports, ImportStatements, TemplateId, GetModuleDirParams, TextEdit, DataMapperSourceResponse, DataMapperSourceRequest, AllDataMapperSourceRequest } from "@wso2/ballerina-core";
import { getDataMappingPrompt } from "./dataMappingPrompt";
import { getBallerinaCodeRepairPrompt } from "./codeRepairPrompt";
import { CopilotEventHandler, createWebviewEventHandler } from "../event";
import { getErrorMessage } from "../utils";
import { buildMappingFileArray, buildRecordMap, collectExistingFunctions, collectModuleInfo, createTempBallerinaDir, createTempFileAndGenerateMetadata, getFunctionDefinitionFromSyntaxTree, getUniqueFunctionFilePaths, prepareMappingContext, generateInlineMappingsSource, generateTypesFromContext, extractRecordTypes, repairCodeAndGetUpdatedContent, extractImports, generateDataMapperModel, determineCustomFunctionsPath, generateMappings, getCustomFunctionsContent } from "../../dataMapping";
import { BiDiagramRpcManager, getBallerinaFiles } from "../../../../../src/rpc-managers/bi-diagram/rpc-manager";
import { updateSourceCode } from "../../../../../src/utils/source-utils";
import { StateMachine } from "../../../../stateMachine";
import { extractVariableDefinitionSource, getHasStopped, setHasStopped } from "../../../../../src/rpc-managers/data-mapper/utils";
import { commands, Uri, window } from "vscode";
import { CLOSE_AI_PANEL_COMMAND, OPEN_AI_PANEL_COMMAND } from "../../constants";
import path from "path";
import { URI } from "vscode-uri";

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
export async function generateMappingCodeCore(mappingRequest: ProcessMappingParametersRequest, eventHandler: CopilotEventHandler): Promise<void> {
    if (!mappingRequest.parameters) {
        throw new Error("Parameters are required in the mapping request");
    }

    if (!mappingRequest.parameters.functionName) {
        throw new Error("Function name is required in the mapping parameters");
    }

    if (!eventHandler) {
        throw new Error("Event handler is required for code generation");
    }

    // Initialize generation process
    eventHandler({ type: "start" });
    let assistantResponse: string = "";
    const biDiagramRpcManager = new BiDiagramRpcManager();
    const langClient = StateMachine.langClient();
    const context = StateMachine.context();
    const projectRoot = context.projectUri;

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
                const fs = require("fs");
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

    const tempDirectory = await createTempBallerinaDir();
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
    }, context);

    const sourceCodeResponse = await getAllDataMapperSource(allMappingsRequest);

    await updateSourceCode({ textEdits: sourceCodeResponse.textEdits, skipPayloadCheck: true });
    await new Promise((resolve) => setTimeout(resolve, 100));

    let customFunctionsTargetPath: string;
    let customFunctionsFileName: string;
    
    if (allMappingsRequest.customFunctionsFilePath) {
        customFunctionsTargetPath = determineCustomFunctionsPath(projectRoot, currentActiveFile);
        customFunctionsFileName = path.basename(customFunctionsTargetPath);
    }

    // Check if mappings file and custom functions file are the same
    const mainFilePath = tempFileMetadata.codeData.lineRange.fileName;
    const isSameFile = customFunctionsTargetPath && 
        path.resolve(mainFilePath) === path.resolve(path.join(tempDirectory, customFunctionsFileName));

    let codeRepairResult: { finalContent: string; customFunctionsContent: string };
    const customContent = await getCustomFunctionsContent(allMappingsRequest.customFunctionsFilePath);

    if (isSameFile) {
        const fs = require('fs');
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

    const generatedFunctionDefinition = await getFunctionDefinitionFromSyntaxTree(
        langClient,
        tempFileMetadata.codeData.lineRange.fileName,
        targetFunctionName
    );
    await new Promise((resolve) => setTimeout(resolve, 200));

    let targetFilePath = path.join(projectRoot, mappingContext.filePath);

    const generatedSourceFiles = buildMappingFileArray(
        targetFilePath,
        codeRepairResult.finalContent,
        customFunctionsTargetPath,
        codeRepairResult.customFunctionsContent,
    );

    // Build assistant response
    assistantResponse = `Mappings consist of the following:\n`;
    if (mappingRequest.parameters.inputRecord.length === 1) {
        assistantResponse += `- **Input Record**: ${mappingContext.mappingDetails.inputParams[0]}\n`;
    } else {
        assistantResponse += `- **Input Records**: ${mappingContext.mappingDetails.inputParams.join(", ")}\n`;
    }
    assistantResponse += `- **Output Record**: ${mappingContext.mappingDetails.outputParam}\n`;
    assistantResponse += `- **Function Name**: ${targetFunctionName}\n`;

    if (isSameFile) {
        const mergedContent = `${generatedFunctionDefinition.source}\n${customContent}`;
        assistantResponse += `<code filename="${mappingContext.filePath}" type="ai_map">\n\`\`\`ballerina\n${mergedContent}\n\`\`\`\n</code>`;
    } else {
        assistantResponse += `<code filename="${mappingContext.filePath}" type="ai_map">\n\`\`\`ballerina\n${generatedFunctionDefinition.source}\n\`\`\`\n</code>`;

        if (codeRepairResult.customFunctionsContent) {
            assistantResponse += `<code filename="${customFunctionsFileName}" type="ai_map">\n\`\`\`ballerina\n${codeRepairResult.customFunctionsContent}\n\`\`\`\n</code>`;
        }
    }

    eventHandler({ type: "generated_sources", fileArray: generatedSourceFiles });
    eventHandler({ type: "content_block", content: assistantResponse });
    eventHandler({ type: "stop", command: Command.DataMap });
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
    const projectUri = StateMachine.context().projectUri;

    const ballerinaSourceFiles = await getBallerinaFiles(Uri.file(projectUri).fsPath);

    const importStatements: ImportStatements[] = [];

    for (const ballerinaFile of ballerinaSourceFiles) {
        const fs = require("fs");
        const sourceFileContent = fs.readFileSync(ballerinaFile, "utf8");
        const extractedImports = extractImports(sourceFileContent, ballerinaFile);
        importStatements.push(extractedImports);
    }

    return {
        projectPath: projectUri,
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
    const fs = require("fs");
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
export async function generateInlineMappingCodeCore(inlineMappingRequest: MetadataWithAttachments, eventHandler: CopilotEventHandler): Promise<void> {
    if (!inlineMappingRequest.metadata) {
        throw new Error("Metadata is required in the inline mapping request");
    }

    if (!inlineMappingRequest.metadata.codeData) {
        throw new Error("Code data is required in the metadata");
    }

    if (!eventHandler) {
        throw new Error("Event handler is required for code generation");
    }

    // Initialize generation process
    eventHandler({ type: "start" });
    let assistantResponse: string = "";
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
    const projectRoot = context.projectUri;

    const inlineMappingsResult: InlineMappingsSourceResult =
        await generateInlineMappingsSource(inlineMappingRequest, langClient, context);

    await updateSourceCode({ textEdits: inlineMappingsResult.sourceResponse.textEdits, skipPayloadCheck: true });
    await new Promise((resolve) => setTimeout(resolve, 100));

    let customFunctionsTargetPath: string | undefined;
    let customFunctionsFileName: string | undefined;
    
    if (inlineMappingsResult.allMappingsRequest.customFunctionsFilePath) {
        customFunctionsTargetPath = determineCustomFunctionsPath(projectRoot, targetFileName);
        customFunctionsFileName = path.basename(customFunctionsTargetPath);
    }

    // Check if mappings file and custom functions file are the same
    const mainFilePath = inlineMappingsResult.tempFileMetadata.codeData.lineRange.fileName;
    const isSameFile = customFunctionsTargetPath && 
        path.resolve(mainFilePath) === path.resolve(path.join(inlineMappingsResult.tempDir, customFunctionsFileName));

    let codeRepairResult: { finalContent: string; customFunctionsContent: string };
    const customContent = await getCustomFunctionsContent(inlineMappingsResult.allMappingsRequest.customFunctionsFilePath);

    if (isSameFile) {
        const fs = require('fs');
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

    const generatedSourceFiles = buildMappingFileArray(
        context.documentUri,
        codeRepairResult.finalContent,
        customFunctionsTargetPath,
        codeRepairResult.customFunctionsContent,
    );

    const variableName = inlineMappingRequest.metadata.name || inlineMappingsResult.tempFileMetadata.name;

    let codeToDisplay = codeRepairResult.finalContent;
    if (variableName) {
        const extractedVariableDefinition = await extractVariableDefinitionSource(
            inlineMappingsResult.tempFileMetadata.codeData.lineRange.fileName,
            inlineMappingsResult.tempFileMetadata.codeData,
            variableName
        );
        if (extractedVariableDefinition) {
            codeToDisplay = extractedVariableDefinition;
        }
    }

    // Build assistant response
    assistantResponse = `Here are the data mappings:\n\n`;
    assistantResponse += `\n**Note**: When you click **Add to Integration**, it will override your existing mappings.\n`;

    if (isSameFile) {
        const mergedCodeDisplay = customContent ? `${codeToDisplay}\n${customContent}` : codeToDisplay;
        assistantResponse += `<code filename="${targetFileName}" type="ai_map">\n\`\`\`ballerina\n${mergedCodeDisplay}\n\`\`\`\n</code>`;
    } else {
        assistantResponse += `<code filename="${targetFileName}" type="ai_map">\n\`\`\`ballerina\n${codeToDisplay}\n\`\`\`\n</code>`;

        if (codeRepairResult.customFunctionsContent) {
            assistantResponse += `<code filename="${customFunctionsFileName}" type="ai_map">\n\`\`\`ballerina\n${codeRepairResult.customFunctionsContent}\n\`\`\`\n</code>`;
        }
    }

    eventHandler({ type: "generated_sources", fileArray: generatedSourceFiles });
    eventHandler({ type: "content_block", content: assistantResponse });
    eventHandler({ type: "stop", command: Command.DataMap });
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
export async function generateContextTypesCore(typeCreationRequest: ProcessContextTypeCreationRequest, eventHandler: CopilotEventHandler): Promise<void> {
    if (!typeCreationRequest.attachments || typeCreationRequest.attachments.length === 0) {
        throw new Error("Attachments are required for type creation");
    }

    if (!eventHandler) {
        throw new Error("Event handler is required for type creation");
    }

    // Initialize generation process
    eventHandler({ type: "start" });
    let assistantResponse: string = "";

    try {
        const biDiagramRpcManager = new BiDiagramRpcManager();
        const projectComponents = await biDiagramRpcManager.getProjectComponents();

        // Generate types from context
        const { typesCode, filePath, recordMap } = await generateTypesFromContext(
            typeCreationRequest.attachments,
            projectComponents
        );

        const extractedNewRecords = extractRecordTypes(typesCode);
        for (const newRecord of extractedNewRecords) {
            if (recordMap.has(newRecord.name)) {
                throw new Error(`Record "${newRecord.name}" already exists in the workspace.`);
            }
        }

        // Build assistant response
        const sourceAttachmentName = typeCreationRequest.attachments?.[0]?.name || "attachment";
        assistantResponse = `Record types generated from the ${sourceAttachmentName} file shown below.\n`;
        assistantResponse += `<code filename="${filePath}" type="type_creator">\n\`\`\`ballerina\n${typesCode}\n\`\`\`\n</code>`;

        // Send assistant response through event handler
        eventHandler({ type: "content_block", content: assistantResponse });
        eventHandler({ type: "stop", command: Command.TypeCreator });
    } catch (error) {
        console.error("Error during context type creation:", error);
        throw error;
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

export async function openChatWindowWithCommand(): Promise<void> {
    const langClient = StateMachine.langClient();
    const context = StateMachine.context();
    const model = await generateDataMapperModel({}, langClient, context);

    // Automatically open AI mapping chat window with the generated model
    const { identifier, dataMapperMetadata } = context;

    commands.executeCommand(CLOSE_AI_PANEL_COMMAND);
    commands.executeCommand(OPEN_AI_PANEL_COMMAND, {
        type: 'command-template',
        command: Command.DataMap,
        templateId: identifier ? TemplateId.MappingsForFunction : TemplateId.InlineMappings,
        ...(identifier && { params: { functionName: identifier } }),
        metadata: {
            ...dataMapperMetadata,
            mappingsModel: model.mappingsModel as DMModel
        }
    });
}
