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
// tslint:disable: jsx-no-multiline-js  jsx-wrap-multiline
import React, { ReactNode, useContext, useState } from "react"

import { ConfigOverlayFormStatus, WizardType } from "@wso2/ballerina-core";
import {
    BracedExpression,
    NodePosition,
    STKindChecker,
    STNode,
    WhileStatement
} from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { useFunctionContext } from "../../../Context/Function";
import { ViewMode } from "../../../Context/types";
import { collapseExpandedRange, expandCollapsedRange, getConditionConfig, getDiagnosticInfo, getDraftComponent, getRandomInt, getSTComponents, recalculateSizingAndPositioning } from "../../../Utils";
import { BlockViewState } from "../../../ViewState";
import { WhileViewState } from "../../../ViewState/while";
import { DefaultConfig } from "../../../Visitors/default";
import { DeleteBtn } from "../../DiagramActions/DeleteBtn";
import {
    DELETE_SVG_HEIGHT_WITH_SHADOW,
    DELETE_SVG_WIDTH_WITH_SHADOW
} from "../../DiagramActions/DeleteBtn/DeleteSVG";
import { EditBtn } from "../../DiagramActions/EditBtn";
import {
    EDIT_SVG_HEIGHT_WITH_SHADOW,
    EDIT_SVG_OFFSET,
    EDIT_SVG_WIDTH_WITH_SHADOW
} from "../../DiagramActions/EditBtn/EditSVG";
import { PlusButton } from "../../PlusButtons/Plus";
import CollapseComponent from "../Collapse";
import { ConditionAssignment, CONDITION_ASSIGNMENT_NAME_WIDTH } from "../ConditionAssignment";
import { ControlFlowIterationCount, ControlFlowIterationCountProp, CONTROL_FLOW_ITERATION_COUNT_PADDING } from "../ControlFlowIterationCount";
import { ControlFlowLine } from "../ControlFlowLine";
import { ColapseButtonSVG, COLLAPSE_SVG_WIDTH } from "../ForEach/ColapseButtonSVG";
import { ExpandButtonSVG } from "../ForEach/ExpandButtonSVG";
import { COLLAPSE_DOTS_SVG_WIDTH, ThreeDotsSVG } from "../ForEach/ThreeDotsSVG";

import "./style.scss";
import {
    WhileSVG, WHILE_SHADOW_OFFSET, WHILE_SVG_HEIGHT, WHILE_SVG_HEIGHT_WITH_SHADOW, WHILE_SVG_WIDTH,
    WHILE_SVG_WIDTH_WITH_SHADOW
} from "./WhileSVG";

export interface WhileProps {
    blockViewState?: BlockViewState;
    model: STNode;
}

