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

import React, { useState } from "react";
import { Flow, FlowNode, Branch, LineRange, NodePosition, ToolData } from "../utils/types";
import { CompletionItem } from "@wso2/ui-toolkit";
import { ExpressionProperty, JoinProjectPathRequest, TextEdit } from "@wso2/ballerina-core";

type CompletionConditionalProps = {
    completions: CompletionItem[];
    triggerCharacters: readonly string[];
    retrieveCompletions: (
        value: string,
        property: ExpressionProperty,
        offset: number,
        invalidateCache: boolean,
        triggerCharacter?: string
    ) => Promise<void>;
} | {
    completions?: never;
    triggerCharacters?: never;
    retrieveCompletions?: never;
}

export type ExpressionContextProps = CompletionConditionalProps & {
    onCompletionItemSelect?: (value: string, additionalTextEdits?: TextEdit[]) => Promise<void>;
    onFocus?: () => void | Promise<void>;
    onBlur?: () => void | Promise<void>;
    onCancel?: () => void;
}

export interface DiagramContextState {
    flow: Flow;
    componentPanel: {
        visible: boolean;
        show(): void;
        hide(): void;
    };
    showErrorFlow: boolean;
    expandedErrorHandler?: string;
    toggleErrorHandlerExpansion?: (nodeId: string) => void;
    onAddNode?: (parent: FlowNode | Branch, target: LineRange) => void;
    onAddNodePrompt?: (parent: FlowNode | Branch, target: LineRange, prompt: string) => void;
    onDeleteNode?: (node: FlowNode) => void;
    onAddComment?: (comment: string, target: LineRange) => void;
    onNodeSelect?: (node: FlowNode) => void;
    onNodeSave?: (node: FlowNode) => void;
    addBreakpoint?: (node: FlowNode) => void;
    removeBreakpoint?: (node: FlowNode) => void;
    onConnectionSelect?: (connectionName: string) => void;
    goToSource: (node: FlowNode) => void;
    openView: (filePath: string, position: NodePosition) => void;
    draftNode?: {
        override: boolean;
        showSpinner?: boolean;
        description?: string;
    };
    selectedNodeId?: string;
    agentNode: {
        onModelSelect: (node: FlowNode) => void;
        onAddTool: (node: FlowNode) => void;
        onAddMcpServer: (node: FlowNode) => void;
        onSelectTool: (tool: ToolData, node: FlowNode) => void;
        onSelectMcpToolkit: (tool: ToolData, node: FlowNode) => void;
        onDeleteTool: (tool: ToolData, node: FlowNode) => void;
        goToTool: (tool: ToolData, node: FlowNode) => void;
        onSelectMemoryManager: (node: FlowNode) => void;
        onDeleteMemoryManager: (node: FlowNode) => void;
    };
    aiNodes?: {
        onModelSelect: (node: FlowNode) => void;
    };
    suggestions?: {
        fetching: boolean;
        onAccept(): void;
        onDiscard(): void;
    };
    project?: {
        org: string;
        path: string;
        getProjectPath?: (props: JoinProjectPathRequest) => Promise<string>;
    };
    readOnly?: boolean;
    lockCanvas?: boolean;
    setLockCanvas?: (lock: boolean) => void;
    isUserAuthenticated?: boolean;
    expressionContext: ExpressionContextProps;
}

export const DiagramContext = React.createContext<DiagramContextState>({
    flow: { fileName: "", nodes: [], connections: [] },
    componentPanel: {
        visible: false,
        show: () => {},
        hide: () => {},
    },
    showErrorFlow: false,
    expandedErrorHandler: undefined,
    toggleErrorHandlerExpansion: () => {},
    onAddNode: () => {},
    onAddNodePrompt: () => {},
    onDeleteNode: () => {},
    onAddComment: () => {},
    onNodeSelect: () => {},
    onConnectionSelect: () => {},
    goToSource: () => {},
    addBreakpoint: () => {},
    removeBreakpoint: () => {},
    openView: () => {},
    draftNode: {
        override: true,
        showSpinner: false,
        description: "",
    },
    selectedNodeId: undefined,
    agentNode: {
        onModelSelect: () => {},
        onAddTool: () => {},
        onAddMcpServer: () => {},
        onSelectTool: () => {},
        onSelectMcpToolkit: () => {},
        onDeleteTool: () => {},
        goToTool: () => {},
        onSelectMemoryManager: () => {},
        onDeleteMemoryManager: () => {},
    },
    aiNodes: {
        onModelSelect: () => {},
    },
    suggestions: {
        fetching: false,
        onAccept: () => {},
        onDiscard: () => {},
    },
    project: {
        org: "",
        path: "",
        getProjectPath: () => Promise.resolve(""),
    },
    readOnly: false,
    lockCanvas: false,
    setLockCanvas: (lock: boolean) => {},
    isUserAuthenticated: false,
    expressionContext: {
        completions: [],
        triggerCharacters: [],
        retrieveCompletions: () => Promise.resolve(),
    }
});

export const useDiagramContext = () => React.useContext(DiagramContext);

export function DiagramContextProvider(props: { children: React.ReactNode; value: DiagramContextState }) {
    const [lockCanvas, setLockCanvas] = useState(false);
    
    const ctx = {
        ...props.value,
        lockCanvas,
        setLockCanvas,
    };

    return <DiagramContext.Provider value={ctx}>{props.children}</DiagramContext.Provider>;
}
