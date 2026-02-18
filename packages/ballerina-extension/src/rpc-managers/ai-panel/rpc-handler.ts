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
    AbortAIGenerationRequest,
    acceptChanges,
    addFilesToProject,
    AddFilesToProjectRequest,
    AIPanelPrompt,
    approvePlan,
    approveTask,
    ApproveTaskRequest,
    cancelConnectorSpec,
    cancelConfiguration,
    clearChat,
    clearInitialPrompt,
    ConnectorSpecCancelRequest,
    ConnectorSpecRequest,
    ConfigurationCancelRequest,
    ConfigurationProvideRequest,
    createTestDirecoryIfNotExists,
    declineChanges,
    declinePlan,
    declineTask,
    DocGenerationRequest,
    generateAgent,
    GenerateAgentCodeRequest,
    generateContextTypes,
    generateInlineMappingCode,
    generateMappingCode,
    generateOpenAPI,
    GenerateOpenAPIRequest,
    getActiveTempDir,
    getAffectedPackages,
    getAIMachineSnapshot,
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
    MetadataWithAttachments,
    openAIPanel,
    openChatWindowWithCommand,
    PlanApprovalRequest,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    promptGithubAuthorize,
    provideConnectorSpec,
    provideConfiguration,
    RequirementSpecification,
    restoreCheckpoint,
    RestoreCheckpointRequest,
    SemanticDiffRequest,
    showSignInAlert,
    submitFeedback,
    SubmitFeedbackRequest,
    TaskDeclineRequest,
    updateChatMessage,
    UpdateChatMessageRequest,
    updateRequirementSpecification,
    getUsage
} from "@wso2/ballerina-core";
import { Messenger } from "vscode-messenger";
import { AiPanelRpcManager } from "./rpc-manager";

export function registerAiPanelRpcHandlers(messenger: Messenger) {
    const rpcManger = new AiPanelRpcManager();
    messenger.onRequest(getLoginMethod, () => rpcManger.getLoginMethod());
    messenger.onRequest(isPlatformExtensionAvailable, () => rpcManger.isPlatformExtensionAvailable());
    messenger.onRequest(getDefaultPrompt, () => rpcManger.getDefaultPrompt());
    messenger.onRequest(getAIMachineSnapshot, () => rpcManger.getAIMachineSnapshot());
    messenger.onNotification(clearInitialPrompt, () => rpcManger.clearInitialPrompt());
    messenger.onNotification(openChatWindowWithCommand, () => rpcManger.openChatWindowWithCommand());
    messenger.onNotification(generateContextTypes, (args: ProcessContextTypeCreationRequest) => rpcManger.generateContextTypes(args));
    messenger.onNotification(generateMappingCode, (args: ProcessMappingParametersRequest) => rpcManger.generateMappingCode(args));
    messenger.onNotification(generateInlineMappingCode, (args: MetadataWithAttachments) => rpcManger.generateInlineMappingCode(args));
    messenger.onRequest(getServiceNames, () => rpcManger.getServiceNames());
    messenger.onRequest(promptGithubAuthorize, () => rpcManger.promptGithubAuthorize());
    messenger.onRequest(isCopilotSignedIn, () => rpcManger.isCopilotSignedIn());
    messenger.onRequest(showSignInAlert, () => rpcManger.showSignInAlert());
    messenger.onNotification(markAlertShown, () => rpcManger.markAlertShown());
    messenger.onRequest(getFromDocumentation, (args: string) => rpcManger.getFromDocumentation(args));
    messenger.onRequest(getDriftDiagnosticContents, () => rpcManger.getDriftDiagnosticContents());
    messenger.onNotification(updateRequirementSpecification, (args: RequirementSpecification) => rpcManger.updateRequirementSpecification(args));
    messenger.onNotification(createTestDirecoryIfNotExists, () => rpcManger.createTestDirecoryIfNotExists());
    messenger.onRequest(submitFeedback, (args: SubmitFeedbackRequest) => rpcManger.submitFeedback(args));
    messenger.onNotification(generateOpenAPI, (args: GenerateOpenAPIRequest) => rpcManger.generateOpenAPI(args));
    messenger.onRequest(generateAgent, (args: GenerateAgentCodeRequest) => rpcManger.generateAgent(args));
    messenger.onNotification(abortAIGeneration, (args: AbortAIGenerationRequest) => rpcManger.abortAIGeneration(args));
    messenger.onRequest(getGeneratedDocumentation, (args: DocGenerationRequest) => rpcManger.getGeneratedDocumentation(args));
    messenger.onRequest(addFilesToProject, (args: AddFilesToProjectRequest) => rpcManger.addFilesToProject(args));
    messenger.onRequest(isUserAuthenticated, () => rpcManger.isUserAuthenticated());
    messenger.onRequest(openAIPanel, (args: AIPanelPrompt) => rpcManger.openAIPanel(args));
    messenger.onRequest(isPlanModeFeatureEnabled, () => rpcManger.isPlanModeFeatureEnabled());
    messenger.onRequest(getSemanticDiff, (args: SemanticDiffRequest) => rpcManger.getSemanticDiff(args));
    messenger.onRequest(getAffectedPackages, () => rpcManger.getAffectedPackages());
    messenger.onRequest(isWorkspaceProject, () => rpcManger.isWorkspaceProject());
    messenger.onRequest(acceptChanges, () => rpcManger.acceptChanges());
    messenger.onRequest(declineChanges, () => rpcManger.declineChanges());
    messenger.onRequest(approvePlan, (args: PlanApprovalRequest) => rpcManger.approvePlan(args));
    messenger.onRequest(declinePlan, (args: PlanApprovalRequest) => rpcManger.declinePlan(args));
    messenger.onRequest(approveTask, (args: ApproveTaskRequest) => rpcManger.approveTask(args));
    messenger.onRequest(declineTask, (args: TaskDeclineRequest) => rpcManger.declineTask(args));
    messenger.onRequest(provideConnectorSpec, (args: ConnectorSpecRequest) => rpcManger.provideConnectorSpec(args));
    messenger.onRequest(cancelConnectorSpec, (args: ConnectorSpecCancelRequest) => rpcManger.cancelConnectorSpec(args));
    messenger.onRequest(provideConfiguration, (args: ConfigurationProvideRequest) => rpcManger.provideConfiguration(args));
    messenger.onRequest(cancelConfiguration, (args: ConfigurationCancelRequest) => rpcManger.cancelConfiguration(args));
    messenger.onRequest(getChatMessages, () => rpcManger.getChatMessages());
    messenger.onRequest(getCheckpoints, () => rpcManger.getCheckpoints());
    messenger.onRequest(restoreCheckpoint, (args: RestoreCheckpointRequest) => rpcManger.restoreCheckpoint(args));
    messenger.onRequest(clearChat, () => rpcManger.clearChat());
    messenger.onRequest(updateChatMessage, (args: UpdateChatMessageRequest) => rpcManger.updateChatMessage(args));
    messenger.onRequest(getActiveTempDir, () => rpcManger.getActiveTempDir());
    messenger.onRequest(getUsage, () => rpcManger.getUsage());
}
