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
import React, { useContext, useState } from "react";

import { ConfigOverlayFormStatus, DiagramDiagnostic, ElseIfConfig, WizardType } from "@wso2/ballerina-core";
import {
    BlockStatement,
    IfElseStatement, NodePosition,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";

import { Context } from "../../../Context/diagram";
import { useFunctionContext } from "../../../Context/Function";
import { ViewMode } from "../../../Context/types";
import { collapseExpandedRange, expandCollapsedRange, findActualEndPositionOfIfElseStatement, getConditionConfig, getDiagnosticInfo, getDraftComponent, getRandomInt, getSTComponents, recalculateSizingAndPositioning } from "../../../Utils";
import { BlockViewState, CollapseViewState, ControlFlowLineState, ElseViewState, IfViewState } from "../../../ViewState";
import { DraftStatementViewState } from "../../../ViewState/draft";
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
import { ControlFlowLine } from "../ControlFlowLine";

import { Else } from "./Else";
import {
    IfElseSVG,
    IFELSE_SHADOW_OFFSET,
    IFELSE_SVG_HEIGHT,
    IFELSE_SVG_HEIGHT_WITH_SHADOW,
    IFELSE_SVG_WIDTH,
    IFELSE_SVG_WIDTH_WITH_SHADOW
} from "./IfElseSVG";
import "./style.scss";

export interface IfElseProps {
    model: STNode;
    blockViewState?: BlockViewState;
    name?: string;
}

export function IfElse(props: IfElseProps) {
    const diagramContext = useContext(Context);
    const { syntaxTree, isReadOnly, stSymbolInfo, experimentalEnabled } = diagramContext.props;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const renderAddForm = diagramContext?.api?.edit?.renderAddForm;
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const state = diagramContext?.state;
    const { diagramCleanDraw, insertComponentStart, diagramRedraw } = diagramContext.actions;
    const { model, blockViewState, name } = props;
    const { viewMode } = useFunctionContext();

    const [isConfigWizardOpen, setConfigWizardOpen] = useState(false);
    const [ifElseConfigOverlayFormState, setIfElseConditionConfigState] = useState(undefined);

    const onCancel = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
        setConfigWizardOpen(false);
        // toggleDiagramOverlay();
    }

    const onSave = () => {
        setConfigWizardOpen(false);
        // toggleDiagramOverlay();
    }

    React.useEffect(() => {
        if (model === null && blockViewState) {
            const draftVS = viewState as DraftStatementViewState;
            const conditionConfigState = getConditionConfig(draftVS.subType, draftVS.targetPosition, WizardType.NEW,
                blockViewState, undefined, stSymbolInfo);
            renderAddForm(draftVS.targetPosition, conditionConfigState as ConfigOverlayFormStatus, onCancel);
        }
    }, []);

    const onDraftDelete = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
    };

    let codeSnippet = "IF ELSE CODE SNIPPET"
    let codeSnippetOnSvg = "IF"
    const diagnostics = (model as IfElseStatement)?.condition.typeData?.diagnostics;

    if (model) {
        codeSnippet = model.source.trim().split(')')[0];
        codeSnippetOnSvg = codeSnippet.substring(4, 13)
        codeSnippet = codeSnippet + ')'
    }

    const onClickOpenInCodeView = () => {
        if (model) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }

    let viewState: any = model === null ?
        blockViewState.draft[1] as DraftStatementViewState
        : (model as IfElseStatement).viewState as IfViewState;
    let component: React.ReactElement;
    let drafts: React.ReactNode[] = [];
    let conditionType = "If";

    const deleteTriggerPosition = {
        cx: viewState.bBox.cx - (DELETE_SVG_WIDTH_WITH_SHADOW) + IFELSE_SVG_WIDTH / 4,
        cy: viewState.bBox.cy + ((IFELSE_SVG_HEIGHT / 2)) - (DELETE_SVG_HEIGHT_WITH_SHADOW / 3)
    };
    const editTriggerPosition = {
        cx: viewState.bBox.cx - (EDIT_SVG_WIDTH_WITH_SHADOW / 2) + EDIT_SVG_OFFSET,
        cy: viewState.bBox.cy + ((IFELSE_SVG_HEIGHT / 2)) - (EDIT_SVG_HEIGHT_WITH_SHADOW / 3)
    };

    const isDraftStatement: boolean = viewState instanceof DraftStatementViewState;

    let assignmentText: any = (!isDraftStatement && STKindChecker?.isIfElseStatement(model));
    assignmentText = (model as IfElseStatement)?.condition.source;
    const diagnosticMsgs = getDiagnosticInfo(diagnostics);

    const diagnosticStyles = diagnosticMsgs?.severity === "ERROR" ? "main-condition-wrapper if-condition-error-wrapper" : "main-condition-wrapper if-condition-warning-wrapper";
    const conditionWrapper = isDraftStatement ? (diagnosticMsgs ?
        "main-condition-wrapper active-condition-error" : "main-condition-wrapper active-condition") :
        (diagnosticMsgs ?
            diagnosticStyles : "main-condition-wrapper if-condition-wrapper");

    const errorSnippet = {
        diagnosticMsgs: diagnosticMsgs?.message,
        code: codeSnippet,
        severity: diagnosticMsgs?.severity
    }
    const assignmentTextWidth = assignmentText?.length * 8 + DefaultConfig.dotGap;

    if (model === null) {
        viewState = blockViewState.draft[1] as DraftStatementViewState;
        conditionType = viewState.subType;
        const x: number = viewState.bBox.cx;
        const y: number = viewState.bBox.cy;

        component = (
            <g className="if-else">
                <IfElseSVG
                    x={x - IFELSE_SVG_WIDTH_WITH_SHADOW / 2}
                    y={y - (IFELSE_SHADOW_OFFSET / 2)}
                    text="Draft"
                    data-testid="ifelse-block"
                    codeSnippet={codeSnippet}
                    codeSnippetOnSvg={codeSnippetOnSvg}
                    conditionType={conditionType}
                    componentSTNode={model}
                    openInCodeView={model && model?.position && onClickOpenInCodeView}
                />
                <ConditionAssignment
                    x={x - (CONDITION_ASSIGNMENT_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                    y={y - ((IFELSE_SVG_HEIGHT / 3) + DefaultConfig.dotGap)}
                    assignment={assignmentText}
                    className="condition-assignment"
                    key_id={getRandomInt(1000)}
                />
                <>
                    {
                        !isReadOnly && (
                            <g
                                className="condition-options-wrapper"
                                height={IFELSE_SVG_HEIGHT_WITH_SHADOW}
                                width={IFELSE_SVG_HEIGHT_WITH_SHADOW}
                                x={viewState.bBox.cx - (IFELSE_SHADOW_OFFSET / 2)}
                                y={viewState.bBox.cy - (IFELSE_SHADOW_OFFSET / 2)}
                            >
                                {/* {model === null && blockViewState && isDraftStatement && ifElseConfigOverlayFormState &&
                                    // {model === null && blockViewState?.draft && isDraftStatement &&
                                    <FormGenerator
                                        onCancel={onCancel}
                                        onSave={onSave}
                                        configOverlayFormStatus={ifElseConfigOverlayFormState}
                                    />
                                }
                                {model && isConfigWizardOpen && ifElseConfigOverlayFormState &&
                                    <FormGenerator
                                        onCancel={onCancel}
                                        onSave={onSave}
                                        configOverlayFormStatus={ifElseConfigOverlayFormState}
                                    />
                                } */}
                                {!isConfigWizardOpen && !isDraftStatement &&
                                    <>
                                        <rect
                                            x={viewState.bBox.cx - (IFELSE_SVG_WIDTH / 4)}
                                            y={viewState.bBox.cy + (IFELSE_SVG_HEIGHT / 3) - DefaultConfig.dotGap / 2}
                                            className="condition-rect"
                                        />
                                        <DeleteBtn
                                            {...deleteTriggerPosition}
                                            model={model}
                                            onDraftDelete={onDraftDelete}
                                        />
                                        <EditBtn
                                            model={model}
                                            {...editTriggerPosition}
                                        />
                                    </>
                                }

                            </g>
                        )
                    }
                </>
            </g>
        );
    } else {
        const ifStatement: IfElseStatement = model as IfElseStatement;
        viewState = ifStatement.viewState as IfViewState;
        const bodyViewState: BlockViewState = ifStatement.ifBody.viewState;

        if (bodyViewState.draft) {
            drafts = getDraftComponent(bodyViewState, state, insertComponentStart);
        }

        if (!viewState.isElseIf) {
            const position: any = findActualEndPositionOfIfElseStatement(ifStatement);
            if (position) {
                ifStatement.position.endLine = position.endLine;
                ifStatement.position.endColumn = position.endColumn;
            }
        }

        const x: number = viewState.headIf.cx;
        const y: number = viewState.headIf.cy;

        const componentName: string = name ? "ELSE IF" : "IF";

        const conditionExpr = ifStatement.condition;

        const isElseExist: boolean = ((ifStatement.elseBody?.elseBody as BlockStatement)?.kind === "BlockStatement");
        const isDefaultElseExist: boolean = viewState.defaultElseVS !== undefined;

        const isElseIfExist: boolean = (ifStatement.elseBody?.elseBody as IfElseStatement)?.kind === "IfElseStatement";

        const children = getSTComponents(ifStatement.ifBody.statements);
        const pluses: React.ReactNode[] = [];
        const controlFlowLines: React.ReactNode[] = [];
        const collapsedComponents: JSX.Element[] = []

        const ifBodyPlusBtns: JSX.Element[] = [];
        for (const plusView of ifStatement.ifBody.viewState.plusButtons) {
            if (viewMode === ViewMode.INTERACTION) break;
            ifBodyPlusBtns.push(<PlusButton viewState={plusView} model={ifStatement.ifBody} initPlus={false} />);
        }

        if (ifStatement.ifBody.viewState.collapsedViewStates.length > 0) {
            ifStatement.ifBody.viewState.collapsedViewStates.forEach((collapseVS: CollapseViewState) => {
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

        pluses.push(<g className="if-body-pluses">{ifBodyPlusBtns}</g>);

        const elseBodyPlusBtns: JSX.Element[] = [];
        if (isElseExist) {
            for (const plusView of ifStatement.elseBody.elseBody.viewState.plusButtons) {
                if (viewMode === ViewMode.INTERACTION) break;
                elseBodyPlusBtns.push(<PlusButton viewState={plusView} model={ifStatement.elseBody.elseBody as BlockStatement} initPlus={false} />)
            }

            if (ifStatement.elseBody.elseBody.viewState.collapsedViewStates.length > 0) {
                ifStatement.elseBody.elseBody.viewState.collapsedViewStates.forEach((collapseVS: CollapseViewState) => {
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
        }
        pluses.push(<g className="else-body-pluses">{elseBodyPlusBtns}</g>);


        if (bodyViewState.collapseView) {
            // TODO: Fix rendering of collapsed ranges in if blocks
            // children.push(<Collapse blockViewState={bodyViewState} />)
        }

        const getExpressions = (): ElseIfConfig => {
            const conditions: { id: number, expression: string, position: NodePosition, diagnostics?: DiagramDiagnostic[] }[] = [];
            conditions.push({
                id: 0,
                expression: conditionExpr?.source.trim(),
                position: conditionExpr?.position,
                diagnostics: conditionExpr?.typeData?.diagnostics
            });
            if (model) {
                if (isElseIfExist) {
                    let block = ifStatement.elseBody?.elseBody as IfElseStatement;
                    let isElseIfBlockExist: boolean = block?.kind === "IfElseStatement";
                    let id = 1;
                    while (isElseIfBlockExist) {
                        const expression = block?.condition?.source.trim();
                        const position = block?.condition?.position;
                        const nodeDiagnostics = block?.condition?.typeData?.diagnostics;
                        conditions.push({ id, expression, position, diagnostics: nodeDiagnostics });
                        isElseIfBlockExist = (block?.elseBody?.elseBody as IfElseStatement)?.kind === "IfElseStatement";
                        block = block.elseBody?.elseBody as IfElseStatement;
                        id = id + 1;
                    }
                }
            }
            return { values: conditions };
        }

        const onIfHeadClick = () => {
            const conditionExpression = getExpressions();
            const position = getExpressions()?.values[0]?.position;
            // setConfigWizardOpen(true);
            const conditionConfigState = getConditionConfig("If", model.position, WizardType.EXISTING, undefined, {
                type: "If",
                conditionExpression,
                conditionPosition: getExpressions()?.values[0]?.position,
                model
            }, stSymbolInfo, model);
            diagramContext.props.onEditComponent(model, model.position, "If");
            // renderEditForm(model, model.position, conditionConfigState as ConfigOverlayFormStatus, onCancel);
            // setIfElseConditionConfigState(conditionConfigState);
        };


        if (ifStatement.ifBody.viewState) {
            for (const controlFlowLine of (ifStatement.ifBody.viewState.controlFlow.lineStates as ControlFlowLineState[])) {
                controlFlowLines.push(<ControlFlowLine controlFlowViewState={controlFlowLine} />)
            };
        };

        component = (
            conditionExpr && viewState && !viewState.collapsed &&
            (
                <g className="if-else">
                    <text className="then-text" x={x - IFELSE_SVG_WIDTH_WITH_SHADOW / 2} y={y + IFELSE_SVG_HEIGHT_WITH_SHADOW / 2}>then</text>
                    {/* Render top horizontal line in else if scenario */}
                    {viewState.elseIfLifeLine.x > 0 && (
                        <line
                            x1={viewState.elseIfTopHorizontalLine.x}
                            y1={viewState.elseIfTopHorizontalLine.y}
                            x2={viewState.elseIfLifeLine.x - (IFELSE_SVG_WIDTH / 2)}
                            y2={viewState.elseIfTopHorizontalLine.y}
                        />
                    )}
                    {/* Render top vertical life line in else if scenario */}
                    <line
                        x1={viewState.elseIfLifeLine.x}
                        y1={viewState.elseIfLifeLine.y}
                        x2={viewState.elseIfLifeLine.x}
                        y2={viewState.elseIfLifeLine.y + viewState.elseIfLifeLine.h}
                    />
                    {/* Render bottom horizontal line in else if scenario */}
                    <line
                        x1={viewState.elseIfBottomHorizontalLine.x}
                        y1={viewState.elseIfBottomHorizontalLine.y}
                        x2={viewState.elseIfLifeLine.x}
                        y2={viewState.elseIfBottomHorizontalLine.y}
                    />
                    <g className="if-head-wrapper" >
                        <IfElseSVG
                            x={x - IFELSE_SVG_WIDTH_WITH_SHADOW / 2}
                            y={y - IFELSE_SVG_HEIGHT_WITH_SHADOW / 2}
                            text={componentName}
                            data-testid="ifelse-block"
                            codeSnippet={codeSnippet}
                            diagnostics={errorSnippet}
                            codeSnippetOnSvg={codeSnippetOnSvg}
                            conditionType={conditionType}
                            componentSTNode={model}
                            openInCodeView={model && model?.position && onClickOpenInCodeView}
                        />
                        <ConditionAssignment
                            x={x - (CONDITION_ASSIGNMENT_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                            y={y - ((IFELSE_SVG_HEIGHT / 3) + DefaultConfig.dotGap)}
                            assignment={assignmentText}
                            className="condition-assignment"
                            key_id={getRandomInt(1000)}
                        />
                        <>
                            {
                                !isReadOnly && (<g
                                    className="condition-options-wrapper"
                                    height={IFELSE_SVG_HEIGHT_WITH_SHADOW}
                                    width={IFELSE_SVG_HEIGHT_WITH_SHADOW}
                                    x={viewState.bBox.cx - (IFELSE_SHADOW_OFFSET / 2)}
                                    y={viewState.bBox.cy - (IFELSE_SHADOW_OFFSET / 2)}
                                >
                                    <rect
                                        x={viewState.bBox.cx - (IFELSE_SVG_WIDTH / 4)}
                                        y={viewState.bBox.cy + (IFELSE_SVG_HEIGHT / 3) - DefaultConfig.dotGap / 2}
                                        className="condition-rect"
                                    />
                                    {/* {model === null && blockViewState && isDraftStatement && ifElseConfigOverlayFormState &&
                                        <FormGenerator
                                            onCancel={onCancel}
                                            onSave={onSave}
                                            configOverlayFormStatus={ifElseConfigOverlayFormState}
                                        />
                                    }
                                    {model && isConfigWizardOpen && ifElseConfigOverlayFormState &&
                                        <FormGenerator
                                            onCancel={onCancel}
                                            onSave={onSave}
                                            configOverlayFormStatus={ifElseConfigOverlayFormState}
                                        />
                                    } */}
                                    {(!isDraftStatement) &&
                                        <>
                                            <DeleteBtn
                                                {...deleteTriggerPosition}
                                                model={model}
                                                onDraftDelete={onDraftDelete}
                                            />
                                            <EditBtn
                                                model={model}
                                                {...editTriggerPosition}
                                                onHandleEdit={onIfHeadClick}
                                            />
                                        </>
                                    }
                                </g>)
                            }
                        </>
                    </g>
                    {isElseExist && <Else diagnostics={diagnostics} model={ifStatement.elseBody.elseBody} />}
                    {isDefaultElseExist && <Else diagnostics={diagnostics} defaultViewState={viewState.defaultElseVS as ElseViewState} />}
                    {controlFlowLines}
                    {collapsedComponents}
                    {isElseIfExist && <IfElse model={ifStatement.elseBody.elseBody} name={componentName} />}
                    {children}
                    {!isReadOnly && pluses}
                    {drafts}
                </g>
            )
        );
    }

    return (
        <g className={conditionWrapper}>
            {component}
        </g>
    );
}
