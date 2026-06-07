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
// tslint:disable: jsx-no-multiline-js
import React, { ReactNode, useContext } from "react";

import { DiagramDiagnostic } from "@wso2/ballerina-core";
import { BlockStatement, STNode } from "@wso2/syntax-tree";
import cn from "classnames";

import { Context } from "../../../../Context/diagram";
import { getDiagnosticInfo, getDraftComponent, getSTComponents } from "../../../../Utils";
import { ControlFlowLineState, ElseViewState } from "../../../../ViewState";
import { DefaultConfig } from "../../../../Visitors/default";
import { PlusButton } from "../../../PlusButtons/Plus";
import { ControlFlowLine } from "../../ControlFlowLine";
import ControlFlowElseEnd from "../../ControlFlowLine/ControlFlowElseEnd";
import ControlFlowElseStart from "../../ControlFlowLine/ControlFlowElseStart";

import { BottomCurveSVG, BOTTOM_CURVE_SVG_HEIGHT, BOTTOM_CURVE_SVG_WIDTH } from "./BottomCurve";
import "./style.scss";
import { TopCurveSVG, TOP_CURVE_SVG_HEIGHT, TOP_CURVE_SVG_WIDTH } from "./TopCurve";


export interface ElseProps {
    model?: STNode;
    defaultViewState?: ElseViewState;
    diagnostics?: DiagramDiagnostic[];
}

export function Else(props: ElseProps) {
    const { state, actions: { insertComponentStart }, props: { isReadOnly } } = useContext(Context);
    const { model, defaultViewState, diagnostics } = props;

    let viewState: ElseViewState;
    let elseBlock: BlockStatement;
    let children: ReactNode[];
    if (model) {
        elseBlock = model as BlockStatement;
        viewState = model.viewState;
        children = getSTComponents(elseBlock.statements);
    } else if (defaultViewState) {
        viewState = defaultViewState;
    }

    const pluses: React.ReactNode[] = [];
    const yOffsetForCurve = DefaultConfig.elseCurveYOffset;
    let drafts: React.ReactNode[] = [];
    const components: React.ReactNode[] = [];
    const controlFlowLines: React.ReactNode[] = [];
    if (viewState.draft) {
        drafts = getDraftComponent(viewState, state, insertComponentStart);
    }

    const classes = cn("else-line");
    const diagnosticMsgs = getDiagnosticInfo(diagnostics);

    const topHorizontalLine: ReactNode = (
        <>
            <text className="then-text" x={viewState.elseTopHorizontalLine.x + DefaultConfig.dotGap / 2} y={viewState.elseTopHorizontalLine.y - DefaultConfig.dotGap / 2}>else</text>
            <line
                x1={viewState.elseTopHorizontalLine.x - yOffsetForCurve}
                y1={viewState.elseTopHorizontalLine.y}
                x2={viewState.elseTopHorizontalLine.x + viewState.elseTopHorizontalLine.length - TOP_CURVE_SVG_WIDTH}
                y2={viewState.elseTopHorizontalLine.y}
            />
        </>
    );

    const topCurve: ReactNode = (
        <TopCurveSVG
            diagnostics={diagnosticMsgs}
            x={viewState.elseTopHorizontalLine.x + viewState.elseTopHorizontalLine.length - TOP_CURVE_SVG_WIDTH}
            y={viewState.elseTopHorizontalLine.y - yOffsetForCurve}
        />
    );

    const verticalLine: ReactNode = (
        <line
            x1={viewState.elseBody.x - yOffsetForCurve}
            y1={viewState.elseBody.y + TOP_CURVE_SVG_HEIGHT - yOffsetForCurve}
            x2={viewState.elseBody.x}
            y2={viewState.elseBody.y + viewState.elseBody.length - BOTTOM_CURVE_SVG_HEIGHT}
        />
    );

    const bottomCurve: ReactNode = (
        <BottomCurveSVG
            diagnostics={diagnosticMsgs}
            x={viewState.elseBody.x - BOTTOM_CURVE_SVG_WIDTH + yOffsetForCurve}
            y={viewState.elseBody.y + viewState.elseBody.length - BOTTOM_CURVE_SVG_HEIGHT}
        />
    );

    const bottomLine: ReactNode = (
        <line
            x1={viewState.elseBottomHorizontalLine.x}
            y1={viewState.elseBottomHorizontalLine.y - yOffsetForCurve}
            x2={viewState.elseBottomHorizontalLine.x + viewState.elseBottomHorizontalLine.length -
                BOTTOM_CURVE_SVG_WIDTH + yOffsetForCurve}
            y2={viewState.elseBottomHorizontalLine.y - yOffsetForCurve}
        />
    );

    if (viewState.controlFlow.lineStates.length > 0) {
        controlFlowLines.push(
            <ControlFlowElseStart
                x={viewState.elseTopHorizontalLine.x}
                y={viewState.elseTopHorizontalLine.y}
                h={viewState.controlFlow.lineStates[0].y - viewState.elseTopHorizontalLine.y}
                w={viewState.elseTopHorizontalLine.length}
            />
        );
        (viewState.controlFlow.lineStates as ControlFlowLineState[]).forEach((controlFlowLine, i) => {
            controlFlowLines.push(<ControlFlowLine controlFlowViewState={controlFlowLine} />)
        });
        if (!viewState.isEndComponentAvailable) {
            const lastControlFlowLine = viewState.controlFlow.lineStates[viewState.controlFlow.lineStates.length - 1];
            controlFlowLines.push(
                <ControlFlowElseEnd
                    x={viewState.elseBottomHorizontalLine.x}
                    y={viewState.elseBottomHorizontalLine.y}
                    h={viewState.elseBottomHorizontalLine.y - (lastControlFlowLine.y + lastControlFlowLine.h)}
                    w={viewState.elseBottomHorizontalLine.length}
                />
            );
        }
    }

    if (elseBlock) {
        for (const plusView of viewState.plusButtons) {
            pluses.push(<PlusButton viewState={plusView} model={elseBlock} initPlus={false} />)
        }
    }

    if (viewState.collapseView) {
        // TODO: Fix rendering collapsed ranges in else block
        // children.push(<Collapse blockViewState={viewState} />)
    }

    components.push(topHorizontalLine);
    components.push(topCurve);
    components.push(verticalLine);

    if (!viewState.isEndComponentAvailable) {
        components.push(bottomCurve);
        components.push(bottomLine);
    }

    return (
        <g className={classes}>
            {components}
            {controlFlowLines}
            {children}
            {isReadOnly && pluses}
            {drafts}
        </g>
    )
}
