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
import React from "react";

import { LocalVarDecl, STNode } from "@wso2/syntax-tree";
import cn from "classnames";

import { SimpleBBox, StatementViewState } from "../../../ViewState";
import { DefaultConfig } from "../../../Visitors/default";
import { CONNECTOR_PROCESS_SVG_WIDTH_WITH_SHADOW } from "../Connector/ConnectorProcess/ConnectorProcessSVG";
import ControlFlowArrow from "../ControlFlowArrow";
import { Metrics } from "../Metrics";
import { Performance } from "../Performace";
import { PROCESS_SVG_HEIGHT, PROCESS_SVG_WIDTH } from "../Processor/ProcessSVG";

import { ActionInvoLine } from "./ActionInvoLine";
import { ActionProcessor } from "./ActionProcess";
import "./style.scss";
import { TriggerSVG, TRIGGER_SVG_WIDTH } from "./TriggerSVG";
export interface ConnectorLineProps {
    model: STNode
}

export function ActionInvocation(props: ConnectorLineProps) {
    const { model } = props;
    // const { props: { isPerformanceViewOpen } } = useContext(Context);
    const classes = cn("action-invocation");
    const leftline = "leftline";
    const dashedLine = "dashedLine";

    // This is where the logic placed to find action invocation in the function body.
    const clientInvoVarDef: LocalVarDecl = model as LocalVarDecl;

    const viewState: StatementViewState = clientInvoVarDef.viewState;
    const triggerViewState: SimpleBBox = viewState.action.trigger;

    const lifeLineCX = triggerViewState.cx - (TRIGGER_SVG_WIDTH / 2);

    const x = viewState.bBox.cx;
    const y = viewState.bBox.cy;

    const actionLineStartX = x + (PROCESS_SVG_WIDTH / 2) + DefaultConfig.actionArrowPadding;
    const actionLineEndX = lifeLineCX;
    const actionLineWidth = actionLineEndX - actionLineStartX;
    const actionRightLineY = y + (PROCESS_SVG_HEIGHT / 2) - DefaultConfig.actionArrowGap / 2;
    const actionLeftLineY = y + (PROCESS_SVG_HEIGHT / 2) + DefaultConfig.actionArrowGap / 2;
    const triggerSVGX = lifeLineCX;
    const triggerSVGY = viewState.bBox.cy;

    // const truncatedActionName = (
    //     viewState.action.actionName.length > 8 && viewState.action.actionName ? viewState.action.actionName.slice(0, 7) + "..." : viewState.action.actionName
    // );

    const controlFlowArrowC = (
        <g>
            <ControlFlowArrow isDotted={false} x={actionLineStartX} y={actionRightLineY} w={actionLineWidth} />
            <ControlFlowArrow isDotted={true} x={actionLineStartX} y={actionLeftLineY} w={actionLineWidth} />
        </g>
    );
    const controlFlowArrow = viewState?.isReached ? controlFlowArrowC : null;

    return (
        <g>
            <ActionProcessor model={model} />
            <g className={classes}>
                <ActionInvoLine
                    clientInvoX={actionLineStartX}
                    clientInvoY={actionRightLineY}
                    actionX={actionLineEndX}
                    actionY={actionRightLineY}
                    direction={"right"}
                    className={leftline}
                />
                <TriggerSVG
                    x={triggerSVGX}
                    y={triggerSVGY}
                />
                <text
                    x={x + CONNECTOR_PROCESS_SVG_WIDTH_WITH_SHADOW / 2 + (DefaultConfig.dotGap / 2)}
                    y={viewState.bBox.cy + DefaultConfig.textLine.height + DefaultConfig.dotGap}
                    width={DefaultConfig.textLine.padding + DefaultConfig.textLine.width + DefaultConfig.textLine.padding}
                    className={'method-text'}
                >
                    {`${viewState.action.actionName} ${viewState.action.resourcePath || ''}`}{/* isPerformanceViewOpen ? truncatedActionName : */}
                </text>
                <ActionInvoLine
                    actionX={actionLineStartX}
                    actionY={actionLeftLineY}
                    clientInvoX={actionLineEndX}
                    clientInvoY={actionLeftLineY}
                    direction={"left"}
                    className={dashedLine}
                />
                <Metrics
                    syntaxTree={model}
                    lineStartX={actionLineStartX}
                    lineStartY={actionLeftLineY}
                    actionLineWidth={actionLineWidth}
                    triggerSVGX={triggerSVGX}
                    triggerSVGY={triggerSVGY}
                />
                <Performance
                    syntaxTree={model}
                    triggerSVGX={triggerSVGX}
                    triggerSVGY={triggerSVGY}
                />
            </g>
            {controlFlowArrow}
        </g>
    );
}
