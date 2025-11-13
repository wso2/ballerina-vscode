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

import { NotificationType, RequestType } from "vscode-messenger-common";
import { NodePosition, STNode } from "@wso2/syntax-tree";
import { Command } from "./interfaces/ai-panel";
import { LinePosition } from "./interfaces/common";
import { Type } from "./interfaces/extended-lang-client";
import { CodeData, DIRECTORY_MAP, ProjectStructureArtifactResponse, ProjectStructureResponse } from "./interfaces/bi";
import { DiagnosticEntry, TestGeneratorIntermediaryState, DocumentationGeneratorIntermediaryState, SourceFile } from "./rpc-types/ai-panel/interfaces";

export type MachineStateValue =
    | 'initialize'
    | 'lsError'
    | 'lsReady'
    | 'viewActive'
    | 'disabled'
    | { viewActive: 'viewInit' } | { viewActive: 'webViewLoaded' } | { viewActive: 'viewReady' } | { viewActive: 'viewEditing' } | { viewActive: 'resolveMissingDependencies' };

export type PopupMachineStateValue = 'initialize' | 'ready' | {
    open: 'active';
} | {
    ready: 'reopen';
} | {
    ready: 'notify';
} | 'disabled';

export enum EVENT_TYPE {
    OPEN_VIEW = "OPEN_VIEW",
    GET_STARTED = "GET_STARTED",
    CANCEL_CREATION = "CANCEL_CREATION",
    FILE_EDIT = "FILE_EDIT",
    EDIT_DONE = "EDIT_DONE",
    CLOSE_VIEW = "CLOSE_VIEW",
    VIEW_UPDATE = "VIEW_UPDATE",
    UPDATE_PROJECT_LOCATION = "UPDATE_PROJECT_LOCATION"
}

export enum SCOPE {
    AUTOMATION = "automation",
    INTEGRATION_AS_API = "integration-as-api",
    EVENT_INTEGRATION = "event-integration",
    FILE_INTEGRATION = "file-integration",
    AI_AGENT = "ai-agent",
    ANY = "any"
}

export type VoidCommands = "OPEN_LOW_CODE" | "OPEN_PROJECT" | "CREATE_PROJECT";

export enum MACHINE_VIEW {
    Overview = "Overview",
    BallerinaUpdateView = "Ballerina Update View",
    SequenceDiagram = "Sequence Diagram",
    ServiceDesigner = "Service Designer",
    ERDiagram = "ER Diagram",
    DataMapper = "Data Mapper",
    InlineDataMapper = "Inline Data Mapper",
    GraphQLDiagram = "GraphQL Diagram",
    TypeDiagram = "Type Diagram",
    SetupView = "Setup View",
    BIDiagram = "BI Diagram",
    BIWelcome = "BI Welcome",
    BIProjectForm = "BI Project SKIP",
    BIImportIntegration = "BI Import Integration SKIP",
    BIAddProjectForm = "BI Add Project SKIP",
    BIComponentView = "BI Component View",
    AddConnectionWizard = "Add Connection Wizard",
    AddCustomConnector = "Add Custom Connector",
    ViewConfigVariables = "View Config Variables",
    EditConfigVariables = "Edit Config Variables",
    AddConfigVariables = "Add Config Variables",
    EditConnectionWizard = "Edit Connection Wizard",
    BIMainFunctionForm = "Add Automation SKIP",
    BIFunctionForm = "Add Function SKIP",
    BINPFunctionForm = "Add Natural Function SKIP",
    BITestFunctionForm = "Add Test Function SKIP",
    BIServiceWizard = "Service Wizard SKIP",
    BIServiceConfigView = "Service Config View",
    BIListenerConfigView = "Listener Config View",
    BIServiceClassDesigner = "Service Class Designer",
    BIServiceClassConfigView = "Service Class Config View",
    BIDataMapperForm = "Add Data Mapper SKIP",
    AIAgentDesigner = "AI Agent Designer",
    AIChatAgentWizard = "AI Chat Agent Wizard",
    ResolveMissingDependencies = "Resolve Missing Dependencies",
    ServiceFunctionForm = "Service Function Form"
}

export interface MachineEvent {
    type: EVENT_TYPE;
}

export interface CommandProps {
    command: VoidCommands;
    projectName?: string;
    isService?: boolean
}

export const FOCUS_FLOW_DIAGRAM_VIEW = {
    NP_FUNCTION: "NP_FUNCTION",
} as const;

export type FocusFlowDiagramView = typeof FOCUS_FLOW_DIAGRAM_VIEW[keyof typeof FOCUS_FLOW_DIAGRAM_VIEW];

