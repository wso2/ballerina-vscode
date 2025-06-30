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
// tslint:disable: jsx-no-multiline-js align  jsx-wrap-multiline
import React, { useContext, useEffect, useState } from "react";

import { BallerinaConnectorInfo, ConnectorInfo, ConnectorWizardType } from "@wso2/ballerina-core";
import { CaptureBindingPattern, LocalVarDecl, NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import cn from "classnames";

import { Context } from "../../../../Context/diagram";
import { useFunctionContext } from "../../../../Context/Function";
import { defaultOrgs } from "../../../../Types/constants";
import { getDiagnosticInfo, getMatchingConnector } from "../../../../Utils";
import { BlockViewState, StatementViewState, ViewState } from "../../../../ViewState";
import { DraftStatementViewState } from "../../../../ViewState/draft";
import { DeleteBtn } from "../../../DiagramActions/DeleteBtn";
import { DELETE_SVG_HEIGHT_WITH_SHADOW, DELETE_SVG_WIDTH_WITH_SHADOW } from "../../../DiagramActions/DeleteBtn/DeleteSVG";
import { EditBtn } from "../../../DiagramActions/EditBtn";
import { EDIT_SVG_OFFSET, EDIT_SVG_WIDTH_WITH_SHADOW } from "../../../DiagramActions/EditBtn/EditSVG";

import { ConnectorProcessSVG, CONNECTOR_PROCESS_SHADOW_OFFSET, CONNECTOR_PROCESS_SVG_HEIGHT, CONNECTOR_PROCESS_SVG_HEIGHT_WITH_SHADOW, CONNECTOR_PROCESS_SVG_WIDTH, CONNECTOR_PROCESS_SVG_WIDTH_WITH_SHADOW } from "./ConnectorProcessSVG";
import "./style.scss";

export interface ConnectorProcessProps {
    model: STNode;
    blockViewState?: BlockViewState | any;
    selectedConnector?: LocalVarDecl;
    specialConnectorName?: string;
}

export function ConnectorProcess(props: ConnectorProcessProps) {
    const diagramContext = useContext(Context);
    const diagramCleanDraw = diagramContext?.actions?.diagramCleanDraw;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const renderConnectorWizard = diagramContext?.api?.edit?.renderConnectorWizard;

    const { functionNode } = useFunctionContext();

    const { syntaxTree, stSymbolInfo, isReadOnly } = diagramContext.props;
    const { model, blockViewState, specialConnectorName, selectedConnector } = props;
    // tslint:disable-next-line
    console.log("selectedConnector", selectedConnector);

    const viewState: ViewState =
        model === null
            ? blockViewState.draft[1]
            : (model.viewState as StatementViewState);

    const sourceSnippet: string = model?.source;
    const diagnostics = model?.typeData?.diagnostics;
    const diagnosticMsgs = getDiagnosticInfo(diagnostics);

    const errorSnippet = {
        diagnosticMsgs: diagnosticMsgs?.message,
        code: sourceSnippet,
        severity: diagnosticMsgs?.severity
    }

    const x = viewState.bBox.cx - CONNECTOR_PROCESS_SVG_WIDTH / 2;
    const y = viewState.bBox.cy;

    const draftVS = blockViewState?.draft[1] ? blockViewState?.draft[1] as DraftStatementViewState : undefined;

    const [isEditConnector, setIsConnectorEdit] = useState<boolean>(false);

    const [connector, setConnector] = useState<BallerinaConnectorInfo>(draftVS?.connector);

    const toggleSelection = () => {
        // setIsConnectorEdit(!isEditConnector);
        const connectorInit: LocalVarDecl = model as LocalVarDecl;
        const matchedConnector = getMatchingConnector(connectorInit);
        if (matchedConnector) {
            setConnector(matchedConnector);
            const connectorInfo : ConnectorInfo = {
                connector: matchedConnector,
                functionNode
            };
            diagramContext.props.onEditComponent(model, model.position, "Connector", connectorInfo);
        }
    };

    const isDraftStatement: boolean =
        viewState instanceof DraftStatementViewState;

    const connectorWrapper = isDraftStatement
        ? cn("main-connector-process-wrapper active-connector-processor")
        : cn("main-connector-process-wrapper connector-processor");

    const connectorDefDeleteMutation = (): any => {
        const invokedEPCount: number = 0;
        if (invokedEPCount === 1) {
            return [];
        }
    };

    const onDraftDelete = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
    };

    const onWizardClose = () => {
        setIsConnectorEdit(false);
        setConnector(undefined);
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
    };

    let isReferencedVariable = false;
    const isLocalVariableDecl = model && STKindChecker.isLocalVarDecl(model);
    const targetPosition = draftVS?.targetPosition || model?.position;

    if (isLocalVariableDecl && STKindChecker.isCaptureBindingPattern(model.typedBindingPattern.bindingPattern)) {
        const captureBingingPattern = (model as LocalVarDecl).typedBindingPattern.bindingPattern as CaptureBindingPattern;
        if (stSymbolInfo?.variableNameReferences?.size &&
            stSymbolInfo.variableNameReferences.get(captureBingingPattern.variableName.value)?.length > 0) {
            isReferencedVariable = true;
        }
    }
    if (draftVS) {
        draftVS.targetPosition = targetPosition;
    }

    if (isEditConnector && !connector) {
        const connectorInit: LocalVarDecl = model as LocalVarDecl;
        const matchedConnector = getMatchingConnector(connectorInit);
        if (matchedConnector) {
            setConnector(matchedConnector);
        }
    }

    const isSingleFormConnector = connector && connector.package.organization === defaultOrgs.WSO2;
    const toolTip = isReferencedVariable ? "API is referred in the code below" : undefined;

    useEffect(() => {
        if ((draftVS || (model && isEditConnector)) && renderConnectorWizard) {
            renderConnectorWizard({
                connectorInfo: connector,
                diagramPosition: {
                    x: viewState.bBox.cx + 80,
                    y: viewState.bBox.cy,
                },
                targetPosition,
                model,
                onClose: onWizardClose,
                onSave: onWizardClose,
                wizardType: ConnectorWizardType.ENDPOINT,
                functionNode
            });
        }
    }, [model, connector, isEditConnector]);

    const onClickOpenInCodeView = () => {
        if (model) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }

    return (
        <>
            <g className={connectorWrapper} target-line={targetPosition.startLine}>
                <ConnectorProcessSVG
                    x={viewState.bBox.cx - CONNECTOR_PROCESS_SVG_WIDTH / 2}
                    y={viewState.bBox.cy}
                    componentSTNode={model}
                    diagnostics={errorSnippet}
                    openInCodeView={onClickOpenInCodeView}
                />
                {model && !isReadOnly && (
                    <g
                        className="connector-process-options-wrapper"
                        height={CONNECTOR_PROCESS_SVG_HEIGHT_WITH_SHADOW}
                        width={CONNECTOR_PROCESS_SVG_WIDTH_WITH_SHADOW}
                        x={x - CONNECTOR_PROCESS_SHADOW_OFFSET / 2}
                        y={y - CONNECTOR_PROCESS_SHADOW_OFFSET / 2}
                    >
                        <rect
                            x={viewState.bBox.cx - CONNECTOR_PROCESS_SVG_WIDTH / 4}
                            y={viewState.bBox.cy + CONNECTOR_PROCESS_SVG_HEIGHT / 4}
                            className="connector-process-rect"
                        />
                        <g>
                            <DeleteBtn
                                cx={
                                    viewState.bBox.cx -
                                    DELETE_SVG_WIDTH_WITH_SHADOW +
                                    CONNECTOR_PROCESS_SVG_WIDTH / 4
                                }
                                cy={
                                    viewState.bBox.cy +
                                    CONNECTOR_PROCESS_SVG_HEIGHT / 2 -
                                    DELETE_SVG_HEIGHT_WITH_SHADOW / 3
                                }
                                model={model}
                                isConnector={true}
                                toolTipTitle={toolTip}
                                isReferencedInCode={isReferencedVariable}
                                showOnRight={true}
                                onDraftDelete={onDraftDelete}
                                createModifications={connectorDefDeleteMutation}
                            />
                        </g>
                        <g
                            className={
                                !isLocalVariableDecl || isSingleFormConnector
                                    ? "disable"
                                    : ""
                            }
                        >
                            <EditBtn
                                onHandleEdit={toggleSelection}
                                model={model}
                                cx={
                                    viewState.bBox.cx -
                                    EDIT_SVG_WIDTH_WITH_SHADOW / 2 +
                                    EDIT_SVG_OFFSET
                                }
                                cy={viewState.bBox.cy + CONNECTOR_PROCESS_SVG_HEIGHT / 4}
                                isButtonDisabled={
                                    !isLocalVariableDecl || isSingleFormConnector
                                }
                            />
                        </g>
                    </g>
                )}
            </g>
        </>
    );
}
