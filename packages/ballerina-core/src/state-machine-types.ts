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
import { LinePosition } from "./interfaces/common";
import { Type } from "./interfaces/extended-lang-client";
import { DIRECTORY_MAP, ProjectStructureArtifactResponse, ProjectStructureResponse } from "./interfaces/bi";

export type MachineStateValue =
    | 'initialize'
    | 'lsError'
    | 'lsReady'
    | 'viewActive'
    | 'disabled'
    | { viewActive: 'viewInit' } | { viewActive: 'webViewLoaded' } | { viewActive: 'viewReady' } | { viewActive: 'viewEditing' };

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
    GraphQLDiagram = "GraphQL Diagram",
    TypeDiagram = "Type Diagram",
    SetupView = "Setup View",
    BIDiagram = "BI Diagram",
    BIWelcome = "BI Welcome",
    BIProjectForm = "BI Project SKIP",
    BIComponentView = "BI Component View",
    AddConnectionWizard = "Add Connection Wizard",
    ViewConfigVariables = "View Config Variables",
    EditConfigVariables = "Edit Config Variables",
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
    AIChatAgentWizard = "AI Chat Agent Wizard"
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
    projectUri?: string;
    identifier?: string;
    position?: NodePosition;
    syntaxTree?: STNode;
    isBI?: boolean;
    focusFlowDiagramView?: FocusFlowDiagramView;
    serviceType?: string;
    type?: Type;
    addType?: boolean;
    isGraphql?: boolean;
    metadata?: VisualizerMetadata;
    scope?: SCOPE;
    projectStructure?: ProjectStructureResponse;
    org?: string;
    package?: string;
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

export interface PopupVisualizerLocation extends VisualizerLocation {
    recentIdentifier?: string;
    artifactType?: DIRECTORY_MAP;
}

export interface ParentPopupData {
    recentIdentifier: string;
    artifactType: DIRECTORY_MAP;
}

export interface DownloadProgress {
    totalSize?: number;
    downloadedSize?: number;
    percentage?: number;
    success: boolean;
    message: string;
    step?: number;
}

export const stateChanged: NotificationType<MachineStateValue> = { method: 'stateChanged' };
export const onDownloadProgress: NotificationType<DownloadProgress> = { method: 'onDownloadProgress' };
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
    | 'Authenticating'      // (waiting for SSO login result after redirect)
    | 'Authenticated'       // (ready, main view)
    | 'Disabled';           // (optional: if AI Chat is globally unavailable)

export enum AIMachineEventType {
    CHECK_AUTH = 'CHECK_AUTH',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
    SILENT_LOGOUT = "SILENT_LOGOUT",
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    CANCEL_LOGIN = 'CANCEL_LOGIN',
    RETRY = 'RETRY',
    DISPOSE = 'DISPOSE',
}

export type AIMachineEventValue =
    | { type: AIMachineEventType.CHECK_AUTH }
    | { type: AIMachineEventType.LOGIN }
    | { type: AIMachineEventType.LOGOUT }
    | { type: AIMachineEventType.SILENT_LOGOUT }
    | { type: AIMachineEventType.LOGIN_SUCCESS }
    | { type: AIMachineEventType.CANCEL_LOGIN }
    | { type: AIMachineEventType.RETRY }
    | { type: AIMachineEventType.DISPOSE };

interface AIUsageTokens {
    maxUsage: number;
    remainingTokens: number;
}

export interface AIUserToken {
    accessToken: string;
    usageTokens?: AIUsageTokens;
}

export interface AIMachineContext {
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
export const sendAIStateEvent: RequestType<AIMachineEventType, void> = { method: 'sendAIStateEvent' };
export const currentThemeChanged: NotificationType<ColorThemeKind> = { method: 'currentThemeChanged' };
