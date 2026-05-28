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
import React, { useContext } from "react";

import { BlockStatement, FunctionBodyBlock, STKindChecker } from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { useFunctionContext } from "../../../Context/Function";
import { ViewMode } from "../../../Context/types";
import { collapseExpandedRange, expandCollapsedRange, getDraftComponent, getSTComponents, recalculateSizingAndPositioning } from "../../../Utils";
import { BlockViewState } from "../../../ViewState";
import { PlusButton } from "../../PlusButtons/Plus";
import CollapseComponent from "../Collapse";
import ControlFlowArrow from "../ControlFlowArrow";
import ControlFlowExecutionTime from "../ControlFlowExecutionTime";
import { ControlFlowLine } from "../ControlFlowLine";

export interface DiagramProps {
    model: FunctionBodyBlock | BlockStatement,
    viewState: BlockViewState;
    expandReadonly?: boolean;
}

export function WorkerBody(props: DiagramProps) {
    const {
        state,
        actions: { insertComponentStart, diagramRedraw },
        props: {
            syntaxTree,
            experimentalEnabled
        }
    } = useContext(Context);

    const { viewMode } = useFunctionContext();

    const { expandReadonly, model, viewState } = props;
    const pluses: React.ReactNode[] = [];
    const workerArrows: React.ReactNode[] = [];
    let children: React.ReactNode[] = [];
    let drafts: React.ReactNode[] = [];
    const controlFlowLines: React.ReactNode[] = [];
    const controlFlowExecutionTime: React.ReactNode[] = [];
    const workerIndicatorLine: React.ReactNode[] = [];

    if (STKindChecker.isFunctionBodyBlock(model) && viewState.hasWorkerDecl) {
        children = children.concat(
            getSTComponents(model.namedWorkerDeclarator.workerInitStatements, viewState, model, expandReadonly));
        children = children.concat(
            getSTComponents(model.namedWorkerDeclarator.namedWorkerDeclarations, viewState, model, expandReadonly));
    }
    children = children.concat(getSTComponents(model.statements, viewState, model, expandReadonly))

    for (const controlFlowLine of viewState.controlFlow.lineStates) {
        const line = controlFlowLine.isArrowed ?
            <ControlFlowArrow isDotted={false} x={controlFlowLine.x} y={controlFlowLine.y} w={controlFlowLine.w} isLeft={true} /> :
            <ControlFlowLine controlFlowViewState={controlFlowLine} />;
        controlFlowLines.push(line);
    }

    for (const plusView of viewState.plusButtons) {
        if (!expandReadonly && viewMode === ViewMode.STATEMENT) {
            pluses.push(<PlusButton viewState={plusView} model={model} initPlus={false} />);
        }
    }

    for (const workerArrow of viewState.workerArrows) {
        workerArrows.push(
            <line
                style={{ stroke: '#5567D5', strokeWidth: 1 }}
                markerEnd="url(#arrowhead)"
                x1={workerArrow.x}
                y1={workerArrow.y}
                x2={workerArrow.x + workerArrow.w}
                y2={workerArrow.y}
            />
        )
    }

    if (viewState.hasWorkerDecl) {
        workerIndicatorLine.push((
            <>
                <circle
                    cx={viewState.workerIndicatorLine.x}
                    cy={viewState.workerIndicatorLine.y}
                    r="6"
                    style={{ stroke: '#5567D5', strokeWidth: 1, fill: '#fff' }}
                />
                <circle
                    cx={viewState.workerIndicatorLine.x}
                    cy={viewState.workerIndicatorLine.y}
                    r="4"
                    style={{ stroke: '#5567D5', strokeWidth: 1, fill: '#5567D5' }}
                />
                <line
                    x1={viewState.workerIndicatorLine.x}
                    y1={viewState.workerIndicatorLine.y}
                    x2={viewState.workerIndicatorLine.x + viewState.workerIndicatorLine.w}
                    y2={viewState.workerIndicatorLine.y}
                    strokeDasharray={'5, 5'}
                    style={{ stroke: '#5567D5', strokeWidth: 1 }}
                />
            </>
        ))
    }

    for (const executionTime of viewState?.controlFlow.executionTimeStates) {
        if (executionTime.value) {
            controlFlowExecutionTime.push(<ControlFlowExecutionTime x={executionTime.x} y={executionTime.y} value={executionTime.value} h={executionTime.h} />);
        }
    }
    // if (viewState?.collapseView) {
    //     children.push(<Collapse blockViewState={viewState} />)
    // }
    const collapsedComponents: JSX.Element[] = []
    if (viewState.collapsedViewStates.length > 0) {
        // TODO: handle collapse ranges rendering
        viewState.collapsedViewStates.forEach((collapseVS) => {
            const onExpandClick = () => {
                diagramRedraw(
                    recalculateSizingAndPositioning(
                        expandCollapsedRange(syntaxTree, collapseVS.range), experimentalEnabled)
                );
            }

            const onCollapseClick = () => {
                diagramRedraw(
                    recalculateSizingAndPositioning(
                        collapseExpandedRange(syntaxTree, collapseVS.range)
                    )
                );
            }
            collapsedComponents.push((
                <CollapseComponent
                    collapseVS={collapseVS}
                    onExpandClick={onExpandClick}
                    onCollapseClick={onCollapseClick}
                />
            ))
        })
    }

    if (viewState?.draft) {
        drafts = getDraftComponent(viewState, state, insertComponentStart);
    }

    return (
        <>
            {controlFlowLines}
            {collapsedComponents}
            {pluses}
            {workerIndicatorLine}
            {workerArrows}
            {children}
            {drafts}
            {controlFlowExecutionTime}
        </>
    );
}
