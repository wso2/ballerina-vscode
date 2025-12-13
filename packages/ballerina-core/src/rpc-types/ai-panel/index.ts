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
import { LoginMethod } from "../../state-machine-types";
import { GetFromFileRequest, DeleteFromProjectRequest, ProjectSource, ProjectDiagnostics, PostProcessRequest, PostProcessResponse, FetchDataRequest, FetchDataResponse, TestGenerationRequest, TestGenerationResponse, TestGenerationMentions, AIChatSummary, DeveloperDocument, RequirementSpecification, LLMDiagnostics, AIPanelPrompt, AIMachineSnapshot, SubmitFeedbackRequest, RelevantLibrariesAndFunctionsRequest, GenerateOpenAPIRequest, GenerateCodeRequest, TestPlanGenerationRequest, TestGeneratorIntermediaryState, RepairParams, RelevantLibrariesAndFunctionsResponse, DocGenerationRequest, AddFilesToProjectRequest, MetadataWithAttachments, ProcessContextTypeCreationRequest, ProcessMappingParametersRequest } from "./interfaces";

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
    getFromFile: (params: GetFromFileRequest) => Promise<string>;
    getFileExists: (params: GetFromFileRequest) => Promise<boolean>;
    deleteFromProject: (params: DeleteFromProjectRequest) => void;
    getShadowDiagnostics: (params: ProjectSource) => Promise<ProjectDiagnostics>;
    checkSyntaxError: (params: ProjectSource) => Promise<boolean>;
    clearInitialPrompt: () => void;
    // Data-mapper related functions
    openChatWindowWithCommand: () => void;
    generateContextTypes: (params: ProcessContextTypeCreationRequest) => void;
    generateMappingCode: (params: ProcessMappingParametersRequest) => void;
    generateInlineMappingCode: (params: MetadataWithAttachments) => void;
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
    submitFeedback: (params: SubmitFeedbackRequest) => Promise<boolean>;
    getRelevantLibrariesAndFunctions: (params: RelevantLibrariesAndFunctionsRequest) => Promise<RelevantLibrariesAndFunctionsResponse>;
    generateOpenAPI: (params: GenerateOpenAPIRequest) => void;
    generateCode: (params: GenerateCodeRequest) => void;
    repairGeneratedCode: (params: RepairParams) => void;
    generateTestPlan: (params: TestPlanGenerationRequest) => void;
    generateFunctionTests: (params: TestGeneratorIntermediaryState) => void;
    generateHealthcareCode: (params: GenerateCodeRequest) => void;
    abortAIGeneration: () => void;
    // ==================================
    // Doc Generation Related Functions
    // ==================================
    getGeneratedDocumentation: (params: DocGenerationRequest) => Promise<void>;
    addFilesToProject: (params: AddFilesToProjectRequest) => Promise<boolean>;
    isUserAuthenticated: () => Promise<boolean>;
}