// State Machine context values
export interface VisualizerLocation {
    view?: MACHINE_VIEW | null;
    documentUri?: string;
    projectPath?: string;
    workspacePath?: string;
    identifier?: string;
    parentIdentifier?: string;
    artifactType?: DIRECTORY_MAP;
    position?: NodePosition;
    syntaxTree?: STNode;
    isBI?: boolean;
    focusFlowDiagramView?: FocusFlowDiagramView;
    serviceType?: string;
    type?: Type;
    addType?: boolean;
    isGraphql?: boolean;
    rootDiagramId?: string;
    metadata?: VisualizerMetadata;
    scope?: SCOPE;
    projectStructure?: ProjectStructureResponse;
    org?: string;
    package?: string;
    moduleName?: string;
    version?: string;
    dataMapperMetadata?: DataMapperMetadata;
    artifactInfo?: ArtifactInfo;
}

export interface ArtifactInfo {
    org?: string;
    packageName?: string;
    moduleName?: string;
    version?: string;
}

export interface ArtifactData {
    artifactType: DIRECTORY_MAP;
    identifier?: string;
}

export interface VisualizerMetadata {
    haveLS?: boolean;
    isBISupported?: boolean;
    recordFilePath?: string;
    enableSequenceDiagram?: boolean; // Enable sequence diagram view
    target?: LinePosition;
}

export interface DataMapperMetadata {
    name: string;
    codeData: CodeData;
}

export interface PopupVisualizerLocation extends VisualizerLocation {
    recentIdentifier?: string;
    artifactType?: DIRECTORY_MAP;
}

export interface ParentPopupData {
    recentIdentifier: string;
    artifactType: DIRECTORY_MAP;
    dataMapperMetadata?: DataMapperMetadata;
}

export interface DownloadProgress {
    totalSize?: number;
    downloadedSize?: number;
    percentage?: number;
    success: boolean;
    message: string;
    step?: number;
}

export type ChatNotify =
    | ChatStart
    | IntermidaryState
    | ChatContent
    | CodeDiagnostics
    | CodeMessages
    | ChatStop
    | ChatError
    | ToolCall
    | ToolResult
    | EvalsToolResult
    | UsageMetricsEvent
    | GeneratedSourcesEvent;

export interface ChatStart {
    type: "start";
}

export interface IntermidaryState {
    type: "intermediary_state";
    state: TestGeneratorIntermediaryState | DocumentationGeneratorIntermediaryState;
}

//TODO: Maybe rename content_block to content_append?
export interface ChatContent {
    type: "content_block" | "content_replace";
    content: string;
}

export interface CodeDiagnostics {
    type: "diagnostics";
    diagnostics: DiagnosticEntry[];
}

//TODO: I'm not sure about messages, maybe revisit later.
export interface CodeMessages {
    type: "messages";
    messages: any[];
}

export interface ChatStop {
    type: "stop";
    command: Command | undefined;
}

export interface ChatError {
    type: "error";
    content: string;
}

export interface ToolCall {
    type: "tool_call";
    toolName: string;
}

export interface ToolResult {
    type: "tool_result";
    toolName: string;
    toolOutput: any;
}

export interface EvalsToolResult {
    type: "evals_tool_result";
    toolName: string;
    output: any;
}

export interface UsageMetricsEvent {
    type: "usage_metrics";
    isRepair?: boolean;
    usage: {
        inputTokens: number;
        cacheCreationInputTokens: number;
        cacheReadInputTokens: number;
        outputTokens: number;
    };
}

export interface GeneratedSourcesEvent {
    type: "generated_sources";
    fileArray: SourceFile[];
}

export const stateChanged: NotificationType<MachineStateValue> = { method: 'stateChanged' };
export const onDownloadProgress: NotificationType<DownloadProgress> = { method: 'onDownloadProgress' };
export const onChatNotify: NotificationType<ChatNotify> = { method: 'onChatNotify' };
export const onMigrationToolLogs: NotificationType<string> = { method: 'onMigrationToolLogs' };
export const onMigrationToolStateChanged: NotificationType<string> = { method: 'onMigrationToolStateChanged' };
export const projectContentUpdated: NotificationType<boolean> = { method: 'projectContentUpdated' };
export const getVisualizerLocation: RequestType<void, VisualizerLocation> = { method: 'getVisualizerLocation' };
export const webviewReady: NotificationType<void> = { method: `webviewReady` };

// Artifact updated request and notification
export const onArtifactUpdatedNotification: NotificationType<ProjectStructureArtifactResponse[]> = { method: 'onArtifactUpdatedNotification' };
export const onArtifactUpdatedRequest: RequestType<ArtifactData, void> = { method: 'onArtifactUpdatedRequest' };

// Popup machine methods
export const onParentPopupSubmitted: NotificationType<ParentPopupData> = { method: `onParentPopupSubmitted` };
export const popupStateChanged: NotificationType<PopupMachineStateValue> = { method: 'popupStateChanged' };
export const getPopupVisualizerState: RequestType<void, PopupVisualizerLocation> = { method: 'getPopupVisualizerState' };

