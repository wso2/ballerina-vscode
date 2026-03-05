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
    AIMachineSnapshot,
    AIPanelAPI,
    AIPanelPrompt,
    AbortAIGenerationRequest,
    AddFilesToProjectRequest,
    ApproveTaskRequest,
    CheckpointInfo,
    ConnectorSpecCancelRequest,
    ConnectorSpecRequest,
    ConfigurationCancelRequest,
    ConfigurationProvideRequest,
    DocGenerationRequest,
    GenerateAgentCodeRequest,
    GenerateOpenAPIRequest,
    LLMDiagnostics,
    LoginMethod,
    MetadataWithAttachments,
    PlanApprovalRequest,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    RequirementSpecification,
    RestoreCheckpointRequest,
    SemanticDiffRequest,
    SemanticDiffResponse,
    SubmitFeedbackRequest,
    TaskDeclineRequest,
    TestGenerationMentions,
    UIChatMessage,
    UpdateChatMessageRequest,
    UsageResponse,
    abortAIGeneration,
    acceptChanges,
    addFilesToProject,
    approvePlan,
    approveTask,
    cancelConnectorSpec,
    cancelConfiguration,
    clearChat,
    clearInitialPrompt,
    createTestDirecoryIfNotExists,
    declineChanges,
    declinePlan,
    declineTask,
    generateAgent,
    generateContextTypes,
    generateInlineMappingCode,
    generateMappingCode,
    generateOpenAPI,
    getAIMachineSnapshot,
    getActiveTempDir,
    getAffectedPackages,
    getChatMessages,
    getCheckpoints,
    getDefaultPrompt,
    getDriftDiagnosticContents,
    getFromDocumentation,
    getGeneratedDocumentation,
    getLoginMethod,
    getSemanticDiff,
    getServiceNames,
    isCopilotSignedIn,
    isPlanModeFeatureEnabled,
    isPlatformExtensionAvailable,
    isUserAuthenticated,
    isWorkspaceProject,
    markAlertShown,
    openAIPanel,
    openChatWindowWithCommand,
    promptGithubAuthorize,
    provideConnectorSpec,
    provideConfiguration,
    restoreCheckpoint,
    showSignInAlert,
    submitFeedback,
    updateChatMessage,
    updateRequirementSpecification,
    getUsage
} from "@wso2/ballerina-core";
import { HOST_EXTENSION } from "vscode-messenger-common";
import { Messenger } from "vscode-messenger-webview";

export class AiPanelRpcClient implements AIPanelAPI {
    private _messenger: Messenger;

    constructor(messenger: Messenger) {
        this._messenger = messenger;
    }

    getLoginMethod(): Promise<LoginMethod> {
        return this._messenger.sendRequest(getLoginMethod, HOST_EXTENSION);
    }

    isPlatformExtensionAvailable(): Promise<boolean> {
        return this._messenger.sendRequest(isPlatformExtensionAvailable, HOST_EXTENSION);
    }

    getDefaultPrompt(): Promise<AIPanelPrompt> {
        return this._messenger.sendRequest(getDefaultPrompt, HOST_EXTENSION);
    }