export function While(props: WhileProps) {
    const diagramContext = useContext(Context);
    const { viewMode } = useFunctionContext();
    const { syntaxTree, isReadOnly, stSymbolInfo, experimentalEnabled } = diagramContext.props;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const state = diagramContext?.state;
    const { diagramCleanDraw, diagramRedraw, insertComponentStart } = diagramContext.actions;

    const { model } = props;

    const [isConfigWizardOpen, setConfigWizardOpen] = useState(false);

    const pluses: React.ReactNode[] = [];
    const modelWhile: WhileStatement = model as WhileStatement;
    const conditionExpr = modelWhile.condition;
    const children = getSTComponents(modelWhile.whileBody.statements);
    const controlFlowLines: React.ReactNode[] = [];

    const viewState: WhileViewState = modelWhile.viewState;
    const bodyViewState: BlockViewState = modelWhile.whileBody.viewState;

    const x: number = viewState.whileHead.cx;
    const y: number = viewState.whileHead.cy - (viewState.whileHead.h / 2) - (WHILE_SHADOW_OFFSET / 2);
    const r: number = DefaultConfig.forEach.radius;
    const paddingUnfold = DefaultConfig.forEach.paddingUnfold;
    const diagnostics = modelWhile?.condition?.typeData?.diagnostics;

    const diagnosticMsgs = getDiagnosticInfo(diagnostics);

    const diagnosticStyles = diagnosticMsgs?.severity === "ERROR" ? "while-block-error" : "while-block-warning";
    const whileRectStyles = diagnosticMsgs ? diagnosticStyles : "while-block";

    let codeSnippet = modelWhile?.source?.trim().split('{')[0];
    let codeSnippetOnSvg = "WHILE";

    const errorSnippet = {
        diagnosticMsgs: diagnosticMsgs?.message,
        code: codeSnippet,
        severity: diagnosticMsgs?.severity
    }

    if (model) {
        codeSnippet = codeSnippet;
        const firstBraceIndex = codeSnippet.indexOf("(");
        const lastBraceIndex = codeSnippet.lastIndexOf(")");
        codeSnippetOnSvg = codeSnippet.substring(firstBraceIndex + 1, lastBraceIndex);
    }

    const onClickOpenInCodeView = () => {
        if (model) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }

    let drafts: React.ReactNode[] = [];
    if (bodyViewState.draft) {
        drafts = getDraftComponent(bodyViewState, state, insertComponentStart);
    }

    const lifeLineProps = {
        x1: viewState.whileLifeLine.cx,
        y1: viewState.whileLifeLine.cy,
        x2: viewState.whileLifeLine.cx,
        y2: (viewState.whileLifeLine.cy + viewState.whileLifeLine.h)
    };
    const rectProps = {
        x: viewState.whileBodyRect.cx - (viewState.whileBodyRect.lw),
        y: viewState.whileBodyRect.cy,
        width: viewState.whileBodyRect.w,
        height: viewState.whileBodyRect.h,
        rx: r
    };
    const foldProps = {
        x: x + (viewState.whileBodyRect.rw) - paddingUnfold - COLLAPSE_SVG_WIDTH,
        y: y + (WHILE_SVG_HEIGHT_WITH_SHADOW / 2) + paddingUnfold
    };

    let controlFlowIterationProp: ControlFlowIterationCountProp;
    if (model.controlFlow?.isReached) {
        controlFlowIterationProp = {
            x: viewState.whileBodyRect.cx - (viewState.whileBodyRect.w / 2) + CONTROL_FLOW_ITERATION_COUNT_PADDING,
            y: viewState.whileBodyRect.cy + CONTROL_FLOW_ITERATION_COUNT_PADDING,
            count: model.controlFlow.numberOfIterations
        }
    }

    if (bodyViewState.collapseView) {
        // TODO: fix rendering of collapsed ranges in while block
        // children.push(<Collapse blockViewState={bodyViewState} />)
    }

    for (const plusView of modelWhile.whileBody.viewState.plusButtons) {
        pluses.push(<PlusButton viewState={plusView} model={modelWhile.whileBody} initPlus={false} />)
    }

    const collapsedComponents: JSX.Element[] = []
    if (bodyViewState.collapsedViewStates.length > 0) {
        // TODO: handle collapse ranges rendering
        bodyViewState.collapsedViewStates.forEach((collapseVS) => {
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

    const handleFoldClick = () => {
        viewState.folded = true;
        diagramRedraw(syntaxTree);
    };

    const handleExpandClick = () => {
        viewState.folded = false;
        diagramRedraw(syntaxTree);
    };

    const onCancel = () => {
        diagramCleanDraw(syntaxTree);
        setConfigWizardOpen(false);
    }
    const onSave = () => {
        setConfigWizardOpen(false);
    }

    const onWhileHeadClick = () => {
        const conditionExpression = STKindChecker.isBracedExpression(conditionExpr) ? conditionExpr.expression.source : conditionExpr.source;
        setConfigWizardOpen(true);
        const conditionConfigState = getConditionConfig("While", model.position, WizardType.EXISTING, undefined, {
            type: "While",
            conditionExpression,
            conditionPosition: conditionExpr.position,
            model
        }, stSymbolInfo, model);
        diagramContext.props.onEditComponent(model, model.position, "While");
        // renderEditForm(model, model.position, conditionConfigState as ConfigOverlayFormStatus, onCancel, onSave);
    };

    const onDraftDelete = () => {
        diagramCleanDraw(syntaxTree);
    };

    const deleteTriggerPosition = {
        cx: viewState.bBox.cx - (DELETE_SVG_WIDTH_WITH_SHADOW) + WHILE_SVG_WIDTH / 4,
        cy: viewState.bBox.cy + ((WHILE_SVG_HEIGHT / 2)) - (DELETE_SVG_HEIGHT_WITH_SHADOW / 3)
    };
    const editTriggerPosition = {
        cx: viewState.bBox.cx - (EDIT_SVG_WIDTH_WITH_SHADOW / 2) + EDIT_SVG_OFFSET,
        cy: viewState.bBox.cy + ((WHILE_SVG_HEIGHT / 2)) - (EDIT_SVG_HEIGHT_WITH_SHADOW / 3)
    };

    let assignmentText: any = (!drafts && STKindChecker?.isWhileStatement(model));
    assignmentText = (model as WhileStatement)?.condition.source;

    for (const controlFlowLine of bodyViewState.controlFlow.lineStates) {
        controlFlowLines.push(<ControlFlowLine controlFlowViewState={controlFlowLine} />);
    }

    const unFoldedComponent = (
        <g className={whileRectStyles} data-testid="while-block">
            <rect className="while-rect" {...rectProps} />
            <g className="while-polygon-wrapper">
                <WhileSVG
                    x={x - WHILE_SVG_WIDTH_WITH_SHADOW / 2}
                    y={y}
                    componentSTNode={model}
                    codeSnippet={codeSnippet}
                    codeSnippetOnSvg={codeSnippetOnSvg}
                    diagnostics={errorSnippet}
                    openInCodeView={model && model?.position && onClickOpenInCodeView}
                />
                <ConditionAssignment
                    x={x - (CONDITION_ASSIGNMENT_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                    y={y + WHILE_SVG_HEIGHT / 5}
                    assignment={assignmentText}
                    className="condition-assignment"
                    key_id={getRandomInt(1000)}
                />
                <>
                    {model.controlFlow?.isReached &&
                        <ControlFlowIterationCount {...controlFlowIterationProp} />
                    }
                </>

                {!isReadOnly && (<g
                    className="while-options-wrapper"
                    height={WHILE_SVG_HEIGHT_WITH_SHADOW}
                    width={WHILE_SVG_HEIGHT_WITH_SHADOW}
                    x={viewState.bBox.cx - (WHILE_SHADOW_OFFSET / 2)}
                    y={viewState.bBox.cy - (WHILE_SHADOW_OFFSET / 2)}
                >
                    {!isConfigWizardOpen &&
                        <>
                            <rect
                                x={viewState.bBox.cx - (WHILE_SVG_WIDTH / 4)}
                                y={viewState.bBox.cy + (WHILE_SVG_HEIGHT / 3)}
                                className="while-text-hover-rect"
                            />
                            <DeleteBtn
                                {...deleteTriggerPosition}
                                model={model}
                                onDraftDelete={onDraftDelete}
                            />
                            <EditBtn
                                onHandleEdit={onWhileHeadClick}
                                model={model}
                                {...editTriggerPosition}
                            />
                        </>
                    }
                </g>)}
            </g>
            <line className="life-line" {...lifeLineProps} />
            {(children.length !== 0) && <ColapseButtonSVG {...foldProps} onClick={handleFoldClick} />}
            {controlFlowLines}
            {viewMode === ViewMode.STATEMENT && pluses}
            {collapsedComponents}
            {children}
            {drafts}
        </g>
    );

    const foldedComponent = (
        <g className={whileRectStyles} data-testid="while-block">
            <rect className="while-rect" {...rectProps} />
            <g className="while-polygon-wrapper" onClick={onWhileHeadClick}>
                <WhileSVG
                    x={x - WHILE_SVG_WIDTH_WITH_SHADOW / 2}
                    y={y}
                    componentSTNode={model}
                    codeSnippet={codeSnippet}
                    codeSnippetOnSvg={codeSnippetOnSvg}
                    diagnostics={errorSnippet}
                    openInCodeView={model && model?.position && onClickOpenInCodeView}
                />
                <ConditionAssignment
                    x={x - (CONDITION_ASSIGNMENT_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                    y={y + WHILE_SVG_HEIGHT / 5}
                    assignment={assignmentText}
                    className="condition-assignment"
                    key_id={getRandomInt(1000)}
                />
                {!isReadOnly && (
                    <g
                        className="while-options-wrapper"
                        height={WHILE_SVG_HEIGHT_WITH_SHADOW}
                        width={WHILE_SVG_HEIGHT_WITH_SHADOW}
                        x={viewState.bBox.cx - (WHILE_SHADOW_OFFSET / 2)}
                        y={viewState.bBox.cy - (WHILE_SHADOW_OFFSET / 2)}
                    >
                        <rect
                            x={viewState.bBox.cx - (WHILE_SVG_WIDTH / 4)}
                            y={viewState.bBox.cy + (WHILE_SVG_HEIGHT / 3)}
                            className="while-rect"
                        />
                        {!isConfigWizardOpen &&
                            <>
                                <rect
                                    x={viewState.bBox.cx - (WHILE_SVG_WIDTH / 4)}
                                    y={viewState.bBox.cy + (WHILE_SVG_HEIGHT / 3)}
                                    className="while-text-hover-rect"
                                />
                                <DeleteBtn
                                    {...deleteTriggerPosition}
                                    model={model}
                                    onDraftDelete={onDraftDelete}
                                />
                                <g className="disable">
                                    <EditBtn
                                        model={model}
                                        {...editTriggerPosition}
                                    />
                                </g>
                            </>
                        }
                    </g>)
                }
            </g>
            <ExpandButtonSVG {...foldProps} onClick={handleExpandClick} />
            <ThreeDotsSVG x={x - (COLLAPSE_DOTS_SVG_WIDTH / 2)} y={y + WHILE_SVG_HEIGHT_WITH_SHADOW} />
        </g>
    );

    const whileComponent: ReactNode = (
        // Render unfolded component
        (!viewState.collapsed && !viewState.folded && unFoldedComponent) ||
        // Render folded component
        (!viewState.collapsed && viewState.folded && foldedComponent)
    );

    return (
        <g className="while-wrapper">
            <g>
                {whileComponent}
            </g>
        </g>
    );
}
