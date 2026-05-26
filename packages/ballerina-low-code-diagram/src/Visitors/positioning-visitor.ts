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
import {
    BlockStatement,
    DoStatement,
    ExpressionFunctionBody,
    ForeachStatement,
    FunctionBodyBlock,
    FunctionDefinition,
    IfElseStatement,
    ModulePart,
    NamedWorkerDeclaration,
    ObjectMethodDefinition,
    OnFailClause,
    RemoteMethodCallAction,
    ResourceAccessorDefinition,
    STKindChecker,
    STNode,
    VisibleEndpoint,
    Visitor,
    WhileStatement
} from "@wso2/syntax-tree";

import { PLUS_SVG_HEIGHT } from "../Components/PlusButtons/Plus/PlusAndCollapse/PlusSVG";
import { EXECUTION_TIME_DEFAULT_X_OFFSET, EXECUTION_TIME_IF_X_OFFSET } from "../Components/RenderingComponents/ControlFlowExecutionTime";
import { COLLAPSE_SVG_HEIGHT } from "../Components/RenderingComponents/ForEach/ColapseButtonSVG";
import { BOTTOM_CURVE_SVG_WIDTH } from "../Components/RenderingComponents/IfElse/Else/BottomCurve";
import { TOP_CURVE_SVG_HEIGHT } from "../Components/RenderingComponents/IfElse/Else/TopCurve";
import { PROCESS_SVG_HEIGHT } from "../Components/RenderingComponents/Processor/ProcessSVG";
import { START_SVG_HEIGHT, START_SVG_SHADOW_OFFSET, START_SVG_WIDTH } from "../Components/RenderingComponents/Start/StartSVG";
import { Endpoint } from "../Types/type";
import { isVarTypeDescriptor } from "../Utils";
import {
    BlockViewState,
    CollapseViewState,
    CompilationUnitViewState,
    ControlFlowExecutionTimeState,
    ControlFlowLineState,
    ElseViewState,
    EndpointViewState,
    EndViewState,
    ForEachViewState,
    FunctionViewState,
    IfViewState,
    PlusViewState,
    SimpleBBox,
    StatementViewState,
    WhileViewState
} from "../ViewState";
import { DoStatementViewState } from "../ViewState/do-statement";
import { OnFailClauseViewState } from "../ViewState/on-fail-clause";
import { WorkerDeclarationViewState } from "../ViewState/worker-declaration";

import { DefaultConfig } from "./default";
import { AsyncReceiveInfo, AsyncSendInfo, SendRecievePairInfo, WaitInfo } from "./sizing-visitor";
import { getPlusViewState, isPositionWithinRange, updateConnectorCX } from "./util";

let epCount: number = 0;

export interface WorkerHighlight {
    position: { x: number, y: number };
    highlight: boolean;
}

export class PositioningVisitor implements Visitor {
    private allEndpoints: Map<string, Endpoint> = new Map<string, Endpoint>();
    private epCount: number = 0;

    // This holds the plus widget height diff to be added to the function when its open.
    // This will be reset on every rerender.
    private plusHolderHeight: number = 0;
    private senderReceiverInfo: Map<string, { sends: AsyncSendInfo[], receives: AsyncReceiveInfo[], waits: WaitInfo[] }>;
    private workerMap: Map<string, NamedWorkerDeclaration>;
    private currentWorker: string[] = []

    constructor() {
        this.senderReceiverInfo = new Map();
        this.workerMap = new Map();
    }

    private cleanMaps() {
        this.senderReceiverInfo = new Map();
        this.currentWorker = [];
        this.workerMap = new Map();
        this.allEndpoints = new Map();
    }

    private addToSendReceiveMap(type: 'Send' | 'Receive' | 'Wait', entry: AsyncReceiveInfo | AsyncSendInfo | WaitInfo) {
        if (!this.senderReceiverInfo.has(this.currentWorker[this.currentWorker.length - 1])) {
            this.senderReceiverInfo.set(this.currentWorker[this.currentWorker.length - 1], { sends: [], receives: [], waits: [] })
        }

        switch (type) {
            case 'Send':
                this.senderReceiverInfo.get(this.currentWorker[this.currentWorker.length - 1]).sends.push(entry as AsyncSendInfo);
                break;
            case 'Receive':
                this.senderReceiverInfo.get(this.currentWorker[this.currentWorker.length - 1]).receives.push(entry as AsyncReceiveInfo);
                break;
            case 'Wait':
                this.senderReceiverInfo.get(this.currentWorker[this.currentWorker.length - 1]).waits.push(entry as WaitInfo);
                break;
        }
    }

    public beginVisitModulePart(node: ModulePart) {
        const viewState: CompilationUnitViewState = node.viewState;
        if (node.members.length === 0) {
            viewState.trigger.cx = viewState.bBox.cx + DefaultConfig.epGap / 2;
            viewState.trigger.cy = DefaultConfig.epGap / 2;
            const plusBtnViewState: PlusViewState = new PlusViewState();
            plusBtnViewState.bBox.cx = viewState.trigger.cx;
            plusBtnViewState.bBox.cy = viewState.trigger.cy;
            plusBtnViewState.expanded = false;
            viewState.initPlus = plusBtnViewState; // todo: make it an appropriate value
        }
    }

    public beginVisitFunctionDefinition(node: FunctionDefinition) {
        if (!node.functionBody) {
            return;
        }
        const viewState: FunctionViewState = node.viewState;
        const bodyViewState: BlockViewState = node.functionBody.viewState;

        viewState.wrapper.cx = viewState.bBox.x;
        viewState.wrapper.cy = viewState.bBox.y;

        const topOffSet = viewState.bBox.offsetFromTop * 7;
        viewState.bBox.cx = viewState.bBox.x + viewState.bBox.lw;
        viewState.bBox.cy = viewState.bBox.y + topOffSet;

        viewState.trigger.cx = viewState.bBox.cx;
        viewState.trigger.cy = viewState.bBox.cy;

        viewState.workerLine.x = viewState.trigger.cx;
        viewState.workerLine.y = viewState.trigger.cy + (viewState.trigger.h / 2);

        bodyViewState.bBox.cx = viewState.workerLine.x;
        bodyViewState.bBox.cy = viewState.workerLine.y + viewState.trigger.offsetFromBottom;

        viewState.end.bBox.cx = viewState.bBox.cx;
        viewState.end.bBox.cy = viewState.trigger.cy + viewState.workerLine.h + DefaultConfig.canvas.childPaddingY;

        this.currentWorker.push('function');
        this.plusHolderHeight = 0;
    }

    public beginVisitNamedWorkerDeclaration(node: NamedWorkerDeclaration) {
        const viewState: WorkerDeclarationViewState = node.viewState as WorkerDeclarationViewState;
        const bodyViewState: BlockViewState = node.workerBody.viewState as BlockViewState;

        this.workerMap.set(node.workerName.value, node);

        viewState.bBox.cx = viewState.bBox.x;
        viewState.bBox.cy = viewState.bBox.y;
        const topOffSet = viewState.bBox.offsetFromTop * 7;
        viewState.trigger.cx = viewState.bBox.cx + viewState.bBox.lw;
        viewState.trigger.cy = viewState.bBox.cy + topOffSet;

        viewState.workerLine.x = viewState.trigger.cx;
        viewState.workerLine.y = viewState.trigger.cy + (viewState.trigger.h / 2);

        bodyViewState.bBox.cx = viewState.workerLine.x;
        bodyViewState.bBox.cy = viewState.workerLine.y + viewState.trigger.offsetFromBottom;

        viewState.end.bBox.cx = viewState.bBox.cx + viewState.bBox.lw;
        viewState.end.bBox.cy = viewState.workerLine.y + viewState.workerLine.h + DefaultConfig.canvas.childPaddingY;
        // Reset the plus widget height diff.
        this.plusHolderHeight = 0;
        this.currentWorker.push(node.workerName.value);
    }

