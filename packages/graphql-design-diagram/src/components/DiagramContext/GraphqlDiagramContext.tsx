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

// tslint:disable: no-empty jsx-no-multiline-js
import React, { createContext } from "react";

import { CurrentFile, ExtendedLangClientInterface } from "@wso2/ballerina-core";
import { NodePosition, STNode } from "@wso2/syntax-tree";

import { NodeType } from "../NodeFilter";

interface GraphqlDiagramContextProps {
    children?: React.ReactNode,
    functionPanel?: (position: NodePosition, functionType: string, model?: STNode, filePath?: string, completeST?: STNode) => void;
    servicePanel?: () => void;
    model?: STNode;
    operationDesignView?: (functionPosition: NodePosition, filePath?: string) => void;
    onDelete?: (position: NodePosition) => void;
    fullST?: STNode;
    goToSource?: (filePath: string, position: NodePosition) => void
    recordEditor?: (recordModel: STNode, filePath?: string, completeST?: STNode) => void;
    langClientPromise?: Promise<ExtendedLangClientInterface>;
    currentFile?: CurrentFile;
    setSelectedNode?: (nodeId: string) => void;
    selectedDiagramNode?: string;
    setFilteredNode?: (nodeType: NodeType) => void;
    filteredNode?: NodeType;
}

export const DiagramContext = createContext({
    functionPanel: (position: NodePosition, functionType: string, model?: STNode, filePath?: string, completeST?: STNode) => { },
    servicePanel: () => { },
    model: undefined,
    operationDesignView: (functionPosition: NodePosition, filePath?: string) => { },
    onDelete: (position: NodePosition) => { },
    fullST: undefined,
    goToSource: (filePath: string, position: NodePosition) => { },
    recordEditor: (recordModel: STNode, filePath?: string, completeST?: STNode) => { },
    langClientPromise: undefined,
    currentFile: undefined,
    setSelectedNode: (nodeId: string) => { },
    selectedDiagramNode: undefined,
    setFilteredNode: (nodeType: NodeType) => { },
    filteredNode: undefined
}
);

export function GraphqlDiagramContext(props: GraphqlDiagramContextProps) {

    const {
        children,
        functionPanel,
        servicePanel,
        model,
        operationDesignView,
        onDelete,
        fullST,
        goToSource,
        recordEditor,
        langClientPromise,
        currentFile,
        setSelectedNode,
        selectedDiagramNode,
        setFilteredNode,
        filteredNode
    } = props;

    return (
        <DiagramContext.Provider
            value={{
                functionPanel,
                servicePanel,
                model,
                operationDesignView,
                onDelete,
                fullST,
                goToSource,
                recordEditor,
                langClientPromise,
                currentFile,
                setSelectedNode,
                selectedDiagramNode,
                setFilteredNode,
                filteredNode
            }}
        >
            {children}
        </DiagramContext.Provider>
    );
}

export const useGraphQlContext = () => React.useContext(DiagramContext);

