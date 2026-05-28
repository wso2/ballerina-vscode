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
import React, { useContext, useState } from "react";

import { ConnectorInfo, ConnectorWizardType } from "@wso2/ballerina-core";
import { LocalVarDecl, NodePosition, STKindChecker, STNode } from "@wso2/syntax-tree";
import cn from "classnames";

import { Context } from "../../../../Context/diagram";
import { useFunctionContext } from "../../../../Context/Function";
import { filterComments, getDiagnosticInfo, getMatchingConnector, getRandomInt, getStatementTypesFromST } from "../../../../Utils";
import { BlockViewState, StatementViewState } from "../../../../ViewState";
import { DraftStatementViewState } from "../../../../ViewState/draft";
import { DefaultConfig } from "../../../../Visitors/default";
import { DeleteBtn } from "../../../DiagramActions/DeleteBtn";
import { DELETE_SVG_HEIGHT_WITH_SHADOW, DELETE_SVG_WIDTH_WITH_SHADOW } from "../../../DiagramActions/DeleteBtn/DeleteSVG";
import { EditBtn } from "../../../DiagramActions/EditBtn";
import { EDIT_SVG_OFFSET, EDIT_SVG_WIDTH_WITH_SHADOW } from "../../../DiagramActions/EditBtn/EditSVG";
import { StatementTypes } from "../../StatementTypes";
import { VariableName, VARIABLE_NAME_WIDTH } from "../../VariableName";

import { ProcessSVG, PROCESS_SVG_HEIGHT, PROCESS_SVG_HEIGHT_WITH_SHADOW, PROCESS_SVG_SHADOW_OFFSET, PROCESS_SVG_WIDTH, PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW } from "./ProcessSVG";
import "./style.scss";
export interface ProcessorProps {
    model: STNode;
    blockViewState?: BlockViewState;
}

