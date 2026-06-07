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

import { ConfigOverlayFormStatus, WizardType } from "@wso2/ballerina-core";
import {
    ActionStatement,
    AssignmentStatement,
    CallStatement,
    FunctionCall,
    IdentifierToken,
    LocalVarDecl,
    NodePosition,
    QualifiedNameReference,
    SimpleNameReference,
    STKindChecker,
    STNode,
    SyncSendAction
} from "@wso2/syntax-tree";
import cn from "classnames";

import { Context } from "../../../Context/diagram";
import { getDiagnosticInfo, getMethodCallFunctionName, getOverlayFormConfig, getRandomInt, getStatementTypesFromST } from "../../../Utils";
import { BlockViewState, StatementViewState } from "../../../ViewState";
import { DraftStatementViewState } from "../../../ViewState/draft";
import { DefaultConfig } from "../../../Visitors/default";
import { DeleteBtn } from "../../DiagramActions/DeleteBtn";
import { DELETE_SVG_HEIGHT_WITH_SHADOW, DELETE_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/DeleteBtn/DeleteSVG";
import { EditBtn } from "../../DiagramActions/EditBtn";
import { EDIT_SVG_OFFSET, EDIT_SVG_WIDTH_WITH_SHADOW } from "../../DiagramActions/EditBtn/EditSVG";
import { ShowFunctionBtn } from "../../DiagramActions/ShowFunctionBtn";
import { Assignment } from "../Assignment";
import { FunctionExpand } from "../FunctionExpand";
import { MethodCall } from "../MethodCall";
import { StatementTypes } from "../StatementTypes";
import { VariableName, VARIABLE_NAME_WIDTH } from "../VariableName";

import { ProcessSVG, PROCESS_SVG_HEIGHT, PROCESS_SVG_HEIGHT_WITH_SHADOW, PROCESS_SVG_SHADOW_OFFSET, PROCESS_SVG_WIDTH, PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW } from "./ProcessSVG";
import "./style.scss";


export interface ProcessorProps {
    model: STNode;
    blockViewState?: BlockViewState;
}

export function DataProcessor(props: ProcessorProps) {
    const diagramContext = useContext(Context);
    const gotoSource = diagramContext?.api?.code?.gotoSource;
    const renderAddForm = diagramContext?.api?.edit?.renderAddForm;
    const renderEditForm = diagramContext?.api?.edit?.renderEditForm;
    const {
        syntaxTree,
        stSymbolInfo,
        isReadOnly,
    } = diagramContext.props;
    const { diagramCleanDraw } = diagramContext.actions;

    const { model, blockViewState } = props;
    const [isConfigWizardOpen, setConfigWizardOpen] = useState(false);

    const [functionBlock, setFunctionBlock] = useState(undefined);
    const [isConfirmDialogActive, setConfirmDialogActive] = useState(false);

    const viewState: StatementViewState = model === null ? blockViewState.draft[1] : model.viewState;
    const isDraftStatement: boolean = blockViewState
        && blockViewState.draft[1] instanceof DraftStatementViewState;
    let processType = "STATEMENT";
    let processName = "Variable";
    let sourceSnippet = "Source";
    const diagnostics = model?.typeData?.diagnostics;
    let haveFunction = false;
    let functionName: IdentifierToken = null;

    let isIntializedVariable = false;
    let isLogStmt = false;

    let isReferencedVariable = false;
    const diagnosticMsgs = getDiagnosticInfo(diagnostics);

    if (model) {
        processType = "Variable";
        sourceSnippet = model.source;
        if (STKindChecker.isCallStatement(model)) {
            const callStatement: CallStatement = model as CallStatement;
            const stmtFunctionCall: FunctionCall = callStatement.expression as FunctionCall;
            const nameRef: QualifiedNameReference = stmtFunctionCall.functionName as QualifiedNameReference;
            if (nameRef?.modulePrefix?.value === "log") {
                processType = "Log";
                processName = processType;
                isLogStmt = true;
            } else {
                processType = "Call";
                processName = processType;
                haveFunction = true;
                const simpleName: SimpleNameReference = stmtFunctionCall.functionName as SimpleNameReference;
                functionName = simpleName?.name;
            }
        } else if (STKindChecker.isLocalVarDecl(model)) {

            const typedBindingPattern = model?.typedBindingPattern;
            const bindingPattern = typedBindingPattern?.bindingPattern;
            if (STKindChecker.isCaptureBindingPattern(bindingPattern)) {
                processName = bindingPattern?.variableName?.value;
                isReferencedVariable = stSymbolInfo?.variableNameReferences?.size && stSymbolInfo.variableNameReferences.get(processName)?.length > 0;
            } else if (STKindChecker.isListBindingPattern(bindingPattern)) {
                // TODO: handle this type binding pattern.
            } else if (STKindChecker.isMappingBindingPattern(bindingPattern)) {
                // TODO: handle this type binding pattern.
            }

            if (model?.initializer && !STKindChecker.isImplicitNewExpression(model?.initializer)) {
                isIntializedVariable = true;
            }
            if (model?.initializer && STKindChecker.isFunctionCall(model?.initializer)) {
                const callStatement: FunctionCall = model?.initializer as FunctionCall;
                const nameRef: SimpleNameReference = callStatement.functionName as SimpleNameReference;
                haveFunction = true;
                functionName = nameRef.name;
            }
            if (model?.initializer && STKindChecker.isCheckExpression(model?.initializer)) {
                if (STKindChecker.isFunctionCall(model?.initializer.expression)) {
                    const callStatement: FunctionCall = model?.initializer.expression as FunctionCall;
                    const nameRef: SimpleNameReference = callStatement.functionName as SimpleNameReference;
                    haveFunction = true;
                    functionName = nameRef.name;
                }
            }
        } else if (STKindChecker.isAssignmentStatement(model)) {
            processType = "AssignmentStatement";
            processName = "Assignment";
            if (STKindChecker.isSimpleNameReference(model?.varRef)) {
                processName = model?.varRef?.name?.value
            }
        } else if (STKindChecker.isActionStatement(model) && model.expression.kind === 'AsyncSendAction') {
            processType = "AsyncSend";
            processName = "Send"
        } else if (STKindChecker.isActionStatement(model) && STKindChecker.isWaitAction(model.expression)
            || (STKindChecker.isActionStatement(model)
                && STKindChecker.isCheckAction(model.expression)
                && STKindChecker.isWaitAction(model.expression.expression))) {
            processType = "Wait";
            processName = "Wait"
        } else if (STKindChecker.isCheckAction(model) && STKindChecker.isWaitAction(model.expression)) {
            processType = "Wait";
            processName = "Wait"
        } else {
            processType = "Custom";
            processName = "Custom";
        }
    } else if (isDraftStatement) {
        const draftViewState = blockViewState.draft[1] as DraftStatementViewState;
        processType = draftViewState.subType;
    }
    const errorSnippet = {
        diagnosticMsgs: diagnosticMsgs?.message,
        code: sourceSnippet,
        severity: diagnosticMsgs?.severity
    }
    const h: number = viewState.dataProcess.h;
    const w: number = viewState.dataProcess.w;
    const cx: number = blockViewState ? (viewState.bBox.cx - (PROCESS_SVG_WIDTH / 2)) : (viewState.bBox.cx - (w / 2));
    const cy: number = viewState.bBox.cy;
    const variableName = (model === null ? "New " + processType : processName);

    const onCancel = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
        setConfigWizardOpen(false);
    }

    React.useEffect(() => {
        if (model === null && blockViewState) {
            const draftVS = blockViewState.draft[1];
            const overlayFormConfig = getOverlayFormConfig(draftVS.subType, draftVS.targetPosition, WizardType.NEW,
                blockViewState, undefined, stSymbolInfo);
            if (renderAddForm) {
                renderAddForm(draftVS.targetPosition, overlayFormConfig as ConfigOverlayFormStatus, onCancel);
            }
        }
    }, []);

    const onDraftDelete = () => {
        if (blockViewState) {
            blockViewState.draft = undefined;
            diagramCleanDraw(syntaxTree);
        }
    };

    // let exsitingWizard: ReactNode = null;
    const onProcessClick = () => {
        if (processType !== "PROCESS") {
            const position: NodePosition = {
                startColumn: model.position.startColumn,
                startLine: model.position.startLine
            };
            const config = {
                type: processType
            }
            const overlayFormConfig = getOverlayFormConfig(processType, model.position, WizardType.EXISTING,
                blockViewState, undefined, stSymbolInfo, model);

            diagramContext.props.onEditComponent(model, model.position, processType);

            // if (renderEditForm) {
            //     renderEditForm(model, model.position, overlayFormConfig as ConfigOverlayFormStatus, onCancel);
            // }
        }
    };

    const onClickOpenInCodeView = () => {
        if (model && gotoSource) {
            const position: NodePosition = model.position as NodePosition;
            gotoSource({ startLine: position.startLine, startColumn: position.startColumn });
        }
    }

    const toolTip = isReferencedVariable ? "Variable is referred in the code below" : undefined;
    // If only processor is a initialized variable or log stmt or draft stmt Show the edit btn other.
    // Else show the delete button only.
    const localModel = (model as LocalVarDecl);
    const editAndDeleteButtons = (
        <>
            <g>
                <DeleteBtn
                    model={model}
                    cx={viewState.bBox.cx - (DELETE_SVG_WIDTH_WITH_SHADOW) + PROCESS_SVG_WIDTH / 4}
                    cy={viewState.bBox.cy + (PROCESS_SVG_HEIGHT / 2) - (DELETE_SVG_HEIGHT_WITH_SHADOW / 3)}
                    toolTipTitle={toolTip}
                    isReferencedInCode={isReferencedVariable}
                    onDraftDelete={onDraftDelete}
                    showOnRight={true}
                />
            </g>
            <EditBtn
                model={model}
                cx={viewState.bBox.cx - (EDIT_SVG_WIDTH_WITH_SHADOW / 2) + EDIT_SVG_OFFSET}
                cy={viewState.bBox.cy + (PROCESS_SVG_HEIGHT / 4)}
                onHandleEdit={onProcessClick}
            />
        </>
    );

    let assignmentText = null;
    let statmentTypeText = null;
    let methodCallText = null;
    if (!isDraftStatement && STKindChecker?.isCallStatement(model)) {
        if (STKindChecker.isFunctionCall(model.expression)) {
            assignmentText = model.expression.arguments[0]?.source;
            processType === "Log" ?
                methodCallText = getMethodCallFunctionName(model).replace("log:print", "").trim().toLocaleLowerCase()
                : methodCallText = getMethodCallFunctionName(model);
        } else if (STKindChecker.isCheckExpression(model.expression)) {
            if (STKindChecker.isFunctionCall(model.expression.expression)) {
                assignmentText = model.expression.expression.source;
            }
        }
    } else if (!isDraftStatement && STKindChecker?.isAssignmentStatement(model)) {
        assignmentText = (model as AssignmentStatement)?.expression?.source;
        statmentTypeText = model.varRef?.typeData?.typeSymbol?.signature;
    } else if (!isDraftStatement && STKindChecker?.isLocalVarDecl(model)) {
        assignmentText = model?.initializer?.source;
        statmentTypeText = getStatementTypesFromST(localModel);
    }

    // const processWrapper = isDraftStatement ? "main-process-wrapper active-data-processor" : "main-process-wrapper data-processor";
    const assignmentTextStyles = diagnosticMsgs?.severity === "ERROR" ? "assignment-text-error" : "assignment-text-default";

    const prosessTypes = (processType === "Log" || processType === "Call");

    let leftTextOffset: number = 0;
    let rightTextOffset: number = 0;

    if (viewState.isReceive) {
        if (viewState.arrowFrom === 'Left') {
            leftTextOffset = -(PROCESS_SVG_HEIGHT / 2);
        } else {
            rightTextOffset = -(PROCESS_SVG_HEIGHT / 3);
        }
    }

    let sendTextComponent: JSX.Element;

    if (viewState.isSend) {
        sendTextComponent = (
            <Assignment
                x={viewState.arrowFrom === 'Left' ? cx - DefaultConfig.dotGap * 3 : cx + PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW / 2 + (DefaultConfig.dotGap * 3)}
                y={cy}
                assignment={
                    STKindChecker.isActionStatement(model)
                        && (STKindChecker.isSyncSendAction(model.expression)
                            || STKindChecker.isAsyncSendAction(model.expression))
                        ? ((model as ActionStatement).expression as SyncSendAction).expression.source.trim()
                        : ""
                }
                className={assignmentTextStyles}
                key_id={getRandomInt(1000)}
                textAnchor={viewState.arrowFrom === 'Left' ? 'end' : undefined}
            />
        )
    }
    const processWrapper = isDraftStatement ? cn("main-process-wrapper active-data-processor") : cn("main-process-wrapper data-processor");
    // TODO: ReEnable function expand
    // const haveFunctionExpand = (haveFunction && !!functionName);
    const haveFunctionExpand = false;
    const assignmentTextYPosition = haveFunctionExpand ?
        (cy + PROCESS_SVG_HEIGHT / 4) - (DefaultConfig.dotGap / 2)
        : (prosessTypes ? (cy + PROCESS_SVG_HEIGHT / 2) : (cy + PROCESS_SVG_HEIGHT / 3));

    const component: React.ReactNode = (!viewState.collapsed &&
        (
            <g>
                {isConfirmDialogActive && functionBlock && (
                    <FunctionExpand
                        model={functionBlock}
                        hideHeader={true}
                        x={cx + PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW / 2 + (DefaultConfig.dotGap * 3) + 10}
                        y={(cy + PROCESS_SVG_HEIGHT / 4) - (DefaultConfig.dotGap / 2)}
                    />
                )}
                <g className={processWrapper} data-testid="data-processor-block" z-index="1000" target-line={model?.position.startLine}>
                    <React.Fragment>
                        {(processType !== "Log" && processType !== "Call" && processType !== "AsyncSend") && !isDraftStatement &&
                            <>
                                {statmentTypeText &&
                                    <>
                                        <StatementTypes
                                            statementType={statmentTypeText}
                                            x={cx - (VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                                            y={cy + PROCESS_SVG_HEIGHT / 4 + leftTextOffset}
                                            key_id={getRandomInt(1000)}
                                        />
                                    </>
                                }
                                <VariableName
                                    processType={processType}
                                    variableName={processName}
                                    x={cx - (VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset)}
                                    y={cy + PROCESS_SVG_HEIGHT / 4 + leftTextOffset}
                                    key_id={getRandomInt(1000)}
                                />
                            </>
                        }
                        <ProcessSVG
                            x={cx - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                            y={cy - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                            varName={variableName}
                            processType={processType}
                            position={model?.position}
                            diagnostics={errorSnippet}
                            componentSTNode={model}
                            openInCodeView={!isReadOnly && model && model.position && onClickOpenInCodeView}
                            haveFunctionExpand={false}
                        />
                        <Assignment
                            x={cx + PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW / 2 + (DefaultConfig.dotGap * 3)}
                            y={assignmentTextYPosition + rightTextOffset}
                            assignment={assignmentText}
                            className={assignmentTextStyles}
                            key_id={getRandomInt(1000)}
                        />
                        {sendTextComponent}
                        <MethodCall
                            x={cx + PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW / 2 + (DefaultConfig.dotGap * 3)}
                            y={(cy + PROCESS_SVG_HEIGHT / 4) - (DefaultConfig.dotGap / 2)}
                            methodCall={methodCallText}
                            key_id={getRandomInt(1000)}
                        />
                        {!isReadOnly &&
                            <g
                                className="process-options-wrapper"
                                height={PROCESS_SVG_HEIGHT_WITH_SHADOW}
                                width={PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW}
                                x={cx - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                                y={cy - (PROCESS_SVG_SHADOW_OFFSET / 2)}
                            >
                                {!isConfigWizardOpen && (
                                    <>
                                        <rect
                                            x={cx + (PROCESS_SVG_WIDTH / 6.5)}
                                            y={cy + (PROCESS_SVG_HEIGHT / 3)}
                                            rx="7"
                                            className="process-rect"
                                        />
                                        {editAndDeleteButtons}
                                    </>
                                )}
                            </g>
                        }
                        {haveFunctionExpand ?
                            <g>
                                <ShowFunctionBtn
                                    model={model}
                                    functionName={functionName}
                                    x={cx + PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW / 2 + (DefaultConfig.dotGap / 2) + 3}
                                    y={(cy + PROCESS_SVG_HEIGHT / 4) - (DefaultConfig.dotGap / 2) + 5}
                                    setConfirmDialogActive={setConfirmDialogActive}
                                    isConfirmDialogActive={isConfirmDialogActive}
                                    setFunctionBlock={setFunctionBlock}
                                />
                            </g>
                            : ''
                        }
                    </React.Fragment>
                </g>
            </g>
        )
    );

    return (
        <g>
            {component}
        </g>

    );
}
