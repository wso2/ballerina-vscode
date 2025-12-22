/* eslint-disable @typescript-eslint/no-explicit-any */
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

import { FunctionDefinition } from "@wso2/syntax-tree";
import { AIMachineContext, AIMachineStateValue } from "../../state-machine-types";
import { Command, TemplateId } from "../../interfaces/ai-panel";
import { AllDataMapperSourceRequest, ExtendedDataMapperMetadata } from "../../interfaces/extended-lang-client";
import { ComponentInfo, DataMapperMetadata, Diagnostics, DMModel, ImportStatements, LinePosition, LineRange, OperationType } from "../..";

// ==================================
// General Interfaces
// ==================================
export type AIPanelPrompt =
    | { type: 'command-template'; command: Command; templateId: TemplateId; text?: string; params?: Record<string, string>; metadata?: Record<string, any> }
    | { type: 'text'; text: string; planMode: boolean; codeContext?: CodeContext }
    | undefined;

export interface AIMachineSnapshot {
    state: AIMachineStateValue;
    context: AIMachineContext;
}

export type ErrorCode = {
    code: number;
    message: string;
}

export interface FetchDataRequest {
    url: string;
    options: RequestInit;
}

export interface FetchDataResponse {
    response: Response
}

export interface ProjectSource {
    projectModules?: ProjectModule[];
    projectTests?: SourceFile[];
    sourceFiles: SourceFile[];
    projectName: string; // Actual package name from package's Ballerina.toml (e.g., "mypackage")
    packagePath: string; // Relative path from workspace root (e.g., "package1", "packages/foo"), empty string for non-workspace
    isActive: boolean; // True if this is the currently active package in the workspace
}

export interface ProjectModule {
    moduleName: string;
    sourceFiles: SourceFile[];
    isGenerated: boolean;
}

export interface SourceFile {
    filePath: string;
    content: string;
}

export interface GetModuleDirParams {
    filePath: string;
    moduleName: string;
}

export interface ProjectDiagnostics {
    diagnostics: DiagnosticEntry[];
}

export interface MappingDiagnostics {
    uri: string;
    diagnostics: DiagnosticEntry[];
}

export interface DiagnosticEntry {
    line?: number;
    message: string;
    code?: string;
}

export interface AddToProjectRequest {
    filePath: string;
    content: string;
    isTestCode: boolean;
}

export interface AddFilesToProjectRequest {
    fileChanges: FileChanges[];
}

export interface FileChanges {
    filePath: string;
    content: string;
}

export interface GetFromFileRequest {
    filePath: string;
}

export interface DeleteFromProjectRequest {
    filePath: string;
}

export interface ProjectImports {
    projectPath: string;
    imports: ImportStatements[];
}

// Data-mapper related interfaces
export interface MetadataWithAttachments {
    metadata: ExtendedDataMapperMetadata;
    attachments: Attachment[];
}

export interface InlineMappingsSourceResult {
    allMappingsRequest: AllDataMapperSourceRequest;
    tempFileMetadata: ExtendedDataMapperMetadata;
    tempDir: string;
}

export interface ProcessContextTypeCreationRequest {
    attachments: Attachment[];
}

export interface ProcessMappingParametersRequest {
    parameters: MappingParameters;
    metadata?: ExtendedDataMapperMetadata;
    attachments?: Attachment[];
}

export interface CreateTempFileRequest {
    tempDir: string;
    filePath: string;
    metadata: ExtendedDataMapperMetadata;
    inputs?: DataMappingRecord[];
    output?: DataMappingRecord;
    functionName?: string;
    inputNames?: string[];
    imports?: ImportInfo[];
    hasMatchingFunction?: boolean;
}

export interface DatamapperModelContext {
    documentUri?: string;
    identifier?: string;
    dataMapperMetadata?: DataMapperMetadata;
}

export interface DiagnosticList {
    diagnosticsList: Diagnostics[];
}

