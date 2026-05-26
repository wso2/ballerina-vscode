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

import React, { useEffect, useState } from "react";
import { PanelContainer, NodeList } from "@wso2/ballerina-side-panel";
import { useVisualizerContext } from '../../Context';
import { StatementEditorComponent } from "../StatementEditorComponent"
import { getAllVariables, getInitialSource, STModification } from "@wso2/ballerina-core";
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import { getSymbolInfo } from "@wso2/ballerina-low-code-diagram";
import { constructList, getTemplateValues } from "./constructList";

interface ConstructPanelProps {
    applyModifications: (modifications: STModification[]) => Promise<void>;
}

export function ConstructPanel(props: ConstructPanelProps) {
    const { applyModifications } = props;

    const { activePanel, setActivePanel, statementPosition, activeFileInfo, setSidePanel } = useVisualizerContext();
    const [showStatementEditor, setShowStatementEditor] = useState<boolean>(false);
    const [initialSource, setInitialSource] = useState<string>();
    const [selectedNode, setSelectedNode] = useState<string>();

    const closeStatementEditor = () => {
        setShowStatementEditor(false);
        setActivePanel({ isActive: false });
    }

    const cancelStatementEditor = () => {
        setShowStatementEditor(false);
    }


    const handleOnSelectNode = (nodeId: string) => {
        // create the intial source for the statement editor
        const stSymbolInfo = getSymbolInfo();
        const allVariables = stSymbolInfo ? getAllVariables(stSymbolInfo) : [];
        if (nodeId === "If") {
            const ifTemplateValues = getTemplateValues("IfStatement", allVariables);
            const initialSource = getInitialSource(ifTemplateValues);
            const elseTemplateValues = getTemplateValues("ElseStatement", allVariables);
            const elseInitialSource = getInitialSource(elseTemplateValues);
            setInitialSource(initialSource + elseInitialSource);
            setSelectedNode(nodeId);
            setShowStatementEditor(true);
        } else if (nodeId === "Connector") {
            setActivePanel({ isActive: false });
            setSidePanel("ADD_CONNECTION");
        } else if (nodeId === "Action") {
            setActivePanel({ isActive: false });
            setSidePanel("ADD_ACTION");
        } else {
            const templateValues = getTemplateValues(nodeId, allVariables);
            const initialSource = getInitialSource(templateValues);
            setInitialSource(initialSource);
            setSelectedNode(nodeId);
            setShowStatementEditor(true);
        }
    }


    return (
        <PanelContainer title="Add Constructs" show={activePanel?.isActive} onClose={() => { setActivePanel({ isActive: false }) }}>
            {showStatementEditor && activeFileInfo?.filePath ?
                (
                    <StatementEditorComponent
                        label={selectedNode}
                        config={{ type: selectedNode, model: null }}
                        initialSource={initialSource}
                        applyModifications={applyModifications}
                        currentFile={{
                            content: activeFileInfo?.fullST?.source || "",
                            path: activeFileInfo?.filePath,
                            size: 1
                        }}
                        onCancel={cancelStatementEditor}
                        onClose={closeStatementEditor}
                        syntaxTree={activeFileInfo?.fullST}
                        targetPosition={statementPosition}
                        skipSemicolon={shouldSkipSemicolon(selectedNode)}

                    />
                )
                :
                (<NodeList categories={constructList()} onSelect={handleOnSelectNode} />)
            }
        </PanelContainer>
    );
}

export function shouldSkipSemicolon(nodeId: string) {
    if (nodeId === "If" || nodeId === "While" || nodeId === "Foreach") {
        return true;
    }
}
