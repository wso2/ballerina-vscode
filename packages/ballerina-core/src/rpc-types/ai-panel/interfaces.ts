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

import { NodePosition } from "@wso2/syntax-tree";
import { AIMachineContext, AIMachineStateValue } from "../../state-machine-types";
import { Command, TemplateId } from "../../interfaces/ai-panel";

// ==================================
// General Interfaces
// ==================================
export type AIPanelPrompt =
    | { type: 'command-template'; command: Command; templateId: TemplateId; text?: string; params?: Map<string, string>; }
    | { type: 'text'; text: string }
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
    projectName: string;
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
export interface GetFromFileRequest {
    filePath: string;
}
export interface DeleteFromProjectRequest {
    filePath: string;
}
export interface GenerateMappingsRequest {
    position: NodePosition;
    filePath: string;
    file?: Attachment;
}

export interface GenerateMappingsResponse {
    newFnPosition?: NodePosition;
    error?: ErrorCode;
    userAborted?: boolean;
}

export interface NotifyAIMappingsRequest {
    newFnPosition: NodePosition;
    prevFnSource: string;
    filePath: string;
}

export interface ParameterMetadata {
    inputs: object;
    output: object;
    inputMetadata: object;
    outputMetadata: object;
    mapping_fields?: object;
}

export interface RecordDefinitonObject {
    recordFields: object;
    recordFieldsMetadata: object;
}

export interface MappingFileRecord {
    mapping_fields: object;
}

export interface ParameterDefinitions {
    parameterMetadata: ParameterMetadata,
    errorStatus: boolean
}

// Test-generator related interfaces
export enum TestGenerationTarget {
    Service = "service",
    Function = "function"
}

export interface TestGenerationRequest {
    backendUri: string;
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

export interface TestGenerationMentions {
    mentions: string[];
}

export interface DataMappingRecord {
    type: string;
    isArray: boolean;
    filePath: string;
}

export interface GenerateMappingsFromRecordRequest {
    backendUri: string;
    token: string;
    inputRecordTypes: DataMappingRecord[];
    outputRecordType: DataMappingRecord;
    functionName: string;
    imports: { moduleName: string; alias?: string }[];
    inputNames?: string[];
    attachment?: Attachment[]
}

export interface GenerateTypesFromRecordRequest {
    backendUri: string;
    token: string;
    attachment?: Attachment[]
}

export interface GenerateMappingFromRecordResponse {
    mappingCode: string;
}
export interface GenerateTypesFromRecordResponse {
    typesCode: string;
}
export interface MappingParameters {
    inputRecord: string[];
    outputRecord: string,
    functionName?: string;
}


export interface PostProcessRequest {
    assistant_response: string;
}

export interface PostProcessResponse {
    assistant_response: string;
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
    filepath: string;
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
