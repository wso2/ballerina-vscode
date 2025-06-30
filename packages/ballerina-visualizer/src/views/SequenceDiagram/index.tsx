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
import { useRpcContext } from "@wso2/ballerina-rpc-client";
import {
    LowCodeDiagram,
    initVisitor,
    PositioningVisitor,
    SizingVisitor,
    SymbolVisitor,
    cleanLocalSymbols,
    cleanModuleLevelSymbols,
    getSymbolInfo,
} from "@wso2/ballerina-low-code-diagram";
import { NodePosition, STKindChecker, STNode, traversNode } from "@wso2/syntax-tree";
import styled from "@emotion/styled";
import { PanelType, useVisualizerContext } from "../../Context";
import { ComponentInfo, ConnectorInfo, removeStatement, STModification } from "@wso2/ballerina-core";
import { URI } from "vscode-uri";
import { fetchConnectorInfo, retrieveUsedAction } from "../Connectors/ConnectorWizard/utils";

enum MESSAGE_TYPE {
    ERROR,
    WARNING,
    INFO,
}

const Container = styled.div`
    width: 100%;
    height: calc(100vh - 50px);
`;

const MessageContainer = styled.div({
    width: "100%",
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
});

interface SequenceDiagramProps {
    syntaxTree: STNode;
    applyModifications: (modifications: STModification[]) => void;
}

export function SequenceDiagram(props: SequenceDiagramProps) {
    const { syntaxTree, applyModifications } = props;
    const { rpcClient } = useRpcContext();
    const { setStatementPosition, setActivePanel, setComponentInfo, setActiveFileInfo, activeFileInfo } = useVisualizerContext();

    useEffect(() => {
        getSequenceModel();
    }, [syntaxTree]);

    const getSequenceModel = () => {
        rpcClient
            .getLangClientRpcClient()
            .getSyntaxTree()
            .then(async (model) => {
                const parsedModel = sizingAndPositioningST(model.syntaxTree);
                const filePath = (await rpcClient.getVisualizerLocation()).documentUri;
                const fullST = await rpcClient.getLangClientRpcClient().getST({
                    documentIdentifier: { uri: URI.file(filePath).toString() }
                });
                setActiveFileInfo({ fullST: fullST?.syntaxTree, filePath, activeSequence: parsedModel });
            });
    };

    // TODO: Refactor this function
    function sizingAndPositioningST(
        st: STNode,
        experimentalEnabled?: boolean,
        showMessage?: (
            arg: string,
            messageType: MESSAGE_TYPE,
            ignorable: boolean,
            filePath?: string,
            fileContent?: string,
            bypassChecks?: boolean
        ) => void
    ): STNode {
        traversNode(st, initVisitor);
        const sizingVisitor = new SizingVisitor(experimentalEnabled);
        traversNode(st, sizingVisitor);
        if (showMessage && sizingVisitor.getConflictResulutionFailureStatus()) {
            showMessage(
                "Something went wrong in the diagram rendering.",
                MESSAGE_TYPE.ERROR,
                false,
                undefined,
                undefined,
                true
            );
        }
        traversNode(st, new PositioningVisitor());
        cleanLocalSymbols();
        cleanModuleLevelSymbols();
        traversNode(st, SymbolVisitor);
        const clone = { ...st };
        return clone;
    }

    const handleAddComponent = (position: NodePosition) => {
        setStatementPosition(position);
        setActivePanel({ isActive: true, name: PanelType.CONSTRUCTPANEL });
    }

    const handleEditComponent = async (model: STNode, targetPosition: NodePosition, componentType: string, connectorInfo?: ConnectorInfo) => {
        setStatementPosition(targetPosition);
        setComponentInfo({ model, position: targetPosition, componentType, connectorInfo });
        setActivePanel({ isActive: true, name: PanelType.STATEMENTEDITOR });
    }

    const handleDeleteComponent = (model: STNode) => {
        const modifications: STModification[] = [];

        // delete action
        if (STKindChecker.isIfElseStatement(model) && !model.viewState.isMainIfBody) {
            const ifElseRemovePosition = model.position;
            ifElseRemovePosition.endLine = model.elseBody.elseBody.position.startLine;
            ifElseRemovePosition.endColumn = model.elseBody.elseBody.position.startColumn;

            const deleteConfig: STModification = removeStatement(ifElseRemovePosition);
            modifications.push(deleteConfig);
            applyModifications(modifications);
        } else {
            const deleteAction: STModification = removeStatement(
                model.position
            );
            modifications.push(deleteAction);
            applyModifications(modifications);
        }
    }

    return (
        <>
            <Container>{!!activeFileInfo?.activeSequence &&
                <LowCodeDiagram syntaxTree={activeFileInfo?.activeSequence} stSymbolInfo={getSymbolInfo()} isReadOnly={false} onAddComponent={handleAddComponent} onEditComponent={handleEditComponent} onDeleteComponent={handleDeleteComponent} />
            }</Container>
        </>
    );
}
