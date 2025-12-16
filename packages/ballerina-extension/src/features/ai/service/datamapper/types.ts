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

import { DataMapperModelRequest, DataMappingRecord, DMModel, EnumType, IORoot, Mapping, RecordType } from "@wso2/ballerina-core";

// =============================================================================
// DATA MAPPING REQUEST/RESPONSE
// =============================================================================

export interface PackageInfo {
    moduleName: string;
    packageFilePath: string;
}

export interface TypesGenerationResult {
    typesCode: string;
    filePath: string;
    recordMap: Map<string, DataMappingRecord>;
}

export interface DataModelStructure {
    inputs: IORoot[];
    output: IORoot;
    refs: Record<string, RecordType | EnumType>;
}

// =============================================================================
// DATAMAPPER CODE GENERATION
// =============================================================================

export interface DatamapperResponse {
    mappings: Mapping[];
}

// =============================================================================
// DATAMAPPER CODE REPAIR
// =============================================================================

export interface RepairedMapping {
    output: string;     
    expression: string;
}

export interface RepairedMappings {
    repairedMappings: RepairedMapping[];
}

export interface DMModelDiagnosticsResult {
    dataMapperMetadata: DataMapperModelRequest;
    dmModel: DMModel;
}

// =============================================================================
// MAPPING HINTS
// =============================================================================

export interface MappingField {
    MAPPING_TIP: string;
    INPUT_FIELDS: string[];
}

export type MappingFields = MappingField | { [key: string]: MappingFields };

// =============================================================================
// CHAT API
// =============================================================================

export interface ChatMessage {
    role: string;
    content: string;
}

export interface ChatChoice {
    message: ChatMessage;
    index: number;
    finish_reason: string;
}

export interface ChatResponse {
    choices: ChatChoice[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// =============================================================================
// CONTEXT API CONTENT TYPES
// =============================================================================

export type FileData = {
    fileName: string;
    content: string;
};

export type ContentPart = {
    type: "file" | "image" | "text";
    data?: string;
    image?: string;
    text?: string;
    mediaType?: string;
};

export type FileTypeHandler = (file: FileData, includeFileName: boolean) => ContentPart;

export type ProcessType = "mapping_instruction" | "records" | "requirements";

export type DataMapperRequest = {
    files: FileData[];
    text?: string;
    processType: ProcessType;
    isRequirementAnalysis?: boolean; //TODO: Why is this
};

export type DataMapperResponse = {
    fileContent: string;
};
