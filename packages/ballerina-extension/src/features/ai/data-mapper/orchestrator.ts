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

import { ModelMessage, generateObject } from "ai";
import { getAnthropicClient, ANTHROPIC_SONNET_4 } from "../utils/ai-client";
import {
    DatamapperResponse,
    DataModelStructure,
    MappingFields,
    RepairedMapping,
    RepairedMappings,
} from "./types";
import { GeneratedMappingSchema, RepairedMappingsSchema } from "./schema";
import { DataMapperModelResponse, DMModel, Mapping, repairCodeRequest, SourceFile, ImportInfo, Command, ProcessContextTypeCreationRequest, keywords, CodeContext } from "@wso2/ballerina-core";
import { getDataMappingPrompt } from "./prompts/mapping-prompt";
import { getBallerinaCodeRepairPrompt } from "./prompts/repair-prompt";
import { CopilotEventHandler, createWebviewEventHandler, updateAndSaveChat } from "../utils/events";
import { getErrorMessage } from "../utils/ai-utils";
import { generateTypesFromContext } from "./utils/types-generation";
import { generateDataMapperModel } from "./utils/model";
import { BiDiagramRpcManager } from "../../../rpc-managers/bi-diagram/rpc-manager";
import { StateMachine } from "../../../stateMachine";
import { commands } from "vscode";
import { openAIPanelWithPrompt } from "../../../views/ai-panel/aiMachine";
import path from "path";
import { getTempProject, cleanupTempProject } from "../utils/project/temp-project";
import { integrateCodeToWorkspace, formatCodeContext } from "../agent/utils";
import { createExecutionContextFromStateMachine } from "../agent";

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
        JSON.stringify(existingSubMappings || []),
        keywords
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
            abortSignal: new AbortController().signal,
        });

        const aiGeneratedMappings = object.generatedMappings as Mapping[];
        return aiGeneratedMappings;
    } catch (error) {
        console.error("Failed to parse response:", error);
        throw new Error(`Failed to parse mapping response: ${error}`);
    }
}

// =============================================================================
// DM MODEL-BASED CODE REPAIR
// =============================================================================

// Uses Claude AI to repair code based on DM model with diagnostics and import information
async function repairBallerinaCode(
    dmModel: DMModel,
    availableImports: ImportInfo[]
): Promise<RepairedMapping[]> {
    if (!dmModel) {
        throw new Error("DM model is required for code repair");
    }

    // Build repair prompt
    const codeRepairPrompt = getBallerinaCodeRepairPrompt(
        JSON.stringify(dmModel),
        JSON.stringify(availableImports || [])
    );

    const chatMessages: ModelMessage[] = [
        { role: "user", content: codeRepairPrompt }
    ];

    try {
        const { object } = await generateObject({
            model: await getAnthropicClient(ANTHROPIC_SONNET_4),
            maxOutputTokens: 8192,
            temperature: 0,
            messages: chatMessages,
            schema: RepairedMappingsSchema,
            abortSignal: new AbortController().signal,
        });

        return object.repairedMappings as RepairedMapping[];
    } catch (error) {
        console.error("Failed to parse response:", error);
        throw new Error(`Failed to parse repaired mappings response: ${error}`);
    }
}

