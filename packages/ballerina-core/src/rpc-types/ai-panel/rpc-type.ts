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
import {
    TestGenerationMentions,
    RequirementSpecification,
    LLMDiagnostics,
    AIPanelPrompt,
    AIMachineSnapshot,
    SubmitFeedbackRequest,
    GenerateOpenAPIRequest,
    GenerateAgentCodeRequest,
    DocGenerationRequest,
    AddFilesToProjectRequest,
    MetadataWithAttachments,
    ProcessContextTypeCreationRequest,
    ProcessMappingParametersRequest,
    SemanticDiffRequest,
    SemanticDiffResponse,
    RestoreCheckpointRequest,
    UpdateChatMessageRequest,
    PlanApprovalRequest,
    ApproveTaskRequest,
    TaskDeclineRequest,
    ConnectorSpecRequest,
    ConnectorSpecCancelRequest,
    ConfigurationProvideRequest,
    ConfigurationCancelRequest,
    UIChatMessage,
    CheckpointInfo,
    AbortAIGenerationRequest,
    UsageResponse,
} from "./interfaces";
import { RequestType, NotificationType } from "vscode-messenger-common";

const _preFix = "ai-panel";
export const getLoginMethod: RequestType<void, LoginMethod> = { method: `${_preFix}/getLoginMethod` };
export const isPlatformExtensionAvailable: RequestType<void, boolean> = { method: `${_preFix}/isPlatformExtensionAvailable` };
export const getDefaultPrompt: RequestType<void, AIPanelPrompt> = { method: `${_preFix}/getDefaultPrompt` };
export const getAIMachineSnapshot: RequestType<void, AIMachineSnapshot> = { method: `${_preFix}/getAIMachineSnapshot` };
export const clearInitialPrompt: NotificationType<void> = { method: `${_preFix}/clearInitialPrompt` };
export const openChatWindowWithCommand: NotificationType<void> = { method: `${_preFix}/openChatWindowWithCommand` };
export const generateContextTypes: NotificationType<ProcessContextTypeCreationRequest> = { method: `${_preFix}/generateContextTypes` };
export const generateMappingCode: NotificationType<ProcessMappingParametersRequest> = { method: `${_preFix}/generateMappingCode` };
export const generateInlineMappingCode: NotificationType<MetadataWithAttachments> = { method: `${_preFix}/generateInlineMappingCode` };
export const getServiceNames: RequestType<void, TestGenerationMentions> = { method: `${_preFix}/getServiceNames` };
export const promptGithubAuthorize: RequestType<void, boolean> = { method: `${_preFix}/promptGithubAuthorize` };
export const isCopilotSignedIn: RequestType<void, boolean> = { method: `${_preFix}/isCopilotSignedIn` };
export const showSignInAlert: RequestType<void, boolean> = { method: `${_preFix}/showSignInAlert` };
export const markAlertShown: NotificationType<void> = { method: `${_preFix}/markAlertShown` };
export const getFromDocumentation: RequestType<string, string> = { method: `${_preFix}/getFromDocumentation` };
export const getDriftDiagnosticContents: RequestType<void, LLMDiagnostics> = { method: `${_preFix}/getDriftDiagnosticContents` };
export const updateRequirementSpecification: NotificationType<RequirementSpecification> = { method: `${_preFix}/updateRequirementSpecification` };
export const createTestDirecoryIfNotExists: NotificationType<void> = { method: `${_preFix}/createTestDirecoryIfNotExists` };
export const submitFeedback: RequestType<SubmitFeedbackRequest, boolean> = { method: `${_preFix}/submitFeedback` };
export const generateOpenAPI: NotificationType<GenerateOpenAPIRequest> = { method: `${_preFix}/generateOpenAPI` };
export const generateAgent: RequestType<GenerateAgentCodeRequest, boolean> = { method: `${_preFix}/generateAgent` };
export const abortAIGeneration: NotificationType<AbortAIGenerationRequest> = { method: `${_preFix}/abortAIGeneration` };
export const getGeneratedDocumentation: RequestType<DocGenerationRequest, void> = { method: `${_preFix}/getGeneratedDocumentation` };
export const addFilesToProject: RequestType<AddFilesToProjectRequest, boolean> = { method: `${_preFix}/addFilesToProject` };
export const isUserAuthenticated: RequestType<void, boolean> = { method: `${_preFix}/isUserAuthenticated` };
export const openAIPanel: RequestType<AIPanelPrompt, void> = { method: `${_preFix}/openAIPanel` };
export const isPlanModeFeatureEnabled: RequestType<void, boolean> = { method: `${_preFix}/isPlanModeFeatureEnabled` };
export const getSemanticDiff: RequestType<SemanticDiffRequest, SemanticDiffResponse> = { method: `${_preFix}/getSemanticDiff` };
export const getAffectedPackages: NotificationType<void> = { method: `${_preFix}/getAffectedPackages` };
export const isWorkspaceProject: RequestType<void, boolean> = { method: `${_preFix}/isWorkspaceProject` };
export const acceptChanges: RequestType<void, void> = { method: `${_preFix}/acceptChanges` };
export const declineChanges: RequestType<void, void> = { method: `${_preFix}/declineChanges` };
export const approvePlan: RequestType<PlanApprovalRequest, void> = { method: `${_preFix}/approvePlan` };
export const declinePlan: RequestType<PlanApprovalRequest, void> = { method: `${_preFix}/declinePlan` };
export const approveTask: RequestType<ApproveTaskRequest, void> = { method: `${_preFix}/approveTask` };
export const declineTask: RequestType<TaskDeclineRequest, void> = { method: `${_preFix}/declineTask` };
export const provideConnectorSpec: RequestType<ConnectorSpecRequest, void> = { method: `${_preFix}/provideConnectorSpec` };
export const cancelConnectorSpec: RequestType<ConnectorSpecCancelRequest, void> = { method: `${_preFix}/cancelConnectorSpec` };
export const provideConfiguration: RequestType<ConfigurationProvideRequest, void> = { method: `${_preFix}/provideConfiguration` };
export const cancelConfiguration: RequestType<ConfigurationCancelRequest, void> = { method: `${_preFix}/cancelConfiguration` };
export const getChatMessages: NotificationType<void> = { method: `${_preFix}/getChatMessages` };
export const getCheckpoints: NotificationType<void> = { method: `${_preFix}/getCheckpoints` };
export const restoreCheckpoint: RequestType<RestoreCheckpointRequest, void> = { method: `${_preFix}/restoreCheckpoint` };
export const clearChat: RequestType<void, void> = { method: `${_preFix}/clearChat` };
export const updateChatMessage: RequestType<UpdateChatMessageRequest, void> = { method: `${_preFix}/updateChatMessage` };
export const getActiveTempDir: RequestType<void, string> = { method: `${_preFix}/getActiveTempDir` };
export const getUsage: RequestType<void, UsageResponse | undefined> = { method: `${_preFix}/getUsage` };