    public endVisitNamedWorkerDeclaration(node: NamedWorkerDeclaration) {
        const viewState: WorkerDeclarationViewState = node.viewState as WorkerDeclarationViewState;
        const bodyViewState: BlockViewState = node.workerBody.viewState as BlockViewState;

        if (!bodyViewState.isEndComponentAvailable && node.workerBody.statements.length <= 0) {
            const plusBtnViewState: PlusViewState = viewState.initPlus;
            if (bodyViewState.draft === undefined && plusBtnViewState) {
                plusBtnViewState.bBox.cx = viewState.trigger.cx;
                plusBtnViewState.bBox.cy = viewState.trigger.cy + (viewState.trigger.h / 2) + viewState.trigger.offsetFromBottom + (START_SVG_SHADOW_OFFSET / 4);
            }
        }

        this.currentWorker.pop();
    }

    public beginVisitResourceAccessorDefinition(node: ResourceAccessorDefinition) {
        this.beginVisitFunctionDefinition(node);
    }

    public beginVisitObjectMethodDefinition(node: ObjectMethodDefinition) {
        if (!node.functionBody) {
            return;
        }
        const viewState: FunctionViewState = node.viewState;
        const bodyViewState: BlockViewState = node.functionBody.viewState;

        viewState.wrapper.cx = viewState.bBox.x;
        viewState.wrapper.cy = viewState.bBox.y;

        const topOffSet = viewState.bBox.offsetFromTop * 7;
        viewState.bBox.cx = viewState.bBox.x + viewState.bBox.lw;
        viewState.bBox.cy = viewState.bBox.y + topOffSet;

        viewState.trigger.cx = viewState.bBox.cx;
        viewState.trigger.cy = viewState.bBox.cy;

        viewState.workerLine.x = viewState.trigger.cx;
        viewState.workerLine.y = viewState.trigger.cy + (viewState.trigger.h / 2);

        bodyViewState.bBox.cx = viewState.workerLine.x;
        bodyViewState.bBox.cy = viewState.workerLine.y + viewState.trigger.offsetFromBottom;

        viewState.end.bBox.cx = viewState.bBox.cx;
        viewState.end.bBox.cy = viewState.trigger.cy + viewState.workerLine.h + DefaultConfig.canvas.childPaddingY;
        this.currentWorker.push('function');
        this.plusHolderHeight = 0;
    }

    private updateFunctionEdgeControlFlow(viewState: FunctionViewState, body: FunctionBodyBlock) {
        // Update First Control Flow line
        if (viewState.workerBody.controlFlow.lineStates.length > 0) { // The list may contain 0 CF lines
            const startLine = viewState.workerBody.controlFlow.lineStates[0];
            const newStartLineY = viewState.trigger.cy - DefaultConfig.triggerPortalOffset.y;
            const newStartLineH = startLine.y - viewState.trigger.cy + startLine.h + DefaultConfig.triggerPortalOffset.y;
            startLine.h = newStartLineH;
            startLine.y = newStartLineY;

            if (body.statements[body.statements.length - 1].controlFlow?.isReached) {
                const endLine = viewState.workerBody.controlFlow.lineStates[viewState.workerBody.controlFlow.lineStates.length - 1];
                endLine.h = viewState.end.bBox.cy - endLine.y
            }
        }
    }

    public endVisitFunctionDefinition(node: FunctionDefinition, parent?: STNode) {
        const viewState: FunctionViewState = node.viewState;
        const bodyViewState: BlockViewState = node.functionBody.viewState;
        const body: FunctionBodyBlock = node.functionBody as FunctionBodyBlock;
        viewState.workerBody = bodyViewState;
        viewState.end.bBox.cy = viewState.workerLine.h + viewState.workerLine.y;

        // If body has no statements and doesn't have a end component
        // Add the plus button to show up on the start end
        if (!bodyViewState.isEndComponentAvailable && body.statements.length <= 0
            && (!body.namedWorkerDeclarator)) {
            const plusBtnViewState: PlusViewState = viewState.initPlus;
            if (bodyViewState.draft === undefined && plusBtnViewState) {
                plusBtnViewState.bBox.cx = viewState.trigger.cx;
                plusBtnViewState.bBox.cy = viewState.trigger.cy + (viewState.trigger.h / 2) + viewState.trigger.offsetFromBottom;
            }
        }

        let widthOfWorkers = 0;

        if (bodyViewState.hasWorkerDecl) {
            body.namedWorkerDeclarator.namedWorkerDeclarations.forEach(workerDecl => {
                widthOfWorkers += (workerDecl.viewState as WorkerDeclarationViewState).bBox.w;
            })
        }

        // Update Function container height if plus is open.
        // TODO: try to move this to the sizing visitor with a different approach.
        if ((viewState.workerLine.h + viewState.workerLine.y) < this.plusHolderHeight) {
            const plusHolderHeightDiff = this.plusHolderHeight - (viewState.workerLine.h + viewState.workerLine.y);
            viewState.bBox.h += plusHolderHeightDiff;
            this.plusHolderHeight = 0;
        }

        updateConnectorCX(bodyViewState.bBox.rw + widthOfWorkers, bodyViewState.bBox.cx, bodyViewState.connectors, viewState.trigger.cy);

        // Update First Control Flow line
        this.updateFunctionEdgeControlFlow(viewState, body);
        this.currentWorker.pop();
        this.updateSendArrowPositions(node);
        this.cleanMaps();
    }