// Generates repaired mappings by fixing diagnostics with retry logic
export async function generateRepairCode(codeRepairRequest?: repairCodeRequest): Promise<RepairedMappings> {
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
            // Generate AI-powered repaired mappings using Claude with DM model
            const aiRepairedMappings = await repairBallerinaCode(codeRepairRequest.dmModel, codeRepairRequest.imports);

            if (!aiRepairedMappings || aiRepairedMappings.length === 0) {
                console.warn("No mappings were repaired. The code may not have fixable errors.");
                return { repairedMappings: [] };
            }

            return { repairedMappings: aiRepairedMappings };

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

// =============================================================================
// CONTEXT TYPE CREATION WITH EVENT HANDLERS
// =============================================================================

// Core context type creation function that emits events and generates Ballerina record types
export async function generateContextTypesCore(
    typeCreationRequest: ProcessContextTypeCreationRequest,
    eventHandler: CopilotEventHandler,
    messageId?: string,
    tempProjectPath?: string
): Promise<{ modifiedFiles: string[], sourceFiles: SourceFile[] }> {
    if (typeCreationRequest.attachments.length === 0) {
        throw new Error("Attachments are required for type creation");
    }

    // Validate temp project path from base class
    if (!tempProjectPath) {
        throw new Error('Temp project path is required');
    }

    const ctx = createExecutionContextFromStateMachine();
    let projectName = path.basename(ctx.projectPath);

    try {
        // Initialize generation process
        eventHandler({ type: "start" });

        const biDiagramRpcManager = new BiDiagramRpcManager();
        const projectComponents = await biDiagramRpcManager.getProjectComponents();
        eventHandler({ type: "content_block", content: "\n\nAnalyzing your provided data to generate Ballerina record types.\n\n" });
        const generatingTypesId = `generating-types_${Date.now()}`;
        eventHandler({ type: "chat_component", componentType: "progress", id: generatingTypesId, data: { text: "Generating types...", status: "start" } });

        let projectRoot = tempProjectPath;
        if (ctx.workspacePath) {
            projectRoot = path.join(projectRoot, projectName);
        }

        // Generate types from context with validation
        const { typesCode, filePath } = await generateTypesFromContext(
            typeCreationRequest.attachments,
            projectComponents,
            projectRoot
        );
        eventHandler({ type: "chat_component", componentType: "progress", id: generatingTypesId, data: { text: "Generating types...", status: "end" } });

        // Adjust file path for workspace projects
        let targetFilePath = filePath;
        if (ctx.workspacePath) {
            targetFilePath = path.join(projectName, filePath);
        }

        // Create source files array
        const sourceFiles: SourceFile[] = [{
            filePath: targetFilePath,
            content: typesCode
        }];
        const modifiedFiles = [targetFilePath];

        // Integrate code to workspace automatically
        if (modifiedFiles.length > 0) {
            const integratingCodeId = `integrating-code_${Date.now()}`;
            eventHandler({ type: "chat_component", componentType: "progress", id: integratingCodeId, data: { text: "Integrating code to workspace...", status: "start" } });
            const modifiedFilesSet = new Set(modifiedFiles);
            await integrateCodeToWorkspace(tempProjectPath, modifiedFilesSet, ctx);
            eventHandler({ type: "chat_component", componentType: "progress", id: integratingCodeId, data: { text: "Integrating code to workspace...", status: "end" } });
            console.log(`[DataMapper] Integrated ${modifiedFiles.length} file(s) to workspace`);
            eventHandler({ type: "content_block", content: "\n\nType generation is complete! The generated types have been added to your workspace." });
        }

        // Save chat history before stopping (similar to agent finish handler)
        if (messageId) {
            updateAndSaveChat(messageId, Command.TypeCreator, eventHandler);
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
    }
}

// Main public function that uses the default event handler for context type creation
export async function generateContextTypes(typeCreationRequest: ProcessContextTypeCreationRequest, messageId?: string): Promise<void> {
    const eventHandler = createWebviewEventHandler(Command.TypeCreator);

    // Create temp project for backward compatibility
    const ctx = createExecutionContextFromStateMachine();
    const { path: tempProjectPath } = await getTempProject(ctx);

    try {
        await generateContextTypesCore(typeCreationRequest, eventHandler, messageId, tempProjectPath);
    } catch (error) {
        console.error("Error during context type creation:", error);
        throw error;
    } finally {
        // Cleanup for backward compatibility
        await cleanupTempProject(tempProjectPath);
    }
}

// Opens the AI panel with data mapper chat interface
export async function openChatWindowWithCommand(): Promise<void> {
    const context = StateMachine.context();
    const { identifier, documentUri } = context;

    let args: string | undefined;
    const hiddenParts: string[] = [];
    if (documentUri) { hiddenParts.push(`File: ${documentUri}`); }

    if (identifier) {
        args = `generate mappings for the ${identifier} function`;
        hiddenParts.push(`Mode: function`);
        hiddenParts.push(`Function: ${identifier}`);
    } else {
        try {
            const langClient = StateMachine.langClient();
            const model = await generateDataMapperModel({}, langClient, context);
            const output = (model.mappingsModel as DMModel)?.output;
            const outputType = output?.typeName ?? output?.name;
            if (outputType) { hiddenParts.push(`Output type: ${outputType}`); }
        } catch (err) {
            console.warn('[openChatWindowWithCommand] Failed to extract output type:', err);
        }
        try {
            const lineRange = context.dataMapperMetadata?.codeData?.lineRange;
            if (lineRange && documentUri) {
                const codeContext: CodeContext = {
                    type: 'selection',
                    filePath: documentUri,
                    startPosition: { line: lineRange.startLine.line, offset: lineRange.startLine.offset },
                    endPosition: { line: lineRange.endLine.line, offset: lineRange.endLine.offset },
                };
                const snippet = formatCodeContext(codeContext);
                if (snippet) { hiddenParts.push(snippet); }
            }
        } catch (err) {
            console.warn('[openChatWindowWithCommand] Failed to extract code snippet:', err);
        }
        args = "generate mappings using record fields and external values";
        hiddenParts.push(`Mode: inline`);
    }

    openAIPanelWithPrompt({
        type: 'skill',
        skillId: 'data-map',
        skillName: 'data-map',
        ...(args && { args }),
        ...(hiddenParts.length > 0 && { hiddenContext: hiddenParts.join('\n') }),
    });
}