export const breakpointChanged: NotificationType<boolean> = { method: 'breakpointChanged' };

// ------------------> AI Related state types <-----------------------
export type AIMachineStateValue =
    | 'Initialize'          // (checking auth, first load)
    | 'Unauthenticated'     // (show login window)
    | { Authenticating: 'determineFlow' | 'ssoFlow' | 'apiKeyFlow' | 'validatingApiKey' | 'awsBedrockFlow' | 'validatingAwsCredentials' } // hierarchical substates
    | 'Authenticated'       // (ready, main view)
    | 'Disabled';           // (optional: if AI Chat is globally unavailable)

export enum AIMachineEventType {
    CHECK_AUTH = 'CHECK_AUTH',
    LOGIN = 'LOGIN',
    AUTH_WITH_API_KEY = 'AUTH_WITH_API_KEY',
    SUBMIT_API_KEY = 'SUBMIT_API_KEY',
    AUTH_WITH_AWS_BEDROCK = 'AUTH_WITH_AWS_BEDROCK',
    SUBMIT_AWS_CREDENTIALS = 'SUBMIT_AWS_CREDENTIALS',
    LOGOUT = 'LOGOUT',
    SILENT_LOGOUT = "SILENT_LOGOUT",
    COMPLETE_AUTH = 'COMPLETE_AUTH',
    CANCEL_LOGIN = 'CANCEL_LOGIN',
    RETRY = 'RETRY',
    DISPOSE = 'DISPOSE',
}

export type AIMachineEventMap = {
    [AIMachineEventType.CHECK_AUTH]: undefined;
    [AIMachineEventType.LOGIN]: undefined;
    [AIMachineEventType.AUTH_WITH_API_KEY]: undefined;
    [AIMachineEventType.SUBMIT_API_KEY]: { apiKey: string };
    [AIMachineEventType.AUTH_WITH_AWS_BEDROCK]: undefined;
    [AIMachineEventType.SUBMIT_AWS_CREDENTIALS]: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        sessionToken?: string;
    };
    [AIMachineEventType.LOGOUT]: undefined;
    [AIMachineEventType.SILENT_LOGOUT]: undefined;
    [AIMachineEventType.COMPLETE_AUTH]: undefined;
    [AIMachineEventType.CANCEL_LOGIN]: undefined;
    [AIMachineEventType.RETRY]: undefined;
    [AIMachineEventType.DISPOSE]: undefined;
};

export type AIMachineSendableEvent =
    | { [K in keyof AIMachineEventMap]: AIMachineEventMap[K] extends undefined
        ? { type: K }
        : { type: K; payload: AIMachineEventMap[K] }
    }[keyof AIMachineEventMap];

export enum LoginMethod {
    BI_INTEL = 'biIntel',
    ANTHROPIC_KEY = 'anthropic_key',
    DEVANT_ENV = 'devant_env',
    AWS_BEDROCK = 'aws_bedrock'
}

export interface BIIntelSecrets {
    accessToken: string;
    refreshToken: string;
}

export interface AnthropicKeySecrets {
    apiKey: string;
}

export interface DevantEnvSecrets {
    apiKey: string;
    stsToken: string;
}

interface AwsBedrockSecrets {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    sessionToken?: string;
}

export type AuthCredentials =
    | {
        loginMethod: LoginMethod.BI_INTEL;
        secrets: BIIntelSecrets;
    }
    | {
        loginMethod: LoginMethod.ANTHROPIC_KEY;
        secrets: AnthropicKeySecrets;
    }
    | {
        loginMethod: LoginMethod.DEVANT_ENV;
        secrets: DevantEnvSecrets;
    }
    | {
        loginMethod: LoginMethod.AWS_BEDROCK;
        secrets: AwsBedrockSecrets;
    };

export interface AIUserToken {
    credentials: AuthCredentials;
    usageToken?: string;
    metadata?: {
        lastRefresh?: string;
        expiresAt?: string;
        [key: string]: any;
    };
}

export interface AIMachineContext {
    loginMethod?: LoginMethod;
    userToken?: AIUserToken;
    errorMessage?: string;
}

export enum ColorThemeKind {
    Light = 1,
    Dark = 2,
    HighContrast = 3,
    HighContrastLight = 4
}

export const aiStateChanged: NotificationType<AIMachineStateValue> = { method: 'aiStateChanged' };
export const sendAIStateEvent: RequestType<AIMachineEventType | AIMachineSendableEvent, void> = { method: 'sendAIStateEvent' };
export const currentThemeChanged: NotificationType<ColorThemeKind> = { method: 'currentThemeChanged' };
