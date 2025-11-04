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
    AllDataMapperSourceRequest,
    CodeSegment,
    CreateTempFileRequest,
    DataMapperModelResponse,
    DatamapperModelContext,
    DeleteFromProjectRequest,
    DeveloperDocument,
    DocGenerationRequest,
    ExtendedDataMapperMetadata,
    FetchDataRequest,
    FetchDataResponse,
    GenerateCodeRequest,
    GenerateAgentCodeRequest,
    GenerateMappingsResponse,
    GenerateOpenAPIRequest,
    GenerateTypesFromRecordRequest,
    GenerateTypesFromRecordResponse,
    GetFromFileRequest,
    GetModuleDirParams,
    LLMDiagnostics,
    LoginMethod,
    MetadataWithAttachments,
    NotifyAIMappingsRequest,
    PostProcessRequest,
    PostProcessResponse,
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
    addCodeSegmentToWorkspace,
    addFilesToProject,
    addInlineCodeSegmentToWorkspace,
    addToProject,
    applyDoOnFailBlocks,
    checkSyntaxError,
    clearInitialPrompt,
    createTempFileAndGenerateMetadata,
    createTestDirecoryIfNotExists,
    deleteFromProject,
    fetchData,
    generateCode,
    generateDataMapperModel,
    generateDesign,
    generateFunctionTests,
    generateHealthcareCode,
    generateMappings,
    generateOpenAPI,
    generateTestPlan,
    getAIMachineSnapshot,
    getAccessToken,
    getActiveFile,
    getBackendUrl,
    getContentFromFile,
    getDefaultPrompt,
    getDriftDiagnosticContents,
    getFileExists,
    getFromDocumentation,
    getFromFile,
    getGeneratedDocumentation,
    getGeneratedTests,
    getLoginMethod,
    getModuleDirectory,
    getProjectUuid,
    getRefreshedAccessToken,
    getRelevantLibrariesAndFunctions,
    getResourceMethodAndPaths,
    getResourceSourceForMethodAndPath,
    getServiceNames,
    getServiceSourceForName,
    getShadowDiagnostics,
    getTestDiagnostics,
    getTypesFromRecord,
    handleChatSummaryError,
    isCopilotSignedIn,
    isNaturalProgrammingDirectoryExists,
    isRequirementsSpecificationFileExist,
    markAlertShown,
    notifyAIMappings,
    openAIMappingChatWindow,
    postProcess,
    promptGithubAuthorize,
    promptWSO2AILogout,
    readDeveloperMdFile,
    repairGeneratedCode,
    showSignInAlert,
    stopAIMappings,
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

    notifyAIMappings(params: NotifyAIMappingsRequest): Promise<boolean> {
        return this._messenger.sendRequest(notifyAIMappings, HOST_EXTENSION, params);
    }

    stopAIMappings(): Promise<GenerateMappingsResponse> {
        return this._messenger.sendRequest(stopAIMappings, HOST_EXTENSION);
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

    openAIMappingChatWindow(params: DataMapperModelResponse): void {
        return this._messenger.sendNotification(openAIMappingChatWindow, HOST_EXTENSION, params);
    }

    generateDataMapperModel(params: DatamapperModelContext): Promise<DataMapperModelResponse> {
        return this._messenger.sendRequest(generateDataMapperModel, HOST_EXTENSION, params);
    }

    getTypesFromRecord(params: GenerateTypesFromRecordRequest): Promise<GenerateTypesFromRecordResponse> {
        return this._messenger.sendRequest(getTypesFromRecord, HOST_EXTENSION, params);
    }

    createTempFileAndGenerateMetadata(params: CreateTempFileRequest): Promise<ExtendedDataMapperMetadata> {
        return this._messenger.sendRequest(createTempFileAndGenerateMetadata, HOST_EXTENSION, params);
    }

    generateMappings(params: MetadataWithAttachments): Promise<AllDataMapperSourceRequest> {
        return this._messenger.sendRequest(generateMappings, HOST_EXTENSION, params);
    }

    addCodeSegmentToWorkspace(params: CodeSegment): Promise<boolean> {
        return this._messenger.sendRequest(addCodeSegmentToWorkspace, HOST_EXTENSION, params);
    }

    addInlineCodeSegmentToWorkspace(params: CodeSegment): void {
        return this._messenger.sendNotification(addInlineCodeSegmentToWorkspace, HOST_EXTENSION, params);
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

    getActiveFile(): Promise<string> {
        return this._messenger.sendRequest(getActiveFile, HOST_EXTENSION);
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

    getModuleDirectory(params: GetModuleDirParams): Promise<string> {
        return this._messenger.sendRequest(getModuleDirectory, HOST_EXTENSION, params);
    }

    getContentFromFile(params: GetFromFileRequest): Promise<string> {
        return this._messenger.sendRequest(getContentFromFile, HOST_EXTENSION, params);
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

    generateDesign(params: GenerateAgentCodeRequest): Promise<boolean> {
        return this._messenger.sendRequest(generateDesign, HOST_EXTENSION, params);
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

    getGeneratedDocumentation(params: DocGenerationRequest): Promise<boolean> {
        return this._messenger.sendRequest(getGeneratedDocumentation, HOST_EXTENSION, params);
    }

    addFilesToProject(params: AddFilesToProjectRequest): Promise<boolean> {
        return this._messenger.sendRequest(addFilesToProject, HOST_EXTENSION, params);
    }
}