export interface DataMappingRecord {
    type: string;
    isArray: boolean;
    filePath: string;
}

export interface GenerateTypesFromRecordRequest {
    attachment: Attachment[]
}

export interface GenerateTypesFromRecordResponse {
    typesCode: string;
}

export interface MappingParameters {
    inputRecord: string[];
    outputRecord: string,
    functionName?: string;
}

export interface ImportInfo {
    moduleName: string;
    alias?: string;
    recordName?: string;
}

export interface TempDirectoryPath {
    filePaths: string[];
    tempDir?: string;
}

export interface ExtractMappingDetailsRequest {
    parameters: MappingParameters;                
    recordMap: Record<string, DataMappingRecord>;  
    allImports: ImportInfo[];  
    existingFunctions: ComponentInfo[];    
    functionContents: Record<string, string>;        
}

export interface ExistingFunctionMatchResult {
    match: boolean;
    matchingFunctionFile: string | null;
    functionDefNode: FunctionDefinition | null;
}

export interface ExtractMappingDetailsResponse {
    inputs: DataMappingRecord[];    
    output: DataMappingRecord; 
    inputParams: string[];
    outputParam: string;   
    imports: ImportInfo[];
    inputNames: string[];
    existingFunctionMatch: ExistingFunctionMatchResult;       
}

export interface RepairCodeParams {
    tempFileMetadata: ExtendedDataMapperMetadata;
    customFunctionsFilePath?: string;
    imports?: ImportInfo[];
    tempDir?: string;
}

export interface RepairedMapping {
    output: string;       
    expression: string; 
}

export interface repairCodeRequest {
    dmModel: DMModel;
    imports: ImportInfo[];
}

export interface RepairCodeResponse {
    repairedMappings: RepairedMapping[];
}

// Test-generator related interfaces
export enum TestGenerationTarget {
    Service = "service",
    Function = "function"
}

export interface TestGenerationRequest {
    targetType: TestGenerationTarget;
    targetIdentifier: string;
    testPlan?: string;
    diagnostics?: ProjectDiagnostics;
    existingTests?: string;
}

export interface TestGenerationResponse {
    testSource: string;
    testConfig?: string;
}

export interface TestPlanGenerationRequest {
    targetType: TestGenerationTarget;
    targetSource: string;
    target : string;
}

export interface TestGenerationMentions {
    mentions: string[];
}

export interface TestGeneratorIntermediaryState {
    // content: [string, Attachment[]];
    resourceFunction: string;
    testPlan: string;
}

export interface DocumentationGeneratorIntermediaryState {
    serviceName: string;
    documentation: string;
    projectSource: ProjectSource;
    openApiSpec?: string;
}

export interface PostProcessRequest {
    sourceFiles: SourceFile[];
    updatedFileNames: string[];
}

export interface PostProcessResponse {
    sourceFiles: SourceFile[];
    diagnostics: ProjectDiagnostics;
}

export interface AIChatSummary {
    filepath: string;
    summary: string;
}

export interface DeveloperDocument {
    filepath: string;
    content: string;
}

export interface RequirementSpecification {
    content: string;
}

export interface DocAssistantResponse {
    content: string;
    references: string[];
}

export interface LLMDiagnostics {
    statusCode: number;
    diags: string;
}

export interface ExistingFunction {
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
}

// ==================================
// Attachment-Related Interfaces
// ==================================
export interface Attachment {
    name: string;
    path?: string
    content?: string;
    status: AttachmentStatus;
}

export enum AttachmentStatus {
    Success = "Success",
    FileSizeExceeded = "FileSizeExceeded",
    UnsupportedFileFormat = "UnsupportedFileFormat",
    UnknownError = "UnknownError",
}

// ==================================
// Feedback form related Interfaces
// ==================================
export interface SubmitFeedbackRequest {
    positive: boolean;
    messages: FeedbackMessage[];
    feedbackText : string;
    diagnostics: DiagnosticEntry[];
}

