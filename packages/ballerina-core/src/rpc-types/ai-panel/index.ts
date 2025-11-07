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
import { AllDataMapperSourceRequest, CreateTempFileRequest, DatamapperModelContext, DataMapperModelResponse, ExtendedDataMapperMetadata, MetadataWithAttachments } from "../../interfaces/extended-lang-client";
import { LoginMethod } from "../../state-machine-types";
import { AddToProjectRequest, GetFromFileRequest, DeleteFromProjectRequest, GenerateMappingsResponse, NotifyAIMappingsRequest, ProjectSource, ProjectDiagnostics, PostProcessRequest, PostProcessResponse, GenerateTypesFromRecordRequest, GenerateTypesFromRecordResponse, FetchDataRequest, FetchDataResponse, TestGenerationRequest, TestGenerationResponse, TestGenerationMentions, AIChatSummary, DeveloperDocument, RequirementSpecification, LLMDiagnostics, GetModuleDirParams, AIPanelPrompt, AIMachineSnapshot, SubmitFeedbackRequest, RelevantLibrariesAndFunctionsRequest, GenerateOpenAPIRequest, GenerateCodeRequest, GenerateAgentCodeRequest, TestPlanGenerationRequest, TestGeneratorIntermediaryState, RepairParams, RelevantLibrariesAndFunctionsResponse, CodeSegment, DocGenerationRequest, AddFilesToProjectRequest } from "./interfaces";

export interface AIPanelAPI {
    // ==================================
    // General Functions
    // ==================================
    getBackendUrl: () => Promise<string>;
    getProjectUuid: () => Promise<string>;
    getLoginMethod: () => Promise<LoginMethod>;
    getAccessToken: () => Promise<string>;
    getRefreshedAccessToken: () => Promise<string>;
    getDefaultPrompt: () => Promise<AIPanelPrompt>;
    getAIMachineSnapshot: () => Promise<AIMachineSnapshot>;
    fetchData: (params: FetchDataRequest) => Promise<FetchDataResponse>;
    addToProject: (params: AddToProjectRequest) => Promise<boolean>;
    getFromFile: (params: GetFromFileRequest) => Promise<string>;
    getFileExists: (params: GetFromFileRequest) => Promise<boolean>;
    deleteFromProject: (params: DeleteFromProjectRequest) => void;
    notifyAIMappings: (params: NotifyAIMappingsRequest) => Promise<boolean>;
    stopAIMappings: () => Promise<GenerateMappingsResponse>;
    getShadowDiagnostics: (params: ProjectSource) => Promise<ProjectDiagnostics>;
    checkSyntaxError: (params: ProjectSource) => Promise<boolean>;
    clearInitialPrompt: () => void;
    openAIMappingChatWindow: (params: DataMapperModelResponse) => void;
    generateDataMapperModel: (params: DatamapperModelContext) => Promise<DataMapperModelResponse>;
    getTypesFromRecord: (params: GenerateTypesFromRecordRequest) => Promise<GenerateTypesFromRecordResponse>;
    createTempFileAndGenerateMetadata: (params: CreateTempFileRequest) => Promise<ExtendedDataMapperMetadata>;
    generateMappings: (params: MetadataWithAttachments) => Promise<AllDataMapperSourceRequest>;
    addCodeSegmentToWorkspace: (params: CodeSegment) => Promise<boolean>;
    addInlineCodeSegmentToWorkspace: (params: CodeSegment) => void;
    // Test-generator related functions
    getGeneratedTests: (params: TestGenerationRequest) => Promise<TestGenerationResponse>;
    getTestDiagnostics: (params: TestGenerationResponse) => Promise<ProjectDiagnostics>;
    getServiceSourceForName: (params: string) => Promise<string>;
    getResourceSourceForMethodAndPath: (params: string) => Promise<string>;
    getServiceNames: () => Promise<TestGenerationMentions>;
    getResourceMethodAndPaths: () => Promise<TestGenerationMentions>;
    abortTestGeneration: () => void;
    applyDoOnFailBlocks: () => void;
    postProcess: (params: PostProcessRequest) => Promise<PostProcessResponse>;
    getActiveFile:() => Promise<string>;
    promptGithubAuthorize: () => Promise<boolean>;
    promptWSO2AILogout: () => Promise<boolean>;
    isCopilotSignedIn: () => Promise<boolean>;
    showSignInAlert: () => Promise<boolean>;
    markAlertShown: () => void;
    getFromDocumentation: (params: string) => Promise<string>;
    isRequirementsSpecificationFileExist:(params: string) => Promise<boolean>;
    getDriftDiagnosticContents:(params: string) => Promise<LLMDiagnostics>;
    addChatSummary:(params: AIChatSummary) => Promise<boolean>;
    handleChatSummaryError:(params: string) => void;
    isNaturalProgrammingDirectoryExists:(params: string) => Promise<boolean>;
    readDeveloperMdFile:(params: string) => Promise<string>;
    updateDevelopmentDocument:(params: DeveloperDocument) => void;
    updateRequirementSpecification:(params: RequirementSpecification) => void;
    createTestDirecoryIfNotExists:(params: string) => void;
    getModuleDirectory:(params: GetModuleDirParams) => Promise<string>;
    getContentFromFile: (params: GetFromFileRequest) => Promise<string>;
    submitFeedback: (params: SubmitFeedbackRequest) => Promise<boolean>;
    getRelevantLibrariesAndFunctions: (params: RelevantLibrariesAndFunctionsRequest) => Promise<RelevantLibrariesAndFunctionsResponse>;
    generateOpenAPI: (params: GenerateOpenAPIRequest) => void;
    generateCode: (params: GenerateCodeRequest) => void;
    generateDesign: (params: GenerateAgentCodeRequest) => Promise<boolean>;
    repairGeneratedCode: (params: RepairParams) => void;
    generateTestPlan: (params: TestPlanGenerationRequest) => void;
    generateFunctionTests: (params: TestGeneratorIntermediaryState) => void;
    generateHealthcareCode: (params: GenerateCodeRequest) => void;
    abortAIGeneration: () => void;
    // ==================================
    // Doc Generation Related Functions
    // ==================================
    getGeneratedDocumentation: (params: DocGenerationRequest) => Promise<boolean>;
    addFilesToProject: (params: AddFilesToProjectRequest) => Promise<boolean>;
}