export function ActionProcessor(props: ProcessorProps) {
    const diagramContext = useContext(Context);
    const { isReadOnly, syntaxTree, stSymbolInfo } = diagramContext.props;
    const renderConnectorWizard = diagramContext?.api?.edit?.renderConnectorWizard;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const diagramCleanDraw = diagramContext?.actions?.diagramCleanDraw;

    const { functionNode } = useFunctionContext();
    // const { id: appId } = currentApp || {};

    const { model, blockViewState } = props;
    const [isConfigWizardOpen, setConfigWizardOpen] = useState(false);

    const viewState: StatementViewState = model === null ? blockViewState.draft[1] : model.viewState;
    const isDraftStatement: boolean = blockViewState
        && blockViewState.draft[1] instanceof DraftStatementViewState;
    let draftViewState: DraftStatementViewState = viewState as DraftStatementViewState;
    let processType = "Action";
    let processName = "Variable";
    let sourceSnippet = "Source";
    let statmentTypeText = "";

    let isIntializedVariable = false;

    let isReferencedVariable = false;
    let targetPosition: NodePosition;
    const diagnostics = model?.typeData?.diagnostics;
    const diagnosticMsgs = getDiagnosticInfo(diagnostics);

    if (model) {
        processType = "Variable";
        sourceSnippet = model.source;
        if (STKindChecker.isLocalVarDecl(model)) {
            const typedBindingPattern = model?.typedBindingPattern;
            const bindingPattern = typedBindingPattern?.bindingPattern;
            if (STKindChecker.isCaptureBindingPattern(bindingPattern)) {
                processName = bindingPattern?.variableName?.value;
                isReferencedVariable = stSymbolInfo?.variableNameReferences?.size && stSymbolInfo.variableNameReferences.get(processName)?.length > 0;
                targetPosition = bindingPattern.position;
            } else if (STKindChecker.isListBindingPattern(bindingPattern)) {
                // TODO: handle this type binding pattern.
            } else if (STKindChecker.isMappingBindingPattern(bindingPattern)) {
                // TODO: handle this type binding pattern.
            }
            if (model?.initializer && !STKindChecker.isImplicitNewExpression(model?.initializer)) {
                isIntializedVariable = true;
            }
            statmentTypeText = getStatementTypesFromST(model);
        } else if (STKindChecker.isAssignmentStatement(model)) {
            processType = "AssignmentStatement";
            processName = "Assignment";
            if (STKindChecker.isSimpleNameReference(model?.varRef)) {
                processName = model?.varRef?.name?.value
            }
        }
    } else if (isDraftStatement) {
        draftViewState = blockViewState.draft[1] as DraftStatementViewState;
        processType = draftViewState.subType;
    }

    const w: number = viewState.dataProcess.w;
    const cx: number = blockViewState ? (viewState.bBox.cx - (PROCESS_SVG_WIDTH / 2)) : (viewState.bBox.cx - (w / 2));
    const cy: number = viewState.bBox.cy;
    const variableName = (model === null ? "New " + processType : processName);

    const onWizardClose = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
        setConfigWizardOpen(false);
    };

    React.useEffect(() => {
        if (!isReadOnly && !model && !draftViewState?.connector && blockViewState) {
            const draftVS = blockViewState.draft[1];
            setConfigWizardOpen(true);
            renderConnectorWizard({
                diagramPosition: {
                    x: viewState.bBox.cx + 80,
                    y: viewState.bBox.cy,
                },
                targetPosition: draftVS.targetPosition || model?.position,
                functionNode,
                model,
                onClose: onWizardClose,
                onSave: onWizardClose,
                wizardType: ConnectorWizardType.ACTION,
            });
            // renderAddForm(draftVS.targetPosition, {
            //     formType: "EndpointList",
            //     formArgs: {
            //         functionNode,
            //         onSelect: onSelectEndpoint,
            //         onCancel: onWizardClose,
            //         onAddConnector,
            //     },
            //     isLoading: true,
            // }, onWizardClose);
        }
    }, []);

    const onDraftDelete = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
    };


    const toggleSelection = () => {
        const connectorInit: LocalVarDecl = model as LocalVarDecl;
        const matchedConnector = getMatchingConnector(connectorInit);
        if (matchedConnector) {
            const connectorInfo: ConnectorInfo = {
                connector: matchedConnector,
                functionNode
            };
            const isHttp = matchedConnector?.moduleName === "http";
            const configType = isHttp ? "HttpAction" : "Action";

            diagramContext.props.onEditComponent(model, model.position, configType, connectorInfo);

            // setConfigWizardOpen(true);
            // renderConnectorWizard({
            //     connectorInfo: matchedConnector,
            //     diagramPosition: {
            //         x: viewState.bBox.cx + 80,
            //         y: viewState.bBox.cy,
            //     },
            //     targetPosition: draftViewState.targetPosition || model?.position,
            //     // selectedConnector: draftViewState.selectedConnector,
            //     model,
            //     onClose: onWizardClose,
            //     onSave: onWizardClose,
            //     wizardType: ConnectorWizardType.ACTION,
            //     functionNode
            // });
        }
    };

    const onClickOpenInCodeView = () => {
        if (model) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }


    const errorSnippet = {
        diagnosticMsgs: diagnosticMsgs?.message,
        code: sourceSnippet,
        severity: diagnosticMsgs?.severity
    }

    const toolTip = isReferencedVariable ? "Variable is referred in the code below" : undefined;
    // If only processor is a initialized variable or log stmt or draft stmt Show the edit btn other.
    // Else show the delete button only.
    const editAndDeleteButtons = (
        <>
            <g>
                <DeleteBtn
                    model={model}
                    cx={viewState.bBox.cx - (DELETE_SVG_WIDTH_WITH_SHADOW) + PROCESS_SVG_WIDTH / 4}
                    cy={viewState.bBox.cy + (PROCESS_SVG_HEIGHT / 2) - (DELETE_SVG_HEIGHT_WITH_SHADOW / 3)}
                    toolTipTitle={toolTip}
                    isReferencedInCode={isReferencedVariable}
                    showOnRight={true}
                    isConnector={true}
                    onDraftDelete={onDraftDelete}
                />
            </g>
            <EditBtn
                model={model}
                cx={viewState.bBox.cx - (EDIT_SVG_WIDTH_WITH_SHADOW / 2) + EDIT_SVG_OFFSET}
                cy={viewState.bBox.cy + (PROCESS_SVG_HEIGHT / 4)}
                onHandleEdit={toggleSelection}
            />
        </>
    );

    const processWrapper = isDraftStatement ? cn("main-process-wrapper active-action-processor") : cn("main-process-wrapper action-processor");

    const component: React.ReactNode = !viewState.collapsed && (
        <g>
            <g className={processWrapper} data-testid="data-processor-block">
                <React.Fragment>
                    {!isDraftStatement && statmentTypeText && processName && (
                        <>
                            {statmentTypeText &&
                                <>
                                    <StatementTypes
                                        statementType={filterComments(statmentTypeText)}
                                        x={cx - (VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                                        y={cy + PROCESS_SVG_HEIGHT / 4}
                                        key_id={getRandomInt(1000)}
                                    />
                                </>
                            }
                            <VariableName
                                processType={processType}
                                variableName={processName}
                                x={cx - (VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                                y={cy + PROCESS_SVG_HEIGHT / 4}
                                key_id={getRandomInt(1000)}
                            />
                        </>
                    )}
                    <ProcessSVG
                        x={cx - PROCESS_SVG_SHADOW_OFFSET / 2}
                        y={cy - PROCESS_SVG_SHADOW_OFFSET / 2}
                        varName={variableName}
                        processType={processType}
                        diagnostics={errorSnippet}
                        position={model?.position}
                        componentSTNode={model}
                        openInCodeView={
                            !isReadOnly &&
                            model &&
                            model.position &&
                            onClickOpenInCodeView
                        }
                    />
                    {!isReadOnly && (
                        <g
                            className="process-options-wrapper"
                            height={PROCESS_SVG_HEIGHT_WITH_SHADOW}
                            width={PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW}
                            x={cx - PROCESS_SVG_SHADOW_OFFSET / 2}
                            y={cy - PROCESS_SVG_SHADOW_OFFSET / 2}
                        >
                            {/* <g>
                                {!model && !connector && endpointList}
                                {(model === null || isEditConnector) && connector && (
                                    <ConnectorConfigWizard
                                        connectorInfo={connector}
                                        position={{
                                            x: viewState.bBox.cx + 80,
                                            y: viewState.bBox.cy,
                                        }}
                                        targetPosition={draftViewState.targetPosition || targetPosition}
                                        selectedConnector={draftViewState.selectedConnector}
                                        model={model || selectedEndpoint}
                                        onClose={onActionFormClose}
                                        onSave={onWizardClose}
                                        isAction={true}
                                        isEdit={isEditConnector}
                                    />
                                )}
                            </g> */}
                            {!isConfigWizardOpen && (
                                <>
                                    <rect
                                        x={cx + PROCESS_SVG_WIDTH / 6.5}
                                        y={cy + PROCESS_SVG_HEIGHT / 3}
                                        rx="7"
                                        className="process-rect"
                                    />

                                    {editAndDeleteButtons}
                                </>
                            )}
                        </g>
                    )}
                </React.Fragment>
            </g>
        </g>
    );

    return (
        <g>
            {component}
        </g>

    );
}
