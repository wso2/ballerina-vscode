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

import { NodePosition } from "@wso2/syntax-tree";
import { LinePosition } from "./common";
import { Diagnostic as VSCodeDiagnostic } from "vscode-languageserver-types";

export type { NodePosition };

export type Flow = {
    fileName: string;
    nodes: FlowNode[];
    connections?: FlowNode[];
};

export type Client = {
    id: string;
    label: string;
    kind: ClientKind;
    lineRange: ELineRange;
    scope: ClientScope;
    value: string;
    flags: number;
};

export type ClientKind = "HTTP" | "OTHER";

export type ClientScope = "LOCAL" | "OBJECT" | "GLOBAL";

export type FlowNode = {
    id: string;
    metadata: Metadata;
    codedata: CodeData;
    diagnostics?: Diagnostic;
    properties?: NodeProperties;
    branches: Branch[];
    flags?: number;
    returning: boolean;
    suggested?: boolean;
    viewState?: ViewState;
    hasBreakpoint?: boolean;
    isActiveBreakpoint?: boolean;
};

export type FunctionNode = {
    id: string;
    metadata: Metadata;
    codedata: CodeData;
    diagnostics?: Diagnostic;
    properties?: NodeProperties;
    flags?: number;
    returning: boolean;
};

export type Metadata = {
    label: string;
    description: string;
    icon?: string;
    keywords?: string[];
    draft?: boolean; // for diagram draft nodes
    data?: {
        isDataMappedFunction?: boolean;
        isAgentTool?: boolean;
        isIsolatedFunction?: boolean;
        tools?: ToolData[];
        model?: ToolData;
        memory?: MemoryData;
        agent?: AgentData;
        paramsToHide?: string[]; // List of properties keys to to hide from forms
    };
    functionKind?: string;
};

export type ToolData = {
    name: string;
    description?: string;
    path?: string;
    type?: string;
};

export type AgentData = {
    role?: string;
    instructions?: string;
};

export type MemoryData = {
    name: string;
    type: string;
};

export type Imports = {
    [prefix: string]: string;
};

export type Property = {
    metadata: Metadata;
    diagnostics?: Diagnostic;
    valueType: string;
    value: string | string[] | ELineRange | NodeProperties | Property[];
    advanceProperties?: NodeProperties;
    optional: boolean;
    editable: boolean;
    advanced?: boolean;
    hidden?: boolean;
    placeholder?: string;
    valueTypeConstraint?: string | string[];
    codedata?: CodeData;
    typeMembers?: PropertyTypeMemberInfo[];
    imports?: Imports;
    advancedValue?: string;
    modified?: boolean;
    oldValue?: string;
};

export type PropertyTypeMemberInfo = {
    type: string;
    kind: string;
    packageInfo: string;
    packageName?: string;
    selected: boolean;
};

export type RecordTypeField = {
    key: string;
    property: Property;
    recordTypeMembers: PropertyTypeMemberInfo[];
};

export type Diagnostic = {
    hasDiagnostics: boolean;
    diagnostics?: DiagnosticMessage[];
};

export type DiagnosticMessage = {
    message: string;
    severity: "ERROR" | "WARNING" | "INFO";
};

export type CodeData = {
    node?: NodeKind;
    org?: string;
    module?: string;
    object?: string;
    symbol?: string;
    lineRange?: ELineRange;
    sourceCode?: string;
    parentSymbol?: string;
    inferredReturnType?: string;
    version?: string;
    isNew?: boolean;
    isGenerated?: boolean;
    resourcePath?: string;
    id?: string;
    kind?: string;
    originalName?: string;
    dependentProperty?: string[];
};

export type Branch = {
    label: string;
    kind: BranchKind;
    codedata: CodeData;
    repeatable: Repeatable;
    properties: NodeProperties;
    children: FlowNode[];
    viewState?: ViewState;
};

export type ELineRange = {
    fileName: string;
    startLine: LinePosition;
    endLine: LinePosition;
};

export type NodeProperties = { [P in NodePropertyKey]?: Property };

export type ViewState = {
    // element view state
    x: number;
    y: number;
    lw: number; // left width from center
    rw: number; // right width from center
    h: number; // height
    // container view state
    clw: number; // container left width from center
    crw: number; // container right width from center
    ch: number; // container height
    // flow start node
    startNodeId?: string;
    // is top level node
    isTopLevel?: boolean;
};

// Add node target position metadata
export type TargetMetadata = {
    topNodeId: string;
    bottomNodeId?: string;
    linkLabel?: string;
};

export enum DIRECTORY_MAP {
    AGENTS = "agents",
    AUTOMATION = "AUTOMATION",
    CONFIGURABLE = "CONFIGURABLE",
    CONNECTION = "CONNECTION",
    CONNECTOR = "CONNECTOR",
    DATA_MAPPER = "DATA_MAPPER",
    FUNCTION = "FUNCTION",
    LISTENER = "LISTENER",
    LOCAL_CONNECTORS = "localConnectors",
    NP_FUNCTION = "NP_FUNCTION",
    REMOTE = "REMOTE",
    RESOURCE = "RESOURCE",
    SERVICE = "SERVICE",
    TYPE = "TYPE",
    VARIABLE = "VARIABLE",
}

