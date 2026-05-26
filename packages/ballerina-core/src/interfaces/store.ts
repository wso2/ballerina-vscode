/* eslint-disable @typescript-eslint/no-explicit-any */
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
// tslint:disable-next-line: no-submodule-imports
import { LocalVarDecl, NodePosition, STNode } from "@wso2/syntax-tree";
import { Diagnostic } from "vscode-languageserver-protocol";
import { BallerinaConnectorInfo, BallerinaConnector } from "./ballerina";
import { URI } from "vscode-uri";

export interface DiagramCoordinates {
    start: RectCoordinates;
    stop: RectCoordinates;
    worker: WorkerCoordinates;
    connectorStart: RectCoordinates;
    connectorLine: WorkerCoordinates;
    processor: RectCoordinates;
}

export interface RectCoordinates {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WorkerCoordinates {
    x: number;
    y: number;
    height: number;
}

export interface DiagramSize {
    width: number;
    height: number;
}

export interface ConfigPanelStatus {
    isLoading: boolean;
    isOpen?: boolean;
    formArgs?: any;
    formType?: string;
    blockViewState?: any; // FIXME - For mono repo migration
    error?: any;
}

export interface ConfigOverlayFormStatus {
    isLoading: boolean;
    isOpen?: boolean;
    formArgs?: any;
    formType?: string;
    formName?: string;
    blockViewState?: any; // FIXME - For mono repo migration
    error?: any;
    isLastMember?: boolean;
    renderRecordPanel?: (closeRecordEditor: (createdRecord?: string) => void) => JSX.Element;
}

export interface DiagramState {
    size?: DiagramSize;
    originalSyntaxTree?: STNode;
    syntaxTree?: STNode;
    diagramSt?: STNode;
    positions?: DiagramCoordinates;
    isLoadingAST?: boolean;
    configPanelStatus?: ConfigPanelStatus;
    configOverlayFormStatus?: ConfigOverlayFormStatus;
    selectedCompId?: number;
    error?: any;
    isMutationProgress?: boolean;
    isCodeEditorActive?: boolean;
    connectors?: BallerinaConnector[];
    isConfigFetchInProgress?: boolean;
    diagnostics?: Diagnostic[];
    stSymbolInfo?: STSymbolInfo;
    isLoadingSuccess?: boolean;
    exprEditorState?: ExpressionEditorState;
    targetPosition?: any;
    resourceMembers?: any;
    selectedScope?: string;
    selectedResource?: string;
}

export interface ExpressionEditorState {
    name?: string;
    content?: string;
    uri?: string;
    diagnostic?: Diagnostic[];
    isFirstSelect: boolean
}

export interface STSymbolInfo {
    moduleEndpoints: Map<string, STNode>;
    localEndpoints: Map<string, STNode>;
    actions: Map<string, STNode>;
    variables: Map<string, STNode[]>;
    configurables: Map<string, STNode>;
    callStatement: Map<string, STNode[]>;
    variableNameReferences: Map<string, STNode[]>;
    assignmentStatement: Map<string, STNode[]>;
    recordTypeDescriptions: Map<string, STNode>;
    listeners: Map<string, STNode>;
    moduleVariables: Map<string, STNode>;
    constants: Map<string, STNode>;
    enums: Map<string, STNode>;
}

export interface ComponentInitCoordinates {
    x: number;
    y: number;
    statement: STNode;
}

export interface DiagramOverlayPosition {
    x: number,
    y: number
}

export enum ConnectorWizardType {
    ENDPOINT = "endpoint",
    ACTION = "action",
}
export interface ConnectorWizardProps {
    wizardType: ConnectorWizardType;
    diagramPosition: DiagramOverlayPosition;
    connectorInfo?: BallerinaConnectorInfo;
    model?: STNode;
    targetPosition: NodePosition;
    functionNode?: STNode;
    isModuleType?: boolean;
    onSave: () => void;
    onClose: () => void;
}
export interface Margin {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
}

export interface PlusWidgetProps {
    position?: DiagramOverlayPosition;
    isPlusActive?: boolean;
    onChange?: (type: string, subType: string, connector?: BallerinaConnectorInfo, isExisting?: boolean, selectedConnector?: LocalVarDecl) => void;
    onClose?: () => void;
    initPlus?: boolean;
    isResource?: boolean;
    isCallerAvailable?: boolean;
    kind?: string;
    targetPosition?: NodePosition;
    isTriggerType?: boolean;
    isLastMember?: boolean;
    showCategorized?: boolean;
    overlayId?: string;
    overlayNode? : HTMLDivElement;
    offset?: any;
    hasWorkerDecl?: boolean;
}

export interface FileListEntry {
    fileName: string;
    uri: URI;
}

export interface ComponentViewInfo {
    filePath: string;
    position: NodePosition;
    fileName?: string;
    moduleName?: string;
    uid?: string;
    name?: string;
}
