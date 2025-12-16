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
import {
    abortAIGeneration,
    abortTestGeneration,
    addChatSummary,
    addFilesToProject,
    AddFilesToProjectRequest,
    AIChatSummary,
    AIPanelPrompt,
    applyDoOnFailBlocks,
    checkSyntaxError,
    clearInitialPrompt,
    createTestDirecoryIfNotExists,
    deleteFromProject,
    DeleteFromProjectRequest,
    DeveloperDocument,
    DocGenerationRequest,
    fetchData,
    FetchDataRequest,
    generateAgent,
    GenerateAgentCodeRequest,
    generateCode,
    GenerateCodeRequest,
    generateContextTypes,
    generateFunctionTests,
    generateHealthcareCode,
    generateInlineMappingCode,
    generateMappingCode,
    generateOpenAPI,
    GenerateOpenAPIRequest,
    generateTestPlan,
    getAccessToken,
    getAIMachineSnapshot,
    getBackendUrl,
    getDefaultPrompt,
    getDriftDiagnosticContents,
    getFileExists,
    getFromDocumentation,
    getFromFile,
    GetFromFileRequest,
    getGeneratedDocumentation,
    getGeneratedTests,
    getLoginMethod,
    getProjectUuid,
    getRefreshedAccessToken,
    getRelevantLibrariesAndFunctions,
    getResourceMethodAndPaths,
    getResourceSourceForMethodAndPath,
    getServiceNames,
    getServiceSourceForName,
    getShadowDiagnostics,
    getTestDiagnostics,
    handleChatSummaryError,
    isCopilotSignedIn,
    isNaturalProgrammingDirectoryExists,
    isPlanModeFeatureEnabled,
    isRequirementsSpecificationFileExist,
    isUserAuthenticated,
    markAlertShown,
    MetadataWithAttachments,
    openAIPanel,
    openChatWindowWithCommand,
    postProcess,
    PostProcessRequest,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    ProjectSource,
    promptGithubAuthorize,
    promptWSO2AILogout,
    readDeveloperMdFile,
    RelevantLibrariesAndFunctionsRequest,
    repairGeneratedCode,
    RepairParams,
    RequirementSpecification,
    showSignInAlert,
    submitFeedback,
    SubmitFeedbackRequest,
    TestGenerationRequest,
    TestGenerationResponse,
    TestGeneratorIntermediaryState,
    TestPlanGenerationRequest,
    updateDevelopmentDocument,
    updateRequirementSpecification
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { AiPanelRpcManager } from "./rpc-manager";

export function registerAiPanelRpcHandlers(messenger: Messenger) {
    const rpcManger = new AiPanelRpcManager();
    messenger.onRequest(getBackendUrl, () => rpcManger.getBackendUrl());
    messenger.onRequest(getProjectUuid, () => rpcManger.getProjectUuid());
    messenger.onRequest(getLoginMethod, () => rpcManger.getLoginMethod());
    messenger.onRequest(getAccessToken, () => rpcManger.getAccessToken());
    messenger.onRequest(getRefreshedAccessToken, () => rpcManger.getRefreshedAccessToken());
    messenger.onRequest(getDefaultPrompt, () => rpcManger.getDefaultPrompt());
    messenger.onRequest(getAIMachineSnapshot, () => rpcManger.getAIMachineSnapshot());
    messenger.onRequest(fetchData, (args: FetchDataRequest) => rpcManger.fetchData(args));
    messenger.onRequest(getFromFile, (args: GetFromFileRequest) => rpcManger.getFromFile(args));
    messenger.onRequest(getFileExists, (args: GetFromFileRequest) => rpcManger.getFileExists(args));
    messenger.onNotification(deleteFromProject, (args: DeleteFromProjectRequest) => rpcManger.deleteFromProject(args));
    messenger.onRequest(getShadowDiagnostics, (args: ProjectSource) => rpcManger.getShadowDiagnostics(args));
    messenger.onRequest(checkSyntaxError, (args: ProjectSource) => rpcManger.checkSyntaxError(args));
    messenger.onNotification(clearInitialPrompt, () => rpcManger.clearInitialPrompt());
    messenger.onNotification(openChatWindowWithCommand, () => rpcManger.openChatWindowWithCommand());
    messenger.onRequest(generateContextTypes, (args: ProcessContextTypeCreationRequest) => rpcManger.generateContextTypes(args));
    messenger.onNotification(generateMappingCode, (args: ProcessMappingParametersRequest) => rpcManger.generateMappingCode(args));
    messenger.onNotification(generateInlineMappingCode, (args: MetadataWithAttachments) => rpcManger.generateInlineMappingCode(args));
    messenger.onRequest(getGeneratedTests, (args: TestGenerationRequest) => rpcManger.getGeneratedTests(args));
    messenger.onRequest(getTestDiagnostics, (args: TestGenerationResponse) => rpcManger.getTestDiagnostics(args));
    messenger.onRequest(getServiceSourceForName, (args: string) => rpcManger.getServiceSourceForName(args));
    messenger.onRequest(getResourceSourceForMethodAndPath, (args: string) => rpcManger.getResourceSourceForMethodAndPath(args));
    messenger.onRequest(getServiceNames, () => rpcManger.getServiceNames());
    messenger.onRequest(getResourceMethodAndPaths, () => rpcManger.getResourceMethodAndPaths());
    messenger.onNotification(abortTestGeneration, () => rpcManger.abortTestGeneration());
    messenger.onNotification(applyDoOnFailBlocks, () => rpcManger.applyDoOnFailBlocks());
    messenger.onRequest(postProcess, (args: PostProcessRequest) => rpcManger.postProcess(args));
    messenger.onRequest(promptGithubAuthorize, () => rpcManger.promptGithubAuthorize());
    messenger.onRequest(promptWSO2AILogout, () => rpcManger.promptWSO2AILogout());
    messenger.onRequest(isCopilotSignedIn, () => rpcManger.isCopilotSignedIn());
    messenger.onRequest(showSignInAlert, () => rpcManger.showSignInAlert());
    messenger.onNotification(markAlertShown, () => rpcManger.markAlertShown());
    messenger.onRequest(getFromDocumentation, (args: string) => rpcManger.getFromDocumentation(args));
    messenger.onRequest(isRequirementsSpecificationFileExist, (args: string) => rpcManger.isRequirementsSpecificationFileExist(args));
    messenger.onRequest(getDriftDiagnosticContents, () => rpcManger.getDriftDiagnosticContents());
    messenger.onRequest(addChatSummary, (args: AIChatSummary) => rpcManger.addChatSummary(args));
    messenger.onNotification(handleChatSummaryError, (args: string) => rpcManger.handleChatSummaryError(args));
    messenger.onRequest(isNaturalProgrammingDirectoryExists, (args: string) => rpcManger.isNaturalProgrammingDirectoryExists(args));
    messenger.onRequest(readDeveloperMdFile, (args: string) => rpcManger.readDeveloperMdFile(args));
    messenger.onNotification(updateDevelopmentDocument, (args: DeveloperDocument) => rpcManger.updateDevelopmentDocument(args));
    messenger.onNotification(updateRequirementSpecification, (args: RequirementSpecification) => rpcManger.updateRequirementSpecification(args));
    messenger.onNotification(createTestDirecoryIfNotExists, () => rpcManger.createTestDirecoryIfNotExists());
    messenger.onRequest(submitFeedback, (args: SubmitFeedbackRequest) => rpcManger.submitFeedback(args));
    messenger.onRequest(getRelevantLibrariesAndFunctions, (args: RelevantLibrariesAndFunctionsRequest) => rpcManger.getRelevantLibrariesAndFunctions(args));
    messenger.onNotification(generateOpenAPI, (args: GenerateOpenAPIRequest) => rpcManger.generateOpenAPI(args));
    messenger.onNotification(generateCode, (args: GenerateCodeRequest) => rpcManger.generateCode(args));
    messenger.onRequest(generateAgent, (args: GenerateAgentCodeRequest) => rpcManger.generateAgent(args));
    messenger.onNotification(repairGeneratedCode, (args: RepairParams) => rpcManger.repairGeneratedCode(args));
    messenger.onNotification(generateTestPlan, (args: TestPlanGenerationRequest) => rpcManger.generateTestPlan(args));
    messenger.onNotification(generateFunctionTests, (args: TestGeneratorIntermediaryState) => rpcManger.generateFunctionTests(args));
    messenger.onNotification(generateHealthcareCode, (args: GenerateCodeRequest) => rpcManger.generateHealthcareCode(args));
    messenger.onNotification(abortAIGeneration, () => rpcManger.abortAIGeneration());
    messenger.onNotification(getGeneratedDocumentation, (args: DocGenerationRequest) => rpcManger.getGeneratedDocumentation(args));
    messenger.onRequest(addFilesToProject, (args: AddFilesToProjectRequest) => rpcManger.addFilesToProject(args));
    messenger.onRequest(isUserAuthenticated, () => rpcManger.isUserAuthenticated());
    messenger.onNotification(openAIPanel, (args: AIPanelPrompt) => rpcManger.openAIPanel(args));
    messenger.onRequest(isPlanModeFeatureEnabled, () => rpcManger.isPlanModeFeatureEnabled());
}
