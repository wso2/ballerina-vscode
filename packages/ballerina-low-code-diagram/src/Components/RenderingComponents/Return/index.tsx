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
// tslint:disable: jsx-no-multiline-js jsx-wrap-multiline
import React, { useContext, useState } from "react";

import { ConfigOverlayFormStatus, WizardType } from "@wso2/ballerina-core";
import { NodePosition, ReturnStatement } from "@wso2/syntax-tree";
import cn from "classnames";

import { Context } from "../../../Context/diagram";
import { getDiagnosticInfo, getOverlayFormConfig, getRandomInt } from "../../../Utils";
import { BlockViewState, StatementViewState } from "../../../ViewState";
import { DraftStatementViewState } from "../../../ViewState/draft";
import { DefaultConfig } from "../../../Visitors/default";
import { DeleteBtn } from "../../DiagramActions/DeleteBtn";
import { DELETE_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/DeleteBtn/DeleteSVG";
import { EditBtn } from "../../DiagramActions/EditBtn";
import { EDIT_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/EditBtn/EditSVG";
import { PROCESS_SVG_HEIGHT, PROCESS_SVG_HEIGHT_WITH_SHADOW, PROCESS_SVG_SHADOW_OFFSET, PROCESS_SVG_WIDTH, PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW } from "../Processor/ProcessSVG";
import { VariableName } from "../VariableName";

import { ReturnSVG, RETURN_SVG_HEIGHT, RETURN_SVG_WIDTH, } from "./ReturnSVG";
import "./style.scss";

export interface ReturnProps {
    model?: ReturnStatement;
    blockViewState?: BlockViewState;
    expandReadonly?: boolean;
}

export function Return(props: ReturnProps) {
    const diagramContext = useContext(Context);
    const { isReadOnly, syntaxTree, stSymbolInfo } = diagramContext.props;
    const diagramCleanDraw = diagramContext?.actions.diagramCleanDraw;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const renderAddForm = diagramContext?.api?.edit?.renderAddForm;
    const gotoSource = diagramContext?.api?.code?.gotoSource;

    const { model, blockViewState, expandReadonly } = props;

    const [isConfigWizardOpen, setConfigWizardOpen] = useState(false);

    let cx: number;
    let cy: number;
    let sourceSnippet = "Source";
    const diagnostics = model?.typeData?.diagnostics;
    const diagnosticMsgs = getDiagnosticInfo(diagnostics);

    let compType: string = "";
    if (model) {
        cx = model.viewState.bBox.cx;
        cy = model.viewState.bBox.cy;
        sourceSnippet = model.source;
        if (model.viewState.isCallerAction) {
            compType = "return";
        }
    } else if (blockViewState) {
        cx = blockViewState.draft[1].bBox.cx;
        cy = blockViewState.draft[1].bBox.cy;
        compType = blockViewState.draft[1].subType.toUpperCase();
    }

    const deleteTriggerPosition = {
        cx: cx - (DELETE_SVG_WIDTH_WITH_SHADOW / 2) - (DefaultConfig.dotGap / 2),
        cy: cy + (RETURN_SVG_HEIGHT / 7)
    };

    const editTriggerPosition = {
        cx: cx - (EDIT_SVG_WIDTH_WITH_SHADOW / 2) + PROCESS_SVG_WIDTH / 3 + (DefaultConfig.dotGap / 2),
        cy: cy + (RETURN_SVG_HEIGHT / 7)
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

    const component: React.ReactElement = (!model?.viewState.collapsed &&
        (
            <g className="return-wrapper">
                <ReturnSVG
                    x={cx - (RETURN_SVG_WIDTH / 2)}
                    y={cy - DefaultConfig.dotGap / 4}
                    text={(model as ReturnStatement).expression?.source}
                    diagnostics={errorSnippet}
                    componentSTNode={model}
                    openInCodeView={model && model.position && onClickOpenInCodeView}
                />
            </g>
        )
    );

    const onDraftDelete = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
        setConfigWizardOpen(false);
    };

    const onCancel = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
        setConfigWizardOpen(false);
    }

    React.useEffect(() => {
        if (blockViewState) {
            const draftVS = blockViewState.draft[1] as DraftStatementViewState;
            const overlayFormConfig = getOverlayFormConfig(draftVS.subType, draftVS.targetPosition, WizardType.NEW,
                blockViewState, undefined, stSymbolInfo);
            renderAddForm(draftVS.targetPosition, overlayFormConfig as ConfigOverlayFormStatus, onCancel, onSave);
        }
    }, []);

    const onEditClick = () => {
        const overlayFormConfig = getOverlayFormConfig("Return", model.position, WizardType.EXISTING,
            blockViewState, undefined, stSymbolInfo, model);
        diagramContext.props.onEditComponent(model, model.position, "Return");
        // renderEditForm(model, model.position, overlayFormConfig as ConfigOverlayFormStatus, onCancel, onSave);
    }

    const onSave = () => {
        setConfigWizardOpen(false);
    }

    const expressionSource = model?.expression?.source;

    return (
        <g className={expandReadonly ? cn("return-contect-wrapper rect-fill-none") : cn("return-contect-wrapper rect-fill")}>
            {expressionSource && (
                <VariableName
                    variableName={expressionSource}
                    x={cx - (RETURN_SVG_WIDTH * 2 + DefaultConfig.textAlignmentOffset + DefaultConfig.textAlignmentOffset / 4)}
                    y={cy - ((model.viewState as StatementViewState).isSend ? RETURN_SVG_HEIGHT / 2 : 0)}
                    key_id={getRandomInt(1000)}
                />
            )}
            {component}
            <>
                {!isReadOnly && (
                    <g
                        className="return-options-wrapper"
                        height={PROCESS_SVG_HEIGHT_WITH_SHADOW}
                        width={PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW}
                        x={cx - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                        y={cy - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                    >
                        {!isConfigWizardOpen && (
                            <>
                                <rect
                                    x={cx - (PROCESS_SVG_WIDTH / 3) - DefaultConfig.dotGap * 2}
                                    y={cy + (PROCESS_SVG_HEIGHT / 4)}
                                    className="return-rect"
                                />
                                <DeleteBtn
                                    {...deleteTriggerPosition}
                                    model={model}
                                    onDraftDelete={onDraftDelete}
                                />
                                <EditBtn
                                    {...editTriggerPosition}
                                    model={model}
                                    onHandleEdit={onEditClick}
                                />
                            </>
                        )}
                    </g>
                )}
            </>
        </g>
    );
}