    private updateSendArrowPositions(node: FunctionDefinition) {
        const matchedStatements: SendRecievePairInfo[] = [];

        // pair up sends with corresponding receives
        Array.from(this.senderReceiverInfo.keys()).forEach(key => {
            const workerEntry = this.senderReceiverInfo.get(key);

            workerEntry.waits.forEach((waitInfo) => {
                const sourceWorker = this.workerMap.get(waitInfo.for) as NamedWorkerDeclaration;
                if (sourceWorker) {
                    const sourceWorkerBody = sourceWorker.workerBody as BlockStatement;

                    let endViewState
                    if ((sourceWorkerBody.viewState as BlockViewState).isEndComponentAvailable) {
                        endViewState = sourceWorkerBody.statements[sourceWorkerBody.statements.length - 1].viewState
                        endViewState.hasSendLine = true;
                    } else {
                        endViewState = (sourceWorker.viewState as WorkerDeclarationViewState).end as EndViewState
                    }

                    const sourceIndex = (sourceWorkerBody.viewState as BlockViewState).isEndComponentAvailable ?
                        sourceWorkerBody.statements.length - 1
                        : sourceWorkerBody.statements.length;

                    matchedStatements.push({
                        sourceName: waitInfo.for,
                        sourceIndex: sourceIndex < 0 ? 0 : sourceIndex,
                        targetName: key,
                        sourceViewState: endViewState,
                        targetViewState: waitInfo.node.viewState,
                        targetIndex: waitInfo.index,
                    });
                }
            });
            workerEntry.sends.forEach(sendInfo => {
                if (!sendInfo.paired) {
                    const matchedReceive = this.senderReceiverInfo
                        .get(sendInfo.to)?.receives?.find(receiveInfo => receiveInfo.from === key && !receiveInfo.paired);

                    if (matchedReceive) {
                        matchedReceive.paired = true;
                        sendInfo.paired = true;

                        matchedStatements.push({
                            sourceName: key,
                            sourceIndex: sendInfo.index,
                            targetName: sendInfo.to,
                            sourceViewState: sendInfo.node.viewState,
                            targetViewState: matchedReceive.node.viewState,
                            targetIndex: matchedReceive.index
                        });
                    }
                }
            });

            workerEntry.receives.forEach(receiveInfo => {
                if (!receiveInfo.paired) {
                    const matchedSend = this.senderReceiverInfo
                        .get(receiveInfo.from)?.sends?.find(senderInfo => senderInfo.to === key && !senderInfo.paired)

                    if (matchedSend) {
                        matchedSend.paired = true;
                        receiveInfo.paired = true;

                        matchedStatements.push({
                            sourceName: receiveInfo.from,
                            sourceIndex: matchedSend.index,
                            sourceViewState: matchedSend.node.viewState,
                            targetName: matchedSend.to,
                            targetIndex: receiveInfo.index,
                            targetViewState: receiveInfo.node.viewState
                        });
                    }
                }
            });

        });

        (node.functionBody.viewState as BlockViewState).workerArrows = [];

        // assign position values to send lines
        matchedStatements.forEach(matchedPair => {
            const sourceViewState = matchedPair.sourceViewState as StatementViewState;
            const targetViewState = matchedPair.targetViewState as StatementViewState;

            const line = new SimpleBBox();
            line.x = sourceViewState.bBox.cx + (targetViewState.bBox.cx > sourceViewState.bBox.cx ? 60 / 2 : -60 / 2);
            line.y = sourceViewState.bBox.cy + PROCESS_SVG_HEIGHT / 2;
            line.w = targetViewState.bBox.cx - sourceViewState.bBox.cx + (targetViewState.bBox.cx > sourceViewState.bBox.cx ? -70 : 70);

            (node.functionBody.viewState as BlockViewState).workerArrows.push(line);
        });

    }

    public endVisitResourceAccessorDefinition(node: ResourceAccessorDefinition) {
        // ToDo: Check if this function call is necessary
        // this.updateFunctionEdgeControlFlow(viewState, body);
        this.endVisitFunctionDefinition(node);
    }

    public endVisitObjectMethodDefinition(node: ObjectMethodDefinition) {
        const viewState: FunctionViewState = node.viewState;
        const bodyViewState: BlockViewState = node.functionBody.viewState;
        const body: FunctionBodyBlock = node.functionBody as FunctionBodyBlock;
        viewState.workerBody = bodyViewState;
        viewState.end.bBox.cy = viewState.workerLine.h + viewState.workerLine.y;

        // If body has no statements and doesn't have a end component
        // Add the plus button to show up on the start end
        if (!bodyViewState.isEndComponentAvailable && body.statements.length <= 0
            && (!body.namedWorkerDeclarator)) {
            const plusBtnViewState: PlusViewState = viewState.initPlus;
            if (bodyViewState.draft === undefined && plusBtnViewState) {
                plusBtnViewState.bBox.cx = viewState.trigger.cx;
                plusBtnViewState.bBox.cy = viewState.trigger.cy + (viewState.trigger.h / 2) + viewState.trigger.offsetFromBottom;
            }
        }


        let widthOfWorkers = 0;

        if (bodyViewState.hasWorkerDecl) {
            body.namedWorkerDeclarator.namedWorkerDeclarations.forEach(workerDecl => {
                widthOfWorkers += (workerDecl.viewState as WorkerDeclarationViewState).bBox.w;
            })
        }

        // Update Function container height if plus is open.
        // TODO: try to move this to the sizing visitor with a different approach.
        if ((viewState.workerLine.h + viewState.workerLine.y) < this.plusHolderHeight) {
            const plusHolderHeightDiff = this.plusHolderHeight - (viewState.workerLine.h + viewState.workerLine.y);
            viewState.bBox.h += plusHolderHeightDiff;
            this.plusHolderHeight = 0;
        }

        updateConnectorCX(bodyViewState.bBox.rw + widthOfWorkers, bodyViewState.bBox.cx, bodyViewState.connectors, viewState.trigger.cy);

        // Update First Control Flow line
        this.updateFunctionEdgeControlFlow(viewState, body);
        this.currentWorker.pop();
        this.updateSendArrowPositions(node);
        this.cleanMaps();
    }