export enum FUNCTION_TYPE {
    REGULAR = "regular",
    EXPRESSION_BODIED = "expressionBodied",
    ALL = "all",
}

export interface ProjectStructureResponse {
    projectName: string;
    directoryMap: {
        [DIRECTORY_MAP.SERVICE]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.AUTOMATION]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.LISTENER]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.FUNCTION]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.CONNECTION]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.TYPE]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.CONFIGURABLE]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.DATA_MAPPER]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.NP_FUNCTION]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.AGENTS]: ProjectStructureArtifactResponse[];
        [DIRECTORY_MAP.LOCAL_CONNECTORS]: ProjectStructureArtifactResponse[];
    };
}

export interface ProjectStructureArtifactResponse {
    id: string;
    name: string;
    path: string;
    type: string;
    icon?: string;
    context?: string;
    moduleName?: string;
    position?: NodePosition;
    resources?: ProjectStructureArtifactResponse[];
    isNew?: boolean;
}

export interface UpdatedArtifactsResponse {
    artifacts: ProjectStructureArtifactResponse[];
    error?: string;
}

export type Item = Category | AvailableNode;

export type Category = {
    metadata: Metadata;
    items: Item[];
};

export type AvailableNode = {
    metadata: Metadata;
    codedata: CodeData;
    enabled: boolean;
};

export type DiagramLabel = "On Fail" | "Body";

export type NodePropertyKey =
    | "agentType"
    | "checkError"
    | "client"
    | "collection"
    | "comment"
    | "condition"
    | "configValue"
    | "connection"
    | "defaultable"
    | "defaultValue"
    | "documentation"
    | "enableModelContext"
    | "expression"
    | "functionName"
    | "maxIter"
    | "memory"
    | "method"
    | "model"
    | "msg"
    | "parameters"
    | "path"
    | "patterns"
    | "prompt"
    | "query"
    | "scope"
    | "sessionId"
    | "size"
    | "statement"
    | "systemPrompt"
    | "targetType"
    | "tools"
    | "type"
    | "variable"
    | "verbose"
    | "view";

export type BranchKind = "block" | "worker";

export type Repeatable = "ONE_OR_MORE" | "ZERO_OR_ONE" | "ONE" | "ZERO_OR_MORE";

export type Scope = "module" | "local" | "object";

export type NodeKind =
    | "ACTION_OR_EXPRESSION"
    | "AGENT"
    | "AGENT_CALL"
    | "ASSIGN"
    | "AUTOMATION"
    | "BODY"
    | "BREAK"
    | "CLASS"
    | "CLASS_INIT"
    | "COMMENT"
    | "COMMIT"
    | "CONDITIONAL"
    | "CONFIG_VARIABLE"
    | "CONTINUE"
    | "DATA_MAPPER_CALL"
    | "DATA_MAPPER_DEFINITION"
    | "DRAFT"
    | "ELSE"
    | "EMPTY"
    | "ERROR_HANDLER"
    | "EVENT_START"
    | "EXPRESSION"
    | "FAIL"
    | "FOREACH"
    | "FORK"
    | "FUNCTION"
    | "FUNCTION_CALL"
    | "FUNCTION_DEFINITION"
    | "IF"
    | "INCLUDED_FIELD"
    | "LOCK"
    | "LV_EXPRESSION"
    | "MATCH"
    | "NEW_CONNECTION"
    | "NEW_DATA"
    | "NP_FUNCTION"
    | "NP_FUNCTION_CALL"
    | "NP_FUNCTION_DEFINITION"
    | "ON_FAILURE"
    | "PANIC"
    | "PARALLEL_FLOW"
    | "RAW_TEMPLATE"
    | "REMOTE_ACTION_CALL"
    | "RESOURCE_ACTION_CALL"
    | "RETURN"
    | "RETRY"
    | "ROLLBACK"
    | "START"
    | "STOP"
    | "TRANSACTION"
    | "UPDATE_DATA"
    | "VARIABLE"
    | "WAIT"
    | "WHILE"
    | "WORKER";

export type OverviewFlow = {
    entryPoints: EntryPoint[];
    name: string;
    thinking: string;
    connections: Connection[];
};

export type EntryPoint = {
    id: string;
    name: string;
    type: string;
    status: string;
    dependencies: Dependency[];
};

export type Dependency = {
    id: string;
    status: string;
};

export type Connection = {
    id: string;
    name: string;
    status: string;
    org?: string;
    package?: string;
    client?: string;
};

export type Line = {
    line: number;
    offset: number;
};

export type ConfigVariable = {
    metadata: Metadata;
    codedata: CodeData;
    properties: NodeProperties;
    branches: Branch[];
    id: string;
    returning: boolean;
    diagnostics?: Diagnostic;
    flags?: number;
};

export type FormDiagnostics = {
    key: string;
    diagnostics: VSCodeDiagnostic[];
};

export type CompletionInsertText = {
    value: string;
    cursorOffset?: number;
};
