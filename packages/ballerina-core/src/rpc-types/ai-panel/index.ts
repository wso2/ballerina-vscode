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

export interface AIPanelAPI {
    // ==================================
    // General Functions
    // ==================================
    getLoginMethod: () => Promise<LoginMethod>;
    isPlatformExtensionAvailable: () => Promise<boolean>;
    getDefaultPrompt: () => Promise<AIPanelPrompt>; //starting args
    getAIMachineSnapshot: () => Promise<AIMachineSnapshot>; //login state machine
    clearInitialPrompt: () => void; //starting args
    // Data-mapper related functions
    openChatWindowWithCommand: () => void;
    generateContextTypes: (params: ProcessContextTypeCreationRequest) => void;
    generateMappingCode: (params: ProcessMappingParametersRequest) => void;
    generateInlineMappingCode: (params: MetadataWithAttachments) => void;
    getServiceNames: () => Promise<TestGenerationMentions>;
    promptGithubAuthorize: () => Promise<boolean>;
    isCopilotSignedIn: () => Promise<boolean>;
    showSignInAlert: () => Promise<boolean>;
    markAlertShown: () => void;
    getFromDocumentation: (params: string) => Promise<string>;
    getDriftDiagnosticContents: () => Promise<LLMDiagnostics>;
    updateRequirementSpecification: (params: RequirementSpecification) => void;
    createTestDirecoryIfNotExists: () => void;
    submitFeedback: (params: SubmitFeedbackRequest) => Promise<boolean>;
    generateOpenAPI: (params: GenerateOpenAPIRequest) => void;
    generateAgent: (params: GenerateAgentCodeRequest) => Promise<boolean>;
    abortAIGeneration: (params: AbortAIGenerationRequest) => void;
    // ==================================
    // Doc Generation Related Functions
    // ==================================
    getGeneratedDocumentation: (params: DocGenerationRequest) => Promise<void>;
    addFilesToProject: (params: AddFilesToProjectRequest) => Promise<boolean>;
    isUserAuthenticated: () => Promise<boolean>;
    openAIPanel: (params: AIPanelPrompt) => Promise<void>;
    isPlanModeFeatureEnabled: () => Promise<boolean>;
    // AI schema related functions
    getSemanticDiff: (params: SemanticDiffRequest) => Promise<SemanticDiffResponse>;
    getAffectedPackages: () => Promise<string[]>;
    isWorkspaceProject: () => Promise<boolean>;
    acceptChanges: () => Promise<void>;
    declineChanges: () => Promise<void>;
    // ==================================
    // Approval Related Functions (Human-in-the-Loop)
    // ==================================
    approvePlan: (params: PlanApprovalRequest) => Promise<void>;
    declinePlan: (params: PlanApprovalRequest) => Promise<void>;
    approveTask: (params: ApproveTaskRequest) => Promise<void>;
    declineTask: (params: TaskDeclineRequest) => Promise<void>;
    provideConnectorSpec: (params: ConnectorSpecRequest) => Promise<void>;
    cancelConnectorSpec: (params: ConnectorSpecCancelRequest) => Promise<void>;
    provideConfiguration: (params: ConfigurationProvideRequest) => Promise<void>;
    cancelConfiguration: (params: ConfigurationCancelRequest) => Promise<void>;
    // ==================================
    // Chat State Management
    // ==================================
    getChatMessages: () => Promise<UIChatMessage[]>;
    getCheckpoints: () => Promise<CheckpointInfo[]>;
    restoreCheckpoint: (params: RestoreCheckpointRequest) => Promise<void>;
    clearChat: () => Promise<void>;
    updateChatMessage: (params: UpdateChatMessageRequest) => Promise<void>;
    getActiveTempDir: () => Promise<string>;
    getUsage: () => Promise<UsageResponse | undefined>;
}
