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
    AIChatSummary,
    AIMachineSnapshot,
    AIPanelAPI,
    AIPanelPrompt,
    AddFilesToProjectRequest,
    AddToProjectRequest,
    DeleteFromProjectRequest,
    DeveloperDocument,
    DocGenerationRequest,
    FetchDataRequest,
    FetchDataResponse,
    GenerateCodeRequest,
    GenerateOpenAPIRequest,
    GetFromFileRequest,
    LLMDiagnostics,
    LoginMethod,
    MetadataWithAttachments,
    PostProcessRequest,
    PostProcessResponse,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    ProjectDiagnostics,
    ProjectSource,
    RelevantLibrariesAndFunctionsRequest,
    RelevantLibrariesAndFunctionsResponse,
    RepairParams,
    RequirementSpecification,
    SubmitFeedbackRequest,
    TestGenerationMentions,
    TestGenerationRequest,
    TestGenerationResponse,
    TestGeneratorIntermediaryState,
    TestPlanGenerationRequest,
    abortAIGeneration,
    abortTestGeneration,
    addChatSummary,
    addFilesToProject,
    addToProject,
    applyDoOnFailBlocks,
    checkSyntaxError,
    clearInitialPrompt,
    createTestDirecoryIfNotExists,
    deleteFromProject,
    fetchData,
    generateCode,
    generateContextTypes,
    generateFunctionTests,
    generateHealthcareCode,
    generateInlineMappingCode,
    generateMappingCode,
    generateOpenAPI,
    generateTestPlan,
    getAIMachineSnapshot,
    getAccessToken,
    getBackendUrl,
    getDefaultPrompt,
    getDriftDiagnosticContents,
    getFileExists,
    getFromDocumentation,
    getFromFile,
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
    isRequirementsSpecificationFileExist,
    isUserAuthenticated,
    markAlertShown,
    openChatWindowWithCommand,
    postProcess,
    promptGithubAuthorize,
    promptWSO2AILogout,
    readDeveloperMdFile,
    repairGeneratedCode,
    showSignInAlert,
    submitFeedback,
    updateDevelopmentDocument,
    updateRequirementSpecification
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class AiPanelRpcClient implements AIPanelAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getBackendUrl(): Promise<string> {
        return this._messenger.sendRequest(getBackendUrl, HOST_EXTENSION);
    }

    getProjectUuid(): Promise<string> {
        return this._messenger.sendRequest(getProjectUuid, HOST_EXTENSION);
    }

    getLoginMethod(): Promise<LoginMethod> {
        return this._messenger.sendRequest(getLoginMethod, HOST_EXTENSION);
    }

    getAccessToken(): Promise<string> {
        return this._messenger.sendRequest(getAccessToken, HOST_EXTENSION);
    }

    getRefreshedAccessToken(): Promise<string> {
        return this._messenger.sendRequest(getRefreshedAccessToken, HOST_EXTENSION);
    }

    getDefaultPrompt(): Promise<AIPanelPrompt> {
        return this._messenger.sendRequest(getDefaultPrompt, HOST_EXTENSION);
    }

    getAIMachineSnapshot(): Promise<AIMachineSnapshot> {
        return this._messenger.sendRequest(getAIMachineSnapshot, HOST_EXTENSION);
    }

    fetchData(params: FetchDataRequest): Promise<FetchDataResponse> {
        return this._messenger.sendRequest(fetchData, HOST_EXTENSION, params);
    }

    addToProject(params: AddToProjectRequest): Promise<boolean> {
        return this._messenger.sendRequest(addToProject, HOST_EXTENSION, params);
    }

    getFromFile(params: GetFromFileRequest): Promise<string> {
        return this._messenger.sendRequest(getFromFile, HOST_EXTENSION, params);
    }

    getFileExists(params: GetFromFileRequest): Promise<boolean> {
        return this._messenger.sendRequest(getFileExists, HOST_EXTENSION, params);
    }

    deleteFromProject(params: DeleteFromProjectRequest): void {
        return this._messenger.sendNotification(deleteFromProject, HOST_EXTENSION, params);
    }

    getShadowDiagnostics(params: ProjectSource): Promise<ProjectDiagnostics> {
        return this._messenger.sendRequest(getShadowDiagnostics, HOST_EXTENSION, params);
    }

    checkSyntaxError(params: ProjectSource): Promise<boolean> {
        return this._messenger.sendRequest(checkSyntaxError, HOST_EXTENSION, params);
    }

    clearInitialPrompt(): void {
        return this._messenger.sendNotification(clearInitialPrompt, HOST_EXTENSION);
    }

    openChatWindowWithCommand(): void {
        return this._messenger.sendNotification(openChatWindowWithCommand, HOST_EXTENSION);
    }

    generateContextTypes(params: ProcessContextTypeCreationRequest): void {
        return this._messenger.sendNotification(generateContextTypes, HOST_EXTENSION, params);
    }

    generateMappingCode(params: ProcessMappingParametersRequest): void {
        return this._messenger.sendNotification(generateMappingCode, HOST_EXTENSION, params);
    }

    generateInlineMappingCode(params: MetadataWithAttachments): void {
        return this._messenger.sendNotification(generateInlineMappingCode, HOST_EXTENSION, params);
    }

    getGeneratedTests(params: TestGenerationRequest): Promise<TestGenerationResponse> {
        return this._messenger.sendRequest(getGeneratedTests, HOST_EXTENSION, params);
    }

    getTestDiagnostics(params: TestGenerationResponse): Promise<ProjectDiagnostics> {
        return this._messenger.sendRequest(getTestDiagnostics, HOST_EXTENSION, params);
    }

    getServiceSourceForName(params: string): Promise<string> {
        return this._messenger.sendRequest(getServiceSourceForName, HOST_EXTENSION, params);
    }

    getResourceSourceForMethodAndPath(params: string): Promise<string> {
        return this._messenger.sendRequest(getResourceSourceForMethodAndPath, HOST_EXTENSION, params);
    }

    getServiceNames(): Promise<TestGenerationMentions> {
        return this._messenger.sendRequest(getServiceNames, HOST_EXTENSION);
    }

    getResourceMethodAndPaths(): Promise<TestGenerationMentions> {
        return this._messenger.sendRequest(getResourceMethodAndPaths, HOST_EXTENSION);
    }

    abortTestGeneration(): void {
        return this._messenger.sendNotification(abortTestGeneration, HOST_EXTENSION);
    }

    applyDoOnFailBlocks(): void {
        return this._messenger.sendNotification(applyDoOnFailBlocks, HOST_EXTENSION);
    }

    postProcess(params: PostProcessRequest): Promise<PostProcessResponse> {
        return this._messenger.sendRequest(postProcess, HOST_EXTENSION, params);
    }

    promptGithubAuthorize(): Promise<boolean> {
        return this._messenger.sendRequest(promptGithubAuthorize, HOST_EXTENSION);
    }

    promptWSO2AILogout(): Promise<boolean> {
        return this._messenger.sendRequest(promptWSO2AILogout, HOST_EXTENSION);
    }

    isCopilotSignedIn(): Promise<boolean> {
        return this._messenger.sendRequest(isCopilotSignedIn, HOST_EXTENSION);
    }

    showSignInAlert(): Promise<boolean> {
        return this._messenger.sendRequest(showSignInAlert, HOST_EXTENSION);
    }

    markAlertShown(): void {
        return this._messenger.sendNotification(markAlertShown, HOST_EXTENSION);
    }

    getFromDocumentation(params: string): Promise<string> {
        return this._messenger.sendRequest(getFromDocumentation, HOST_EXTENSION, params);
    }

    isRequirementsSpecificationFileExist(params: string): Promise<boolean> {
        return this._messenger.sendRequest(isRequirementsSpecificationFileExist, HOST_EXTENSION, params);
    }

    getDriftDiagnosticContents(params: string): Promise<LLMDiagnostics> {
        return this._messenger.sendRequest(getDriftDiagnosticContents, HOST_EXTENSION, params);
    }

    addChatSummary(params: AIChatSummary): Promise<boolean> {
        return this._messenger.sendRequest(addChatSummary, HOST_EXTENSION, params);
    }

    handleChatSummaryError(params: string): void {
        return this._messenger.sendNotification(handleChatSummaryError, HOST_EXTENSION, params);
    }

    isNaturalProgrammingDirectoryExists(params: string): Promise<boolean> {
        return this._messenger.sendRequest(isNaturalProgrammingDirectoryExists, HOST_EXTENSION, params);
    }

    readDeveloperMdFile(params: string): Promise<string> {
        return this._messenger.sendRequest(readDeveloperMdFile, HOST_EXTENSION, params);
    }

    updateDevelopmentDocument(params: DeveloperDocument): void {
        return this._messenger.sendNotification(updateDevelopmentDocument, HOST_EXTENSION, params);
    }

    updateRequirementSpecification(params: RequirementSpecification): void {
        return this._messenger.sendNotification(updateRequirementSpecification, HOST_EXTENSION, params);
    }

    createTestDirecoryIfNotExists(params: string): void {
        return this._messenger.sendNotification(createTestDirecoryIfNotExists, HOST_EXTENSION, params);
    }

    submitFeedback(params: SubmitFeedbackRequest): Promise<boolean> {
        return this._messenger.sendRequest(submitFeedback, HOST_EXTENSION, params);
    }

    getRelevantLibrariesAndFunctions(params: RelevantLibrariesAndFunctionsRequest): Promise<RelevantLibrariesAndFunctionsResponse> {
        return this._messenger.sendRequest(getRelevantLibrariesAndFunctions, HOST_EXTENSION, params);
    }

    generateOpenAPI(params: GenerateOpenAPIRequest): void {
        return this._messenger.sendNotification(generateOpenAPI, HOST_EXTENSION, params);
    }

    generateCode(params: GenerateCodeRequest): void {
        return this._messenger.sendNotification(generateCode, HOST_EXTENSION, params);
    }

    repairGeneratedCode(params: RepairParams): void {
        return this._messenger.sendNotification(repairGeneratedCode, HOST_EXTENSION, params);
    }

    generateTestPlan(params: TestPlanGenerationRequest): void {
        return this._messenger.sendNotification(generateTestPlan, HOST_EXTENSION, params);
    }

    generateFunctionTests(params: TestGeneratorIntermediaryState): void {
        return this._messenger.sendNotification(generateFunctionTests, HOST_EXTENSION, params);
    }

    generateHealthcareCode(params: GenerateCodeRequest): void {
        return this._messenger.sendNotification(generateHealthcareCode, HOST_EXTENSION, params);
    }

    abortAIGeneration(): void {
        return this._messenger.sendNotification(abortAIGeneration, HOST_EXTENSION);
    }

    getGeneratedDocumentation(params: DocGenerationRequest): Promise<void> {
        return this._messenger.sendRequest(getGeneratedDocumentation, HOST_EXTENSION, params);
    }

    addFilesToProject(params: AddFilesToProjectRequest): Promise<boolean> {
        return this._messenger.sendRequest(addFilesToProject, HOST_EXTENSION, params);
    }

    isUserAuthenticated(): Promise<boolean> {
        return this._messenger.sendRequest(isUserAuthenticated, HOST_EXTENSION);
    }
}