    getAIMachineSnapshot(): Promise<AIMachineSnapshot> {
        return this._messenger.sendRequest(getAIMachineSnapshot, HOST_EXTENSION);
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

    getServiceNames(): Promise<TestGenerationMentions> {
        return this._messenger.sendRequest(getServiceNames, HOST_EXTENSION);
    }

    promptGithubAuthorize(): Promise<boolean> {
        return this._messenger.sendRequest(promptGithubAuthorize, HOST_EXTENSION);
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

    getDriftDiagnosticContents(): Promise<LLMDiagnostics> {
        return this._messenger.sendRequest(getDriftDiagnosticContents, HOST_EXTENSION);
    }

    updateRequirementSpecification(params: RequirementSpecification): void {
        return this._messenger.sendNotification(updateRequirementSpecification, HOST_EXTENSION, params);
    }

    createTestDirecoryIfNotExists(): void {
        return this._messenger.sendNotification(createTestDirecoryIfNotExists, HOST_EXTENSION);
    }

    submitFeedback(params: SubmitFeedbackRequest): Promise<boolean> {
        return this._messenger.sendRequest(submitFeedback, HOST_EXTENSION, params);
    }

    generateOpenAPI(params: GenerateOpenAPIRequest): void {
        return this._messenger.sendNotification(generateOpenAPI, HOST_EXTENSION, params);
    }

    generateAgent(params: GenerateAgentCodeRequest): Promise<boolean> {
        return this._messenger.sendRequest(generateAgent, HOST_EXTENSION, params);
    }

    abortAIGeneration(params: AbortAIGenerationRequest): void {
        return this._messenger.sendNotification(abortAIGeneration, HOST_EXTENSION, params);
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

    openAIPanel(params: AIPanelPrompt): Promise<void> {
        return this._messenger.sendRequest(openAIPanel, HOST_EXTENSION, params);
    }

    isPlanModeFeatureEnabled(): Promise<boolean> {
        return this._messenger.sendRequest(isPlanModeFeatureEnabled, HOST_EXTENSION);
    }

    getSemanticDiff(params: SemanticDiffRequest): Promise<SemanticDiffResponse> {
        return this._messenger.sendRequest(getSemanticDiff, HOST_EXTENSION, params);
    }

    getAffectedPackages(): Promise<string[]> {
        return this._messenger.sendRequest(getAffectedPackages, HOST_EXTENSION);
    }

    isWorkspaceProject(): Promise<boolean> {
        return this._messenger.sendRequest(isWorkspaceProject, HOST_EXTENSION);
    }

    acceptChanges(): Promise<void> {
        return this._messenger.sendRequest(acceptChanges, HOST_EXTENSION);
    }

    declineChanges(): Promise<void> {
        return this._messenger.sendRequest(declineChanges, HOST_EXTENSION);
    }

    approvePlan(params: PlanApprovalRequest): Promise<void> {
        return this._messenger.sendRequest(approvePlan, HOST_EXTENSION, params);
    }

    declinePlan(params: PlanApprovalRequest): Promise<void> {
        return this._messenger.sendRequest(declinePlan, HOST_EXTENSION, params);
    }

    approveTask(params: ApproveTaskRequest): Promise<void> {
        return this._messenger.sendRequest(approveTask, HOST_EXTENSION, params);
    }

    declineTask(params: TaskDeclineRequest): Promise<void> {
        return this._messenger.sendRequest(declineTask, HOST_EXTENSION, params);
    }

    provideConnectorSpec(params: ConnectorSpecRequest): Promise<void> {
        return this._messenger.sendRequest(provideConnectorSpec, HOST_EXTENSION, params);
    }

    cancelConnectorSpec(params: ConnectorSpecCancelRequest): Promise<void> {
        return this._messenger.sendRequest(cancelConnectorSpec, HOST_EXTENSION, params);
    }

    provideConfiguration(params: ConfigurationProvideRequest): Promise<void> {
        return this._messenger.sendRequest(provideConfiguration, HOST_EXTENSION, params);
    }

    cancelConfiguration(params: ConfigurationCancelRequest): Promise<void> {
        return this._messenger.sendRequest(cancelConfiguration, HOST_EXTENSION, params);
    }

    getChatMessages(): Promise<UIChatMessage[]> {
        return this._messenger.sendRequest(getChatMessages, HOST_EXTENSION);
    }

    getCheckpoints(): Promise<CheckpointInfo[]> {
        return this._messenger.sendRequest(getCheckpoints, HOST_EXTENSION);
    }

    restoreCheckpoint(params: RestoreCheckpointRequest): Promise<void> {
        return this._messenger.sendRequest(restoreCheckpoint, HOST_EXTENSION, params);
    }

    clearChat(): Promise<void> {
        return this._messenger.sendRequest(clearChat, HOST_EXTENSION);
    }

    updateChatMessage(params: UpdateChatMessageRequest): Promise<void> {
        return this._messenger.sendRequest(updateChatMessage, HOST_EXTENSION, params);
    }

    getActiveTempDir(): Promise<string> {
        return this._messenger.sendRequest(getActiveTempDir, HOST_EXTENSION);
    }

    getUsage(): Promise<UsageResponse | undefined> {
        return this._messenger.sendRequest(getUsage, HOST_EXTENSION);
    }
}
