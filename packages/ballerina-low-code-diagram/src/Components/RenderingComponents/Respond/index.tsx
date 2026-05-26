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
import { ActionStatement, NodePosition, STNode } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { getOverlayFormConfig } from "../../../Utils";
import { BlockViewState } from "../../../ViewState";
import { DraftStatementViewState } from "../../../ViewState/draft";
import { DefaultConfig } from "../../../Visitors/default";
import { DeleteBtn } from "../../DiagramActions/DeleteBtn";
import { DELETE_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/DeleteBtn/DeleteSVG";
import { EditBtn } from "../../DiagramActions/EditBtn";
import { EDIT_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/EditBtn/EditSVG";
import { PROCESS_SVG_HEIGHT, PROCESS_SVG_HEIGHT_WITH_SHADOW, PROCESS_SVG_SHADOW_OFFSET, PROCESS_SVG_WIDTH, PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW } from "../Processor/ProcessSVG";

import { RespondSVG, RESPOND_SVG_HEIGHT, RESPOND_SVG_WIDTH_WITH_SHADOW } from "./RespondSVG";
import "./style.scss";

export interface RespondProps {
    model?: STNode;
    blockViewState?: BlockViewState;
}

export function Respond(props: RespondProps) {
    const diagramContext = useContext(Context);
    const { syntaxTree, stSymbolInfo, isReadOnly } = diagramContext.props;
    const { diagramCleanDraw } = diagramContext.actions;
    const renderAddForm = diagramContext?.api?.edit?.renderAddForm;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const gotoSource = diagramContext?.api?.code?.gotoSource;

    const { model, blockViewState } = props;

    let isEditable = false;
    const [isConfigWizardOpen, setConfigWizardOpen] = useState(false);

    let cx: number;
    let cy: number;
    let sourceSnippet = "Source";

    let compType: string = "";
    if (model) {
        cx = model.viewState.bBox.cx;
        cy = model.viewState.bBox.cy;
        sourceSnippet = model.source;
        if (model.viewState.isCallerAction) {
            compType = "respond";
        }

        if (model.kind === 'ActionStatement' && (model as ActionStatement).expression.kind === 'CheckAction') {
            isEditable = true;
        }

    } else if (blockViewState) {
        cx = blockViewState.draft[1].bBox.cx;
        cy = blockViewState.draft[1].bBox.cy;
        compType = blockViewState.draft[1].subType.toUpperCase();
    }

    const deleteTriggerPosition = {
        cx: cx - (DELETE_SVG_WIDTH_WITH_SHADOW / 2) - (DefaultConfig.dotGap / 2),
        cy: cy + (RESPOND_SVG_HEIGHT / 4)
    };

    const editTriggerPosition = {
        cx: cx - (EDIT_SVG_WIDTH_WITH_SHADOW / 2) + PROCESS_SVG_WIDTH / 3 + (DefaultConfig.dotGap / 2),
        cy: cy + (RESPOND_SVG_HEIGHT / 4)
    };

    const onClickOpenInCodeView = () => {
        if (model && gotoSource) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }

    const component: React.ReactElement = (!model?.viewState.collapsed &&
        (
            <g className="respond-wrapper">
                <RespondSVG
                    x={cx - (RESPOND_SVG_WIDTH_WITH_SHADOW / 2)}
                    y={cy - DefaultConfig.shadow + DefaultConfig.dotGap / 2}
                    text={compType}
                    model={model}
                    sourceSnippet={sourceSnippet}
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
        if (blockViewState && renderAddForm) {
            const draftVS = blockViewState.draft[1] as DraftStatementViewState;
            const overlayFormConfig = getOverlayFormConfig(draftVS.subType, draftVS.targetPosition, WizardType.NEW,
                blockViewState, undefined, stSymbolInfo);
            renderAddForm(draftVS.targetPosition, overlayFormConfig as ConfigOverlayFormStatus, onCancel, onSave);
        }
    }, []);

    const onEditClick = () => {
        if (renderEditForm) {
            const overlayFormConfig = getOverlayFormConfig("Respond", model.position, WizardType.EXISTING,
                blockViewState, undefined, stSymbolInfo, model);
            diagramContext.props.onEditComponent(model, model.position, "Respond");
            // renderEditForm(model, model.position, overlayFormConfig as ConfigOverlayFormStatus, onCancel, onSave);
        }
    }

    const onSave = () => {
        setConfigWizardOpen(false);
    }

    return (
        <g className="respond-contect-wrapper">
            {component}
            <>
                {!isReadOnly && (<g
                    className="respond-options-wrapper"
                    height={PROCESS_SVG_HEIGHT_WITH_SHADOW}
                    width={PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW}
                    x={cx - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                    y={cy - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                >
                    {!isConfigWizardOpen && (
                        <>
                            <rect
                                x={cx - (PROCESS_SVG_WIDTH / 3) - DefaultConfig.dotGap * 1.5}
                                y={cy + (PROCESS_SVG_HEIGHT / 4)}
                                className="respond-rect"
                            />
                            {!isEditable &&
                                <DeleteBtn
                                    {...deleteTriggerPosition}
                                    model={model}
                                    onDraftDelete={onDraftDelete}
                                />}
                            {isEditable &&
                                <>
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
                                </>}
                        </>
                    )}
                </g>)}
            </>
        </g>
    );
}