    public beginVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode) {
        const blockViewState: BlockViewState = node.viewState;
        const functionViewState: FunctionViewState = parent?.viewState as FunctionViewState;
        const functionTrigger = functionViewState?.trigger;
        this.allEndpoints = blockViewState.connectors;
        epCount = 0;
        let height = 0;
        let index = 0;

        if (blockViewState.hasWorkerDecl) {
            const workerInitStatements = (node as FunctionBodyBlock).namedWorkerDeclarator.workerInitStatements;
            ({ height, index } = this.calculateStatementPosition(
                workerInitStatements,
                blockViewState, height, index, DefaultConfig.epGap));

            blockViewState.workerIndicatorLine.y = blockViewState.bBox.cy + height + functionTrigger.offsetFromBottom
                + START_SVG_HEIGHT / 2;
            blockViewState.workerIndicatorLine.x = blockViewState.bBox.cx;

            (node as FunctionBodyBlock).namedWorkerDeclarator.namedWorkerDeclarations.forEach((workerDecl, i) => {
                const workerDeclViewState = workerDecl.viewState as WorkerDeclarationViewState;
                const workerBodyViewState = workerDecl.workerBody.viewState as BlockViewState;

                workerDeclViewState.bBox.x = i === 0 ?
                    blockViewState.bBox.rw + workerBodyViewState.bBox.lw
                    : (node as FunctionBodyBlock).namedWorkerDeclarator.namedWorkerDeclarations[i - 1].viewState.bBox.x
                    + (node as FunctionBodyBlock).namedWorkerDeclarator.namedWorkerDeclarations[i - 1].viewState.bBox.rw
                    + workerBodyViewState.bBox.lw;
                workerDeclViewState.bBox.y = height + functionTrigger.offsetFromBottom * 2 + START_SVG_HEIGHT;
            });


            // positioning for plus button before worker block
            const plusForIndex = getPlusViewState(index + node.statements.length + 1, blockViewState.plusButtons)

            if (plusForIndex) {
                plusForIndex.bBox.cy = blockViewState.bBox.cy + height;
                plusForIndex.bBox.cx = blockViewState.bBox.cx;
            }

            height += START_SVG_HEIGHT + (functionTrigger.offsetFromBottom * 2);
        }

        this.beginBlockPosition(node as BlockStatement, index + node.statements.length, height, index);
    }

    public endVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode): void {
        const bodyViewState = node.viewState as BlockViewState;
        // line width should be to the extent of last worker
        if (bodyViewState.hasWorkerDecl) {
            const workerDecl = node.namedWorkerDeclarator.namedWorkerDeclarations[node.namedWorkerDeclarator.namedWorkerDeclarations.length - 1];
            const workerDeclVS = workerDecl.viewState as WorkerDeclarationViewState;

            bodyViewState.workerIndicatorLine.w = workerDeclVS.trigger.cx - bodyViewState.workerIndicatorLine.x;

            (node as FunctionBodyBlock).namedWorkerDeclarator.namedWorkerDeclarations.forEach(workerDeclarator => {
                const workerBodyViewState = workerDeclarator.workerBody.viewState as BlockViewState;

                if (workerDeclarator.workerBody.controlFlow?.isReached) {
                    const workerLine: ControlFlowLineState = {
                        x: bodyViewState.workerIndicatorLine.x,
                        y: bodyViewState.workerIndicatorLine.y,
                        w: workerBodyViewState.bBox.cx - bodyViewState.workerIndicatorLine.x - (START_SVG_WIDTH / 2),
                        isDotted: true
                    };
                    workerBodyViewState.controlFlow.lineStates.push(workerLine);
                }
                const lastStatement = workerDeclarator.workerBody.statements[workerDeclarator.workerBody.statements.length - 1];
                if (lastStatement && STKindChecker.isReturnStatement(lastStatement) && lastStatement.controlFlow?.isReached) {
                    const lastStatementBBox = lastStatement.viewState.bBox;
                    const bottomLine: ControlFlowLineState = {
                        x: lastStatementBBox.cx,
                        y: lastStatementBBox.cy + PROCESS_SVG_HEIGHT / 2,
                        w: bodyViewState.workerIndicatorLine.x - workerBodyViewState.bBox.cx + 35,
                        isArrowed: true
                    };
                    workerBodyViewState.controlFlow.lineStates.push(bottomLine);
                }
            });
        }
    }

    public beginVisitExpressionFunctionBody(node: ExpressionFunctionBody) {
        const blockViewState: BlockViewState = node.viewState;
        this.allEndpoints = blockViewState.connectors;
        epCount = 0;
    }

    private beginBlockPosition(node: BlockStatement, lastStatementIndex: number, height: number = 0, index: number = 0) {
        const blockViewState: BlockViewState = node.viewState;
        const epGap = DefaultConfig.epGap;
        // Clean rendered labels
        blockViewState.controlFlow.executionTimeStates = [];
        blockViewState.controlFlow.lineStates = [];

        ({ height, index } = this.calculateStatementPosition(node.statements, blockViewState, height, index, epGap));

        if (!blockViewState.isEndComponentAvailable
            && node.statements.length > 0 && node.statements[node.statements.length - 1]?.controlFlow?.isReached) {
            const lastStatement = node.statements[node.statements.length - 1];
            if (!(node.viewState as BlockViewState).isElseBlock) {
                //  Adding last control flow line after last statement for any block
                let lastLineY;
                if (STKindChecker.isIfElseStatement(lastStatement)) {
                    // For IfElse statements, the starting position of the end line starts at the bottom of last statement
                    lastLineY = lastStatement.viewState.bBox.cy + lastStatement.viewState.bBox.h -
                        blockViewState.bBox.offsetFromTop - blockViewState.bBox.offsetFromBottom;
                } else {
                    lastLineY = lastStatement.viewState.bBox.cy
                }
                const lastLine: ControlFlowLineState = {
                    x: lastStatement.viewState.bBox.cx,
                    y: lastLineY,
                    h: blockViewState.bBox.cy + blockViewState.bBox.offsetFromTop + height - lastLineY,
                };
                blockViewState.controlFlow.lineStates.push(lastLine);
            } else {
                //  Adding last control flow line after last statement for else block
                if (!STKindChecker.isReturnStatement(lastStatement)) {
                    const endLineY = STKindChecker.isIfElseStatement(lastStatement)
                        ? lastStatement.viewState.bBox.cy + lastStatement.viewState.bBox.h
                        : lastStatement.viewState.bBox.cy;
                    const lastLine: ControlFlowLineState = {
                        x: lastStatement.viewState.bBox.cx,
                        y: endLineY,
                        h: blockViewState.bBox.cy + height - endLineY,
                    }
                    blockViewState.controlFlow.lineStates.push(lastLine);
                }
            }
        }

        // Get the last plus view state
        const plusViewState: PlusViewState = getPlusViewState(lastStatementIndex, blockViewState.plusButtons);

        if (blockViewState.draft && blockViewState.draft[0] === lastStatementIndex) {
            const draft = blockViewState.draft[1];
            if (draft) {
                draft.bBox.cx = blockViewState.bBox.cx;
                draft.bBox.cy = (blockViewState.bBox.cy + blockViewState.bBox.offsetFromTop + height);
                height += draft.getHeight();
            }
        }

        if (plusViewState && plusViewState.expanded) {
            // Set plus widget height when it opens
            // So we can calculate how much function should expand to accomodate that.
            this.plusHolderHeight = DefaultConfig.PLUS_HOLDER_STATEMENT_HEIGHT + plusViewState.bBox.cy;

            plusViewState.bBox.cx = blockViewState.bBox.cx;
        } else if (plusViewState && plusViewState.collapsedPlusDuoExpanded) {
            plusViewState.bBox.cx = blockViewState.bBox.cx;
            plusViewState.collapsedPlusDuoExpanded = false;
        } else if (plusViewState) {
            plusViewState.bBox.cy = blockViewState.bBox.cy + blockViewState.bBox.h;
            plusViewState.bBox.cx = blockViewState.bBox.cx;
        }
        blockViewState.bBox.h = height;
    }

    public beginVisitBlockStatement(node: BlockStatement) {
        this.beginBlockPosition(node, node.statements.length);
    }

    private calculateStatementPosition(statements: STNode[], blockViewState: BlockViewState, height: number, index: number, epGap: number) {
        let collapsedViewStates: CollapseViewState[] = [...blockViewState.collapsedViewStates];
        let controlFlowIndex: number = 0;

        statements.forEach((statement) => {
            const statementViewState: StatementViewState = statement.viewState;

            // Assign cy of the expanded function to each statement
            statementViewState.expandOffSet = blockViewState.expandOffSet;

            statementViewState.bBox.cx = blockViewState.bBox.cx;
            statementViewState.bBox.cy = blockViewState.bBox.cy + statementViewState.bBox.offsetFromTop + height;

            for (let i = 0; i < collapsedViewStates.length; i++) {
                if (isPositionWithinRange(statement.position, collapsedViewStates[i].range)) {
                    collapsedViewStates[i].bBox.cx = blockViewState.bBox.cx - collapsedViewStates[i].bBox.lw;

                    if (collapsedViewStates[i].collapsed) {
                        collapsedViewStates[i].bBox.cy = blockViewState.bBox.cy + collapsedViewStates[i].bBox.offsetFromTop + height;
                        height += collapsedViewStates[i].getHeight();
                    } else {
                        collapsedViewStates[i].bBox.cy = statementViewState.bBox.cy - statementViewState.bBox.offsetFromTop;
                        collapsedViewStates[i].bBox.h = -COLLAPSE_SVG_HEIGHT / 3;
                    }

                    collapsedViewStates = [...collapsedViewStates.slice(0, i), ...collapsedViewStates.slice(i + 1)];
                    break;
                }
            }

            const plusForIndex: PlusViewState = getPlusViewState(index, blockViewState.plusButtons);

            if (blockViewState.draft && blockViewState.draft[0] === index) {
                const draft = blockViewState.draft[1];
                if (draft) {
                    draft.bBox.cx = statementViewState.bBox.cx;
                    draft.bBox.cy = statementViewState.bBox.cy;
                    statementViewState.bBox.cy += draft.getHeight();
                    height += draft.getHeight();
                }
            }

            if (STKindChecker.isActionStatement(statement)) {
                if (statement.expression.kind === 'AsyncSendAction') {
                    const sendExpression: any = statement.expression;
                    const targetName: string = sendExpression.peerWorker?.name?.value as string;
                    this.addToSendReceiveMap('Send', {
                        to: targetName, node: statement, paired: false, index: (index)
                    });
                } else if (STKindChecker.isWaitAction(statement.expression)
                    && STKindChecker.isSimpleNameReference(statement.expression.waitFutureExpr)) {
                    this.addToSendReceiveMap('Wait', {
                        for: statement.expression.waitFutureExpr.name.value,
                        node: statement,
                        index: (index)
                    });
                } else if (STKindChecker.isCheckAction(statement.expression)
                    && STKindChecker.isWaitAction(statement.expression.expression)
                    && STKindChecker.isSimpleNameReference(statement.expression.expression.waitFutureExpr)) {
                    this.addToSendReceiveMap('Wait', {
                        for: statement.expression.expression.waitFutureExpr.name.value,
                        node: statement,
                        index: (index)
                    });
                }
            } else if (STKindChecker.isLocalVarDecl(statement) && statement.initializer) {
                if (statement.initializer?.kind === 'ReceiveAction') {
                    const receiverExpression: any = statement.initializer;
                    const senderName: string = receiverExpression.receiveWorkers?.name?.value;
                    this.addToSendReceiveMap('Receive',
                        { from: senderName, node: statement, paired: false, index: (index) });
                } else if (STKindChecker.isCheckAction(statement.initializer)
                    && (statement.initializer.expression.kind === 'ReceiveAction')) {
                    const receiverExpression: any = statement.initializer.expression;
                    const senderName: string = receiverExpression.receiveWorkers?.name?.value;

                    this.addToSendReceiveMap('Receive',
                        { from: senderName, node: statement, paired: false, index: (index) });
                } else if (STKindChecker.isWaitAction(statement.initializer)
                    && STKindChecker.isSimpleNameReference(statement.initializer.waitFutureExpr)) {
                    this.addToSendReceiveMap('Wait', {
                        for: statement.initializer.waitFutureExpr.name.value,
                        node: statement,
                        index: (index)
                    });
                } else if (STKindChecker.isCheckAction(statement.initializer)
                    && STKindChecker.isWaitAction(statement.initializer.expression)
                    && STKindChecker.isSimpleNameReference(statement.initializer.expression.waitFutureExpr)) {
                    this.addToSendReceiveMap('Wait', {
                        for: statement.initializer.expression.waitFutureExpr.name.value,
                        node: statement,
                        index: (index)
                    });
                }
            } else if (STKindChecker.isAssignmentStatement(statement)) {
                if (statement.expression?.kind === 'ReceiveAction') {
                    const receiverExpression: any = statement.expression;
                    const senderName: string = receiverExpression.receiveWorkers?.name?.value;
                    this.addToSendReceiveMap('Receive',
                        { from: senderName, node: statement, paired: false, index: (index) });
                } else if (STKindChecker.isCheckAction(statement.expression)
                    && (statement.expression.expression.kind === 'ReceiveAction')) {
                    const receiverExpression: any = statement.expression.expression;
                    const senderName: string = receiverExpression.receiveWorkers?.name?.value;

                    this.addToSendReceiveMap('Receive',
                        { from: senderName, node: statement, paired: false, index: (index) });
                } else if (STKindChecker.isWaitAction(statement.expression)
                    && STKindChecker.isSimpleNameReference(statement.expression.waitFutureExpr)) {
                    this.addToSendReceiveMap('Wait', {
                        for: statement.expression.waitFutureExpr.name.value,
                        node: statement,
                        index: (index)
                    });
                } else if (STKindChecker.isCheckAction(statement.expression)
                    && STKindChecker.isWaitAction(statement.expression.expression)
                    && STKindChecker.isSimpleNameReference(statement.expression.expression.waitFutureExpr)) {
                    this.addToSendReceiveMap('Wait', {
                        for: statement.expression.expression.waitFutureExpr.name.value,
                        node: statement,
                        index: (index)
                    });
                }
            } else if (STKindChecker.isReturnStatement(statement) && statement.expression
                && STKindChecker.isWaitAction(statement.expression) && statement.expression.waitFutureExpr
                && STKindChecker.isSimpleNameReference(statement.expression.waitFutureExpr)) {
                this.addToSendReceiveMap('Wait', {
                    for: statement.expression.waitFutureExpr.name.value,
                    node: statement,
                    index: (index)
                });
            }

            // Control flow execution time
            if (statement?.controlFlow?.executionTime !== undefined) {
                const isIf = STKindChecker.isIfElseStatement(statement);
                // Neglect if width due to drawing lines in left side
                const offsetX = (isIf ? EXECUTION_TIME_IF_X_OFFSET : (statementViewState.bBox.lw) + EXECUTION_TIME_DEFAULT_X_OFFSET);
                let offsetY;
                if (STKindChecker.isIfElseStatement(statement)) {
                    offsetY = (statementViewState as IfViewState).headIf.h / 2;
                } else if (STKindChecker.isForeachStatement(statement)) {
                    offsetY = (statementViewState as ForEachViewState).foreachHead.h / 2;
                } else if (STKindChecker.isWhileStatement(statement)) {
                    offsetY = (statementViewState as WhileViewState).whileHead.h / 2;
                }

                const executionTime: ControlFlowExecutionTimeState = {
                    x: blockViewState.bBox.cx - offsetX,
                    y: statementViewState.bBox.cy + offsetY,
                    h: statementViewState.bBox.h - (statementViewState.bBox.offsetFromBottom + statementViewState.bBox.offsetFromTop + offsetY),
                    value: statement.controlFlow?.executionTime
                };
                blockViewState.controlFlow.executionTimeStates.push(executionTime);
            }
            // Add control flow line above each statement
            if (statement?.controlFlow?.isReached) {
                const controlFlowLineState: ControlFlowLineState = {
                    x: 0,
                    y: 0,
                    h: 0
                };
                if (controlFlowIndex === 0) {
                    controlFlowLineState.x = blockViewState.bBox.cx;
                    controlFlowLineState.y = blockViewState.bBox.cy - blockViewState.bBox.offsetFromBottom;
                    controlFlowLineState.h = statementViewState.bBox.cy - controlFlowLineState.y;
                } else if (controlFlowIndex <= statements.length) {
                    const previousStatementViewState: StatementViewState = statements[controlFlowIndex - 1].viewState;
                    controlFlowLineState.x = statementViewState.bBox.cx;
                    if (STKindChecker.isIfElseStatement(statements[controlFlowIndex - 1])) {
                        controlFlowLineState.y = previousStatementViewState.bBox.cy + previousStatementViewState.bBox.h - previousStatementViewState.bBox.offsetFromBottom - statementViewState.bBox.offsetFromTop;
                        controlFlowLineState.h = statementViewState.bBox.cy - controlFlowLineState.y + previousStatementViewState.bBox.offsetFromBottom + statementViewState.bBox.offsetFromTop;
                    } else {
                        controlFlowLineState.y = previousStatementViewState.bBox.cy;
                        controlFlowLineState.h = statementViewState.bBox.cy - controlFlowLineState.y;
                    }

                }
                blockViewState.controlFlow.lineStates.push(controlFlowLineState);
                statementViewState.isReached = true;
            }

            if (blockViewState.collapsedFrom === index && blockViewState.collapseView) {
                blockViewState.collapseView.bBox.cx = statementViewState.bBox.cx;
                blockViewState.collapseView.bBox.cy = statementViewState.bBox.cy;
                height += blockViewState.collapseView.bBox.h;
                if (plusForIndex?.collapsedPlusDuoExpanded && !plusForIndex.collapsedClicked) {
                    blockViewState.collapseView.bBox.cy += PLUS_SVG_HEIGHT;
                } else if (plusForIndex?.expanded && !plusForIndex.collapsedClicked) {
                    // Set plus widget height when it opens
                    // So we can calculate how much function should expand to accomodate that.
                    this.plusHolderHeight = DefaultConfig.PLUS_HOLDER_STATEMENT_HEIGHT + plusForIndex.bBox.cy;
                } else {
                    // updating cy of plus since it get ignored once the collapsed statement is reached
                    plusForIndex.bBox.cy = blockViewState.collapseView.bBox.cy - blockViewState.collapseView.bBox.offsetFromTop;
                }
                plusForIndex.bBox.cx = blockViewState.bBox.cx;
            } else {
                if (plusForIndex && plusForIndex.expanded) {
                    // Set plus widget height when it opens
                    // So we can calculate how much function should expand to accomodate that.
                    this.plusHolderHeight = DefaultConfig.PLUS_HOLDER_STATEMENT_HEIGHT + plusForIndex.bBox.cy;
                } else if (plusForIndex && plusForIndex.collapsedPlusDuoExpanded) {
                    plusForIndex.bBox.cx = blockViewState.bBox.cx;
                    statementViewState.bBox.cy += PLUS_SVG_HEIGHT;
                    height += PLUS_SVG_HEIGHT;
                } else if (plusForIndex) {
                    plusForIndex.bBox.cy = statementViewState.bBox.cy - statementViewState.bBox.offsetFromTop;
                    plusForIndex.bBox.cx = blockViewState.bBox.cx;
                }

                // statementViewState.collapsed is to check for collapsed action invocations and
                // ignore if it is collapsed
                if (statementViewState.isAction && statementViewState.action.endpointName
                    && !statementViewState.isCallerAction && !statementViewState.collapsed &&
                    !statementViewState.hidden && this.allEndpoints.get(statementViewState.action.endpointName)) {
                    // action invocation for a connector ( var result1 = ep1->get("/context") )
                    const endpoint: Endpoint = this.allEndpoints.get(statementViewState.action.endpointName);
                    const visibleEndpoint: VisibleEndpoint = endpoint.visibleEndpoint as VisibleEndpoint;
                    const mainEp: EndpointViewState = visibleEndpoint.viewState;
                    statementViewState.endpoint.typeName = visibleEndpoint.typeName;

                    // Set action trigger box cx point to match life line cx
                    // Set action trigger box cy point to match action invocation statement cy
                    statementViewState.action.trigger.cx = mainEp.lifeLine.cx;
                    statementViewState.action.trigger.cy = statementViewState.bBox.cy;

                    if ((endpoint?.visibleEndpoint as any)?.isExternal && !endpoint.firstAction) {
                        statementViewState.endpoint = mainEp;
                        // Add endpoint in to the action view statement.
                        const endpointViewState: EndpointViewState = statementViewState.endpoint;
                        endpointViewState.typeName = visibleEndpoint.typeName;

                        // to identify a connector init ( http:Client ep1 = new ("/context") )
                        endpointViewState.lifeLine.cx = blockViewState.bBox.cx +
                            endpointViewState.bBox.rw + epGap + (epGap * this.epCount); // (endpointViewState.bBox.w / 2)
                        endpointViewState.lifeLine.cy = statementViewState.bBox.cy - (DefaultConfig.connectorLine.gap);
                        endpointViewState.isExternal = (endpoint.visibleEndpoint as any)?.isExternal;
                        visibleEndpoint.viewState = endpointViewState;

                        this.epCount++;
                    } else if (STKindChecker.isLocalVarDecl(statement) &&
                        STKindChecker.isCheckAction(statement.initializer) &&
                        (statement.initializer?.expression as RemoteMethodCallAction).expression.typeData?.symbol?.kind === "PARAMETER" &&
                        !endpoint.firstAction) {
                        // Add parameter level endpoints to the action view statement.
                        statementViewState.endpoint = mainEp;
                        const endpointViewState: EndpointViewState = statementViewState.endpoint;
                        endpointViewState.typeName = visibleEndpoint.typeName;
                        endpointViewState.lifeLine.cx = blockViewState.bBox.cx +
                            endpointViewState.bBox.rw + epGap + (epGap * this.epCount);
                        endpointViewState.lifeLine.cy = statementViewState.bBox.cy;
                        // NOTE: we can remove this section after Ballerina release with these changes ballerina-lang/pull/35604
                        endpointViewState.isExternal = true;
                        endpointViewState.isParameter = true;
                        visibleEndpoint.viewState = endpointViewState;

                        this.epCount++;
                    }

                    // to check whether the action is invoked for the first time
                    if (!endpoint.firstAction) {
                        endpoint.firstAction = statementViewState;
                        mainEp.isUsed = true;
                        mainEp.lifeLine.h = statementViewState.action.trigger.cy - mainEp.lifeLine.cy + statementViewState.action.trigger.h + DefaultConfig.connectorLine.gap;
                    } else if (mainEp.lifeLine.cy > statementViewState.bBox.cy) {
                        // To catch the endpoints define at the function block and used after a child block
                        mainEp.lifeLine.h = mainEp.lifeLine.cy - statementViewState.bBox.cy + statementViewState.action.trigger.h + DefaultConfig.connectorLine.gap;
                        // mainEp.lifeLine.cy = statementViewState.bBox.cy;
                    } else if ((mainEp.lifeLine.h + mainEp.lifeLine.cy) < (statementViewState.action.trigger.cy)) {
                        // to skip updating EP heights which less than the current EP height
                        mainEp.lifeLine.h = statementViewState.action.trigger.cy - mainEp.lifeLine.cy + statementViewState.action.trigger.h + DefaultConfig.connectorLine.gap;
                    }
                    // let maxOffSet = 0;
                    // endpoint.actions.forEach((action) => {
                    //     if (action.expandOffSet > maxOffSet) {
                    //         maxOffSet = action.expandOffSet;
                    //     }
                    // });
                    endpoint.actions.push(statementViewState);
                }

                if (statementViewState.isEndpoint && statementViewState.endpoint.epName) {
                    const endpointViewState: EndpointViewState = statementViewState.endpoint;
                    // to identify a connector init ( http:Client ep1 = new ("/context") )
                    endpointViewState.lifeLine.cx = blockViewState.bBox.cx +
                        endpointViewState.bBox.rw + epGap + (epGap * this.epCount);
                    endpointViewState.lifeLine.cy = statementViewState.bBox.cy;
                    const endpoint: Endpoint = this.allEndpoints.get(statementViewState.endpoint.epName);
                    if (endpoint) {
                        const visibleEndpoint: VisibleEndpoint = endpoint?.visibleEndpoint;
                        const mainEp = endpointViewState;
                        visibleEndpoint.viewState = mainEp;
                        this.epCount++;
                    }
                }

                if ((statementViewState.isEndpoint && statementViewState.isAction && !statementViewState.hidden)
                    || (!statementViewState.collapsed)) {
                    height += statementViewState.getHeight();
                    for (const collapsedViewState of blockViewState.collapsedViewStates) {
                        if (!collapsedViewState.collapsed
                            && isPositionWithinRange(statement.position, collapsedViewState.range)) {
                            collapsedViewState.bBox.h += statementViewState.getHeight();
                            break;
                        }
                    }
                }
            }
            ++index;
            ++controlFlowIndex;
        });
        return { height, index };
    }

    public beginVisitForeachStatement(node: ForeachStatement) {
        const bodyViewState: BlockViewState = node.blockStatement.viewState;
        const viewState: ForEachViewState = node.viewState;
        viewState.foreachBody = bodyViewState;

        viewState.foreachHead.cx = viewState.bBox.cx;
        viewState.foreachHead.cy = viewState.bBox.cy + (viewState.foreachHead.h / 2);

        viewState.foreachLifeLine.cx = viewState.bBox.cx;
        viewState.foreachLifeLine.cy = viewState.foreachHead.cy + (viewState.foreachHead.h / 2);

        viewState.foreachBody.bBox.cx = viewState.foreachHead.cx;
        viewState.foreachBody.bBox.cy = viewState.foreachHead.cy + (viewState.foreachHead.h / 2) + viewState.foreachHead.offsetFromBottom;

        viewState.foreachBodyRect.cx = viewState.foreachHead.cx;
        viewState.foreachBodyRect.cy = viewState.foreachHead.cy;
    }

    public beginVisitWhileStatement(node: WhileStatement) {
        const bodyViewState: BlockViewState = node.whileBody.viewState;
        const viewState: WhileViewState = node.viewState;
        viewState.whileBody = bodyViewState;

        viewState.whileHead.cx = viewState.bBox.cx;
        viewState.whileHead.cy = viewState.bBox.cy + (viewState.whileHead.h / 2);

        viewState.whileLifeLine.cx = viewState.bBox.cx;
        viewState.whileLifeLine.cy = viewState.whileHead.cy + (viewState.whileHead.h / 2);

        viewState.whileBody.bBox.cx = viewState.whileHead.cx;
        viewState.whileBody.bBox.cy = viewState.whileHead.cy + (viewState.whileHead.h / 2) + viewState.whileHead.offsetFromBottom;

        viewState.whileBodyRect.cx = viewState.whileHead.cx;
        viewState.whileBodyRect.cy = viewState.whileHead.cy;
    }

    public endVisitForeachStatement(node: ForeachStatement) {
        this.updateLoopEdgeControlFlow(node.viewState.foreachBody, node.viewState.foreachLifeLine);
    }

    public endVisitWhileStatement(node: WhileStatement) {
        this.updateLoopEdgeControlFlow(node.viewState.whileBody, node.viewState.whileLifeLine);
    }

    public updateLoopEdgeControlFlow(bodyViewState: BlockViewState, lifeLine: SimpleBBox) {
        const controlFlowLines = bodyViewState.controlFlow.lineStates;
        if (controlFlowLines.length > 0) { // The list may contain 0 CF lines
            const endLine = controlFlowLines[controlFlowLines.length - 1];
            endLine.h = lifeLine.cy + lifeLine.h - endLine.y
        }
    }

    public beginVisitDoStatement(node: DoStatement, parent?: STNode): void {
        const viewState: DoStatementViewState = node.viewState as DoStatementViewState;
        const doBodyVS = viewState.doBodyVS;
        const onFailBodyVS = viewState.onFailBodyVS;
        const doBlockLifeLine = viewState.doBodyLifeLine;

        viewState.doHeadVS.cx = viewState.bBox.cx;
        viewState.doHeadVS.cy = viewState.bBox.cy + (viewState.doHeadVS.h / 2);

        doBlockLifeLine.cx = viewState.bBox.cx;
        doBlockLifeLine.cy = viewState.doHeadVS.cy + (viewState.doHeadVS.h / 2);

        doBodyVS.bBox.cx = viewState.bBox.cx;
        doBodyVS.bBox.cy = viewState.doHeadVS.cy + (viewState.doHeadVS.h / 2) + viewState.doHeadVS.offsetFromBottom;

        onFailBodyVS.bBox.cx = viewState.bBox.cx;
        onFailBodyVS.bBox.cy = doBodyVS.bBox.cy + doBodyVS.bBox.h + DefaultConfig.offSet;
    }

    public beginVisitOnFailClause(node: OnFailClause, parent?: STNode) {
        const viewState: OnFailClauseViewState = node.viewState as OnFailClauseViewState;
        // const statementsBlockVS: BlockViewState = node.blockStatement.viewState as BlockViewState;
        const onFailBlockVS = viewState.onFailBodyVS;
        const onFailLifeLine = viewState.onFailBodyLifeLine;
        viewState.onFailHeadVS.cx = viewState.bBox.cx;
        viewState.onFailHeadVS.cy = viewState.bBox.cy + (viewState.onFailHeadVS.h / 2);

        onFailLifeLine.cx = viewState.bBox.cx;
        onFailLifeLine.cy = viewState.onFailHeadVS.cy + (viewState.onFailHeadVS.h / 2);

        onFailBlockVS.bBox.cx = viewState.bBox.cx;
        onFailBlockVS.bBox.cy = viewState.onFailHeadVS.cy + (viewState.onFailHeadVS.h / 2) + viewState.onFailHeadVS.offsetFromBottom;
    }

    public beginVisitIfElseStatement(node: IfElseStatement) {
        const viewState: IfViewState = node.viewState as IfViewState;
        const ifBodyViewState: BlockViewState = node.ifBody.viewState as BlockViewState;

        viewState.headIf.cx = viewState.bBox.cx;
        viewState.headIf.cy = viewState.bBox.cy + (viewState.headIf.h / 2);

        ifBodyViewState.bBox.cx = viewState.bBox.cx;
        ifBodyViewState.bBox.cy = viewState.headIf.cy + (viewState.headIf.h / 2) + viewState.headIf.offsetFromBottom;

        if (node.elseBody) {
            if (node.elseBody.elseBody.kind === "BlockStatement") {
                const elseViewStatement: ElseViewState = node.elseBody.elseBody.viewState as ElseViewState;

                elseViewStatement.elseTopHorizontalLine.x = viewState.bBox.cx + elseViewStatement.ifHeadWidthOffset;
                elseViewStatement.elseTopHorizontalLine.y = viewState.bBox.cy + elseViewStatement.ifHeadHeightOffset;

                elseViewStatement.bBox.cx = elseViewStatement.elseTopHorizontalLine.x +
                    elseViewStatement.elseTopHorizontalLine.length;
                elseViewStatement.bBox.cy = ifBodyViewState.bBox.cy;

                elseViewStatement.elseBody.x = elseViewStatement.bBox.cx;
                elseViewStatement.elseBody.y = elseViewStatement.elseTopHorizontalLine.y;

                elseViewStatement.elseBottomHorizontalLine.x = viewState.bBox.cx;
                elseViewStatement.elseBottomHorizontalLine.y = elseViewStatement.elseBody.y +
                    elseViewStatement.elseBody.length;

            } else if (node.elseBody.elseBody.kind === "IfElseStatement") {
                const elseIfStmt: IfElseStatement = node.elseBody.elseBody as IfElseStatement;
                const elseIfViewState: IfViewState = elseIfStmt.viewState;

                elseIfViewState.elseIfTopHorizontalLine.x = viewState.bBox.cx + elseIfViewState.elseIfHeadWidthOffset;
                elseIfViewState.elseIfTopHorizontalLine.y = viewState.bBox.cy + elseIfViewState.elseIfHeadHeightOffset;

                elseIfViewState.bBox.cx = elseIfViewState.elseIfTopHorizontalLine.x
                    + elseIfViewState.elseIfTopHorizontalLine.length + elseIfViewState.headIf.lw; // (elseIfViewState.headIf.w / 2)
                elseIfViewState.bBox.cy = viewState.bBox.cy;

                elseIfViewState.elseIfLifeLine.x = elseIfViewState.bBox.cx;
                elseIfViewState.elseIfLifeLine.y = elseIfViewState.bBox.cy + elseIfViewState.headIf.h;

                elseIfViewState.elseIfBottomHorizontalLine.x = viewState.bBox.cx;
                elseIfViewState.elseIfBottomHorizontalLine.y = viewState.bBox.cy + elseIfViewState.elseIfLifeLine.h +
                    elseIfViewState.headIf.h;
            }

        } else {
            const defaultElseVS: ElseViewState = viewState.defaultElseVS;

            defaultElseVS.elseTopHorizontalLine.x = viewState.bBox.cx + defaultElseVS.ifHeadWidthOffset;
            defaultElseVS.elseTopHorizontalLine.y = viewState.bBox.cy + defaultElseVS.ifHeadHeightOffset;

            defaultElseVS.bBox.cx = defaultElseVS.elseTopHorizontalLine.x +
                defaultElseVS.elseTopHorizontalLine.length;
            defaultElseVS.bBox.cy = ifBodyViewState.bBox.cy;

            defaultElseVS.elseBody.x = defaultElseVS.bBox.cx;
            defaultElseVS.elseBody.y = defaultElseVS.elseTopHorizontalLine.y;

            defaultElseVS.elseBottomHorizontalLine.x = viewState.bBox.cx;
            defaultElseVS.elseBottomHorizontalLine.y = defaultElseVS.elseBody.y +
                defaultElseVS.elseBody.length;

            // This is to check a else-if else and add else curve offset.
            if (viewState.childElseViewState) {
                defaultElseVS.elseBottomHorizontalLine.y += DefaultConfig.elseCurveYOffset;
            }
        }
    }

    public endVisitIfElseStatement(node: IfElseStatement) {
        const bodyViewState: BlockViewState = node.ifBody.viewState;
        // For then block add last line
        if (node.ifBody.statements.length > 0 && node.ifBody.statements[node.ifBody.statements.length - 1]?.controlFlow?.isReached) {
            const lastStatement = node.ifBody.statements[node.ifBody.statements.length - 1];
            const lineY = lastStatement.viewState.bBox.cy + lastStatement.viewState.bBox.h;
            const lineHeightForIf = bodyViewState.bBox.cy + bodyViewState.bBox.length - lastStatement.viewState.bBox.offsetFromBottom - lineY;
            const lastLine: ControlFlowLineState = {
                x: lastStatement.viewState.bBox.cx,
                y: lineY,
                h: lineHeightForIf,
            }
            bodyViewState.controlFlow.lineStates.push(lastLine);
        }
        if (node.elseBody && node.elseBody.elseBody.controlFlow?.isReached) {
            if (node.elseBody?.elseBody && STKindChecker.isIfElseStatement(node.elseBody.elseBody)) {
                const elseIfStmt: IfElseStatement = node.elseBody.elseBody as IfElseStatement;
                const elseIfViewState: IfViewState = elseIfStmt.viewState;
                const topLine: ControlFlowLineState = {
                    x: elseIfViewState.elseIfTopHorizontalLine.x,
                    y: elseIfViewState.elseIfTopHorizontalLine.y,
                    w: elseIfViewState.elseIfLifeLine.x - elseIfViewState.elseIfTopHorizontalLine.x - elseIfViewState.elseIfHeadWidthOffset,
                };
                bodyViewState.controlFlow.lineStates.push(topLine);

                if (elseIfStmt.controlFlow?.isCompleted) {
                    const bottomLine: ControlFlowLineState = {
                        x: elseIfViewState.elseIfBottomHorizontalLine.x,
                        y: elseIfViewState.elseIfBottomHorizontalLine.y,
                        w: elseIfViewState.elseIfLifeLine.x - elseIfViewState.elseIfBottomHorizontalLine.x
                    };
                    bodyViewState.controlFlow.lineStates.push(bottomLine);
                }
            }
        }
        // Add body control flow line for empty else conditions
        if (!node.elseBody && node.controlFlow?.isReached && !node.ifBody.controlFlow?.isReached) {
            // Handling empty else bodies of which if body had not been reached but the overall statement was
            const defaultElseVS = (node?.viewState as IfViewState)?.defaultElseVS;
            const defaultBodyControlFlowLine = {
                x: defaultElseVS.bBox.cx,
                y: node.ifBody.viewState.bBox.cy + TOP_CURVE_SVG_HEIGHT,
                h: node.ifBody.viewState.bBox.h - (TOP_CURVE_SVG_HEIGHT + BOTTOM_CURVE_SVG_WIDTH),
            };
            defaultElseVS?.controlFlow.lineStates.push(defaultBodyControlFlowLine);
        }
        // perf analyzer path highlights
        if (node.isInSelectedPath) {
            if (node.ifBody.statements.length === 0 && node.ifBody.controlFlow?.isReached) {
                const line: ControlFlowLineState = {
                    x: node.viewState.bBox.cx,
                    y: node.ifBody.viewState.bBox.cy,
                    h: node.ifBody.viewState.bBox.length,
                }
                bodyViewState.controlFlow.lineStates.push(line);
            } else if (node.elseBody?.elseBody?.controlFlow?.isReached) {
                const elseStmt: IfElseStatement = node.elseBody.elseBody as IfElseStatement;
                const elseViewState: ElseViewState = elseStmt.viewState;
                const defaultBodyControlFlowLine = {
                    x: elseViewState.bBox.cx,
                    y: node.ifBody.viewState.bBox.cy + TOP_CURVE_SVG_HEIGHT,
                    h: node.ifBody.viewState.bBox.h - (TOP_CURVE_SVG_HEIGHT + BOTTOM_CURVE_SVG_WIDTH),
                };

                elseViewState.controlFlow.lineStates.push(defaultBodyControlFlowLine);
            }
        }
    }
}

export const positionVisitor = new PositioningVisitor();
