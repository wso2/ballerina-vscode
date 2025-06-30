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
import React, { useContext } from "react";

import { ConfigOverlayFormStatus, WizardType } from "@wso2/ballerina-core";
import { NodePosition, STNode } from "@wso2/syntax-tree";
import cn from "classnames";

import { Context } from "../../../Context/diagram";
import { getConditionConfig } from "../../../Utils";
import { BlockViewState, EndViewState } from "../../../ViewState";
import { DefaultConfig } from "../../../Visitors/default";
import { DeleteBtn } from "../../DiagramActions/DeleteBtn";
import { DELETE_SVG_OFFSET, DELETE_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/DeleteBtn/DeleteSVG";
import { EditBtn } from "../../DiagramActions/EditBtn";
import { EDIT_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/EditBtn/EditSVG";

import { StopSVG, STOP_SVG_HEIGHT, STOP_SVG_HEIGHT_WITH_SHADOW, STOP_SVG_SHADOW_OFFSET, STOP_SVG_WIDTH_WITH_SHADOW } from "./StopSVG";
import "./style.scss";

export interface EndProps {
    viewState?: EndViewState;
    model?: STNode;
    blockViewState?: BlockViewState;
    isExpressionFunction?: boolean;
    expandReadonly?: boolean;
}

export function End(props: EndProps) {
    const diagramContext = useContext(Context);
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const {
        syntaxTree,
        stSymbolInfo,
        isReadOnly,
    } = diagramContext.props;
    const { diagramCleanDraw } = diagramContext.actions;

    const { viewState, model, blockViewState, isExpressionFunction, expandReadonly } = props;

    const compType = "end";
    let cx: number;
    let cy: number;
    if (viewState) {
        cx = viewState.bBox.cx;
        cy = viewState.bBox.cy;
    } else if (model) {
        cx = model.viewState.bBox.cx;
        cy = model.viewState.bBox.cy;
    }

    const deleteTriggerPosition = {
        cx: cx - ((DELETE_SVG_WIDTH_WITH_SHADOW / 2) + (DELETE_SVG_OFFSET / 2) - (DefaultConfig.dotGap / 1.6)),
        cy: cy + ((STOP_SVG_HEIGHT / 3) - (DefaultConfig.dotGap / 1.6))
    };

    const editTriggerPosition = {
        cx: cx - (EDIT_SVG_WIDTH_WITH_SHADOW / 2) + DefaultConfig.dotGap * 2.2,
        cy: cy + ((STOP_SVG_HEIGHT / 3) - (DefaultConfig.dotGap / 1.6))
    };

    const onDraftDelete = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
    };

    const onReturnEditClick = () => {
        if (renderEditForm) {
            const configOverrlayState = getConditionConfig('Return', model.position, WizardType.EXISTING, model.viewState, undefined, stSymbolInfo, model);
            renderEditForm(model, model.position, configOverrlayState as ConfigOverlayFormStatus);
        }
    }

    let codeSnippet = "No return statement"

    if (model) {
        codeSnippet = model.source
    }

    const onClickOpenInCodeView = () => {
        if (model && gotoSource) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }

    const component: React.ReactElement = ((!model?.viewState.collapsed || blockViewState) &&
        (
            <g className={expandReadonly ? cn("end-wrapper rect-fill-none") : cn("end-wrapper rect-fill")} data-testid="end-block">
                <StopSVG
                    x={cx - ((STOP_SVG_WIDTH_WITH_SHADOW / 2) + (STOP_SVG_SHADOW_OFFSET / 4))}
                    y={cy - DefaultConfig.shadow}
                    text={compType.toUpperCase()}
                    codeSnippet={codeSnippet}
                    openInCodeView={model && model?.position && onClickOpenInCodeView}
                />
                {blockViewState || model ?
                    (<>
                        {
                            (!isExpressionFunction && !isReadOnly) && (<g
                                className="end-options-wrapper"
                                height={STOP_SVG_HEIGHT_WITH_SHADOW}
                                width={STOP_SVG_HEIGHT_WITH_SHADOW}
                                x={cx - (STOP_SVG_SHADOW_OFFSET / 2)}
                                y={cy - (STOP_SVG_SHADOW_OFFSET / 2)}
                            >
                                <DeleteBtn
                                    {...deleteTriggerPosition}
                                    model={model}
                                    onDraftDelete={onDraftDelete}
                                />
                                <EditBtn
                                    model={model}
                                    {...editTriggerPosition}
                                    onHandleEdit={onReturnEditClick}
                                />
                            </g>)
                        }
                    </>
                    ) : null
                }
            </g >
        )
    );

    return (
        <g>
            {component}
        </g>
    );
}