export interface FeedbackMessage {
    command?: string;
    content: string;
    role : string;
}

export interface RelevantLibrariesAndFunctionsRequest {
    query: string;
}

export interface RelevantLibrariesAndFunctionsResponse {
    libraries: any[];
}

export interface ChatEntry {
    actor: string;
    message: string;
    isCodeGeneration?: boolean;
}

export interface GenerateOpenAPIRequest {
    query: string;
    chatHistory: ChatEntry[];
}

export interface ChatEntry {
    actor: string;
    message: string;
    isCodeGeneration?: boolean;
}

export interface FileAttatchment {
    fileName: string;
    content: string;
}

export type CodeContext =
    | { type: 'addition'; position: LinePosition, filePath: string }
    | { type: 'selection'; startPosition: LinePosition; endPosition: LinePosition, filePath: string };

export interface GenerateCodeRequest {
    usecase: string;
    chatHistory: ChatEntry[];
    operationType: OperationType;
    fileAttachmentContents: FileAttatchment[];
    codeContext?: CodeContext;
}

export interface GenerateAgentCodeRequest {
    usecase: string;
    chatHistory: any[];
    operationType?: OperationType;
    fileAttachmentContents: FileAttatchment[];
    messageId: string;
    isPlanMode: boolean;
    codeContext?: CodeContext;
}

export interface RepairParams {
    previousMessages: any[];
    assistantResponse?: string; // XML format with code blocks
    sourceFiles?: SourceFile[]; // Optional: parsed from assistantResponse if not provided
    updatedFileNames: string[];
    diagnostics: DiagnosticEntry[];
}

export interface RepairResponse {
    sourceFiles: SourceFile[];
    updatedFileNames: string[];
    diagnostics: DiagnosticEntry[];
}

export type LibraryMode = "CORE" | "HEALTHCARE";

export interface CopilotAllLibrariesRequest {
    mode: LibraryMode;
}
export interface MinifiedLibrary {
    name: string;
    description: string;
}
export interface CopilotCompactLibrariesResponse {
    libraries: MinifiedLibrary[];
}

export interface CopilotFilterLibrariesRequest {
    libNames: string[];
    mode: LibraryMode;
}

export interface CopilotFilterLibrariesResponse {
    libraries: any[];
}

// ==================================
// Doc Generation Related Interfaces
// ==================================
export enum DocGenerationType {
    User = "user",
}

export interface DocGenerationRequest {
    type: DocGenerationType;
    serviceName: string;
}

export const GENERATE_TEST_AGAINST_THE_REQUIREMENT = "Generate tests against the requirements";
export const GENERATE_CODE_AGAINST_THE_REQUIREMENT = "Generate code based on the requirements";

// ==================================
// Execution Context
// ==================================

/**
 * Execution context for AI code generation operations.
 *
 * Contains project path information needed for code generation without
 * depending on global StateMachine state. This enables:
 * - Parallel test execution with isolated contexts
 * - Explicit path dependencies
 * - Better testability and code clarity
 *
 * @property projectPath - Absolute path to the active Ballerina project/package
 * @property workspacePath - Optional absolute path to workspace root (for multi-package workspaces)
 */
export interface ExecutionContext {
    /** Absolute path to the current Ballerina project */
    readonly projectPath: string;

    /** Optional absolute path to workspace root (if multi-package workspace) */
    readonly workspacePath?: string;

}

export interface SemanticDiffRequest {
    projectPath: string;
}

// Numeric enum values from the API
export enum ChangeTypeEnum {
    ADDITION = 0,
    MODIFICATION = 1,
    DELETION = 2
}

export type ChangeType = "ADDITION" | "MODIFICATION" | "DELETION";

export interface SemanticDiff {
    changeType: number; // API returns numeric value
    nodeKind: number;   // API returns numeric value
    uri: string;
    lineRange: LineRange;
}

export interface SemanticDiffResponse {
    loadDesignDiagrams: boolean;
    semanticDiffs: SemanticDiff[];
}
