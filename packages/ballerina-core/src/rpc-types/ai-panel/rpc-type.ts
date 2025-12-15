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
 * 
 * THIS FILE INCLUDES AUTO GENERATED CODE
 */
import { LoginMethod } from "../../state-machine-types";
import { GetFromFileRequest, DeleteFromProjectRequest, ProjectSource, ProjectDiagnostics, PostProcessRequest, PostProcessResponse, FetchDataRequest, FetchDataResponse, TestGenerationRequest, TestGenerationResponse, TestGenerationMentions, AIChatSummary, DeveloperDocument, RequirementSpecification, LLMDiagnostics, AIPanelPrompt, AIMachineSnapshot, SubmitFeedbackRequest, RelevantLibrariesAndFunctionsRequest, GenerateOpenAPIRequest, GenerateCodeRequest, TestPlanGenerationRequest, TestGeneratorIntermediaryState, RepairParams, RelevantLibrariesAndFunctionsResponse, DocGenerationRequest, AddFilesToProjectRequest, MetadataWithAttachments, ProcessContextTypeCreationRequest, ProcessMappingParametersRequest } from "./interfaces";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "ai-panel";
export const getBackendUrl: RequestType<void, string> = { method: `${_preFix}/getBackendUrl` };
export const getProjectUuid: RequestType<void, string> = { method: `${_preFix}/getProjectUuid` };
export const getLoginMethod: RequestType<void, LoginMethod> = { method: `${_preFix}/getLoginMethod` };
export const getAccessToken: RequestType<void, string> = { method: `${_preFix}/getAccessToken` };
export const getRefreshedAccessToken: RequestType<void, string> = { method: `${_preFix}/getRefreshedAccessToken` };
export const getDefaultPrompt: RequestType<void, AIPanelPrompt> = { method: `${_preFix}/getDefaultPrompt` };
export const getAIMachineSnapshot: RequestType<void, AIMachineSnapshot> = { method: `${_preFix}/getAIMachineSnapshot` };
export const fetchData: RequestType<FetchDataRequest, FetchDataResponse> = { method: `${_preFix}/fetchData` };
export const getFromFile: RequestType<GetFromFileRequest, string> = { method: `${_preFix}/getFromFile` };
export const getFileExists: RequestType<GetFromFileRequest, boolean> = { method: `${_preFix}/getFileExists` };
export const deleteFromProject: NotificationType<DeleteFromProjectRequest> = { method: `${_preFix}/deleteFromProject` };
export const getShadowDiagnostics: RequestType<ProjectSource, ProjectDiagnostics> = { method: `${_preFix}/getShadowDiagnostics` };
export const checkSyntaxError: RequestType<ProjectSource, boolean> = { method: `${_preFix}/checkSyntaxError` };
export const clearInitialPrompt: NotificationType<void> = { method: `${_preFix}/clearInitialPrompt` };
export const openChatWindowWithCommand: NotificationType<void> = { method: `${_preFix}/openChatWindowWithCommand` };
export const generateContextTypes: RequestType<ProcessContextTypeCreationRequest, void> = { method: `${_preFix}/generateContextTypes` };
export const generateMappingCode: RequestType<ProcessMappingParametersRequest, void> = { method: `${_preFix}/generateMappingCode` };
export const generateInlineMappingCode: RequestType<MetadataWithAttachments, void> = { method: `${_preFix}/generateInlineMappingCode` };
export const getGeneratedTests: RequestType<TestGenerationRequest, TestGenerationResponse> = { method: `${_preFix}/getGeneratedTests` };
export const getTestDiagnostics: RequestType<TestGenerationResponse, ProjectDiagnostics> = { method: `${_preFix}/getTestDiagnostics` };
export const getServiceSourceForName: RequestType<string, string> = { method: `${_preFix}/getServiceSourceForName` };
export const getResourceSourceForMethodAndPath: RequestType<string, string> = { method: `${_preFix}/getResourceSourceForMethodAndPath` };
export const getServiceNames: RequestType<void, TestGenerationMentions> = { method: `${_preFix}/getServiceNames` };
export const getResourceMethodAndPaths: RequestType<void, TestGenerationMentions> = { method: `${_preFix}/getResourceMethodAndPaths` };
export const abortTestGeneration: NotificationType<void> = { method: `${_preFix}/abortTestGeneration` };
export const applyDoOnFailBlocks: NotificationType<void> = { method: `${_preFix}/applyDoOnFailBlocks` };
export const postProcess: RequestType<PostProcessRequest, PostProcessResponse> = { method: `${_preFix}/postProcess` };
export const promptGithubAuthorize: RequestType<void, boolean> = { method: `${_preFix}/promptGithubAuthorize` };
export const promptWSO2AILogout: RequestType<void, boolean> = { method: `${_preFix}/promptWSO2AILogout` };
export const isCopilotSignedIn: RequestType<void, boolean> = { method: `${_preFix}/isCopilotSignedIn` };
export const showSignInAlert: RequestType<void, boolean> = { method: `${_preFix}/showSignInAlert` };
export const markAlertShown: NotificationType<void> = { method: `${_preFix}/markAlertShown` };
export const getFromDocumentation: RequestType<string, string> = { method: `${_preFix}/getFromDocumentation` };
export const isRequirementsSpecificationFileExist: RequestType<string, boolean> = { method: `${_preFix}/isRequirementsSpecificationFileExist` };
export const getDriftDiagnosticContents: RequestType<string, LLMDiagnostics> = { method: `${_preFix}/getDriftDiagnosticContents` };
export const addChatSummary: RequestType<AIChatSummary, boolean> = { method: `${_preFix}/addChatSummary` };
export const handleChatSummaryError: NotificationType<string> = { method: `${_preFix}/handleChatSummaryError` };
export const isNaturalProgrammingDirectoryExists: RequestType<string, boolean> = { method: `${_preFix}/isNaturalProgrammingDirectoryExists` };
export const readDeveloperMdFile: RequestType<string, string> = { method: `${_preFix}/readDeveloperMdFile` };
export const updateDevelopmentDocument: NotificationType<DeveloperDocument> = { method: `${_preFix}/updateDevelopmentDocument` };
export const updateRequirementSpecification: NotificationType<RequirementSpecification> = { method: `${_preFix}/updateRequirementSpecification` };
export const createTestDirecoryIfNotExists: NotificationType<string> = { method: `${_preFix}/createTestDirecoryIfNotExists` };
export const submitFeedback: RequestType<SubmitFeedbackRequest, boolean> = { method: `${_preFix}/submitFeedback` };
export const getRelevantLibrariesAndFunctions: RequestType<RelevantLibrariesAndFunctionsRequest, RelevantLibrariesAndFunctionsResponse> = { method: `${_preFix}/getRelevantLibrariesAndFunctions` };
export const generateOpenAPI: NotificationType<GenerateOpenAPIRequest> = { method: `${_preFix}/generateOpenAPI` };
export const generateCode: NotificationType<GenerateCodeRequest> = { method: `${_preFix}/generateCode` };
export const repairGeneratedCode: NotificationType<RepairParams> = { method: `${_preFix}/repairGeneratedCode` };
export const generateTestPlan: NotificationType<TestPlanGenerationRequest> = { method: `${_preFix}/generateTestPlan` };
export const generateFunctionTests: NotificationType<TestGeneratorIntermediaryState> = { method: `${_preFix}/generateFunctionTests` };
export const generateHealthcareCode: NotificationType<GenerateCodeRequest> = { method: `${_preFix}/generateHealthcareCode` };
export const abortAIGeneration: NotificationType<void> = { method: `${_preFix}/abortAIGeneration` };
export const getGeneratedDocumentation: NotificationType<DocGenerationRequest> = { method: `${_preFix}/getGeneratedDocumentation` };
export const addFilesToProject: RequestType<AddFilesToProjectRequest, boolean> = { method: `${_preFix}/addFilesToProject` };
export const isUserAuthenticated: RequestType<void, boolean> = { method: `${_preFix}/isUserAuthenticated` };
