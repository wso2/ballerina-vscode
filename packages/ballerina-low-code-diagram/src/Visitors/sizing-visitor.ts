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
    ActionStatement,
    AssignmentStatement,
    BlockStatement,
    CallStatement,
    DoStatement,
    ExpressionFunctionBody,
    ForeachStatement,
    FunctionBodyBlock,
    FunctionDefinition,
    IfElseStatement,
    ListenerDeclaration,
    LocalVarDecl,
    ModulePart,
    ModuleVarDecl,
    NamedWorkerDeclaration,
    ObjectMethodDefinition,
    OnFailClause,
    ResourceAccessorDefinition,
    ServiceDeclaration,
    STKindChecker,
    STNode,
    traversNode,
    Visitor, WhileStatement
} from "@wso2/syntax-tree";

import { PLUS_SVG_HEIGHT, PLUS_SVG_WIDTH } from "../Components/PlusButtons/Plus/PlusAndCollapse/PlusSVG";
import { TRIGGER_RECT_SVG_HEIGHT, TRIGGER_RECT_SVG_WIDTH } from "../Components/RenderingComponents/ActionInvocation/TriggerSVG";
import { ASSIGNMENT_NAME_WIDTH } from "../Components/RenderingComponents/Assignment";
import { COLLAPSED_BLOCK_HEIGHT, COLLAPSED_BLOCK_WIDTH } from "../Components/RenderingComponents/Collapse/CollapsedComponentSVG";
import { CONDITION_ASSIGNMENT_NAME_WIDTH } from "../Components/RenderingComponents/ConditionAssignment";
import { CLIENT_RADIUS, CLIENT_SVG_HEIGHT } from "../Components/RenderingComponents/Connector/ConnectorHeader/ConnectorClientSVG";
import { STOP_SVG_HEIGHT, STOP_SVG_WIDTH } from "../Components/RenderingComponents/End/StopSVG";
import { FOREACH_SVG_HEIGHT, FOREACH_SVG_WIDTH } from "../Components/RenderingComponents/ForEach/ForeachSVG";
import { COLLAPSE_DOTS_SVG_HEIGHT } from "../Components/RenderingComponents/ForEach/ThreeDotsSVG";
import { IFELSE_SVG_HEIGHT, IFELSE_SVG_WIDTH } from "../Components/RenderingComponents/IfElse/IfElseSVG";
import { LISTENER_HEIGHT, LISTENER_WIDTH } from "../Components/RenderingComponents/Listener/ListenerSVG";
import { MIN_MODULE_VAR_WIDTH, MODULE_VAR_HEIGHT } from "../Components/RenderingComponents/ModuleVariable";
import { PROCESS_SVG_HEIGHT, PROCESS_SVG_WIDTH, PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW } from "../Components/RenderingComponents/Processor/ProcessSVG";
import { RESPOND_SVG_HEIGHT, RESPOND_SVG_WIDTH } from "../Components/RenderingComponents/Respond/RespondSVG";
import { RETURN_SVG_HEIGHT, RETURN_SVG_WIDTH } from "../Components/RenderingComponents/Return/ReturnSVG";
import { DEFAULT_SERVICE_WIDTH } from "../Components/RenderingComponents/Service";
import { SERVICE_HEADER_HEIGHT } from "../Components/RenderingComponents/Service/ServiceHeader";
import { START_SVG_HEIGHT, START_SVG_WIDTH } from "../Components/RenderingComponents/Start/StartSVG";
import { VARIABLE_NAME_WIDTH } from "../Components/RenderingComponents/VariableName";
import { WHILE_SVG_HEIGHT, WHILE_SVG_WIDTH } from "../Components/RenderingComponents/While/WhileSVG";
import { Endpoint } from "../Types/type";
import { getNodeSignature, isVarTypeDescriptor, recalculateSizingAndPositioning } from "../Utils";
import expandTracker from "../Utils/expand-tracker";
import {
    BlockViewState, CollapseViewState, CompilationUnitViewState, ElseViewState, EndViewState,
    ForEachViewState, FunctionViewState, IfViewState, PlusViewState, SimpleBBox, StatementViewState, ViewState
} from "../ViewState";
import { DoStatementViewState } from "../ViewState/do-statement";
import { DraftStatementViewState } from "../ViewState/draft";
import { ModuleMemberViewState } from "../ViewState/module-member";
import { OnFailClauseViewState } from "../ViewState/on-fail-clause";
import { ServiceViewState } from "../ViewState/service";
import { WhileViewState } from "../ViewState/while";
import { WorkerDeclarationViewState } from "../ViewState/worker-declaration";

import { ConflictResolutionVisitor } from "./conflict-resolution-visitor";
import { DefaultConfig } from "./default";
import { getDraftComponentSizes, getPlusViewState, haveBlockStatement, isPositionWithinRange, isSTActionInvocation } from "./util";

export interface AsyncSendInfo {
    to: string;
    node: STNode;
    paired: boolean;
    index: number;
}

export interface AsyncReceiveInfo {
    from: string;
    node: STNode;
    paired: boolean;
    index: number;
}

export interface WaitInfo {
    for: string;
    node: STNode;
    index: number;
}

export interface SendRecievePairInfo {
    sourceName: string;
    sourceViewState: ViewState;
    sourceIndex: number;
    targetName: string;
    targetViewState: ViewState;
    targetIndex: number;
    restrictedSpace?: ConflictRestrictSpace;
    pairHeight?: number;
}

export interface ConflictRestrictSpace {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

export const DEFAULT_WORKER_NAME = 'function'; // todo: move to appropriate place.
const METRICS_LABEL_MARGIN = 60;

export class SizingVisitor implements Visitor {
    private currentWorker: string[];
    private senderReceiverInfo: Map<string, { sends: AsyncSendInfo[], receives: AsyncReceiveInfo[], waits: WaitInfo[] }>;
    private workerMap: Map<string, NamedWorkerDeclaration>;
    private allEndpoints: Map<string, Endpoint> = new Map<string, Endpoint>();
    private experimentalEnabled: boolean;
    private conflictResolutionFailed = false;

    private parentConnectors: Map<string, Endpoint> = new Map<string, Endpoint>();
    private foundParentConnectors: Map<string, Endpoint> = new Map<string, Endpoint>();

    constructor(experimentalEnabled: boolean = false, parentConnectors?: Map<string, Endpoint>) {
        this.currentWorker = [];
        this.senderReceiverInfo = new Map();
        this.workerMap = new Map();
        this.experimentalEnabled = experimentalEnabled;
        this.parentConnectors = parentConnectors;
    }

    private getConnectorSize() {
        let size = 0;
        this.allEndpoints.forEach((value: Endpoint, key: string) => {
            const found = this.parentConnectors?.get(key);
            if (!found && !value.isParent) {
                size++;
            } else {
                this.foundParentConnectors.set(key, found);
                value.isParent = true;
            }
        })
        return size;
    }

    private getConnectorGap() {
        // const rw = (this.getConnectorSize() * (DefaultConfig.connectorEPWidth)) + (this.foundParentConnectors.size > 0 ? (this.getConnectorSize() === 1 ? DefaultConfig.epGap : 0) : DefaultConfig.epGap);
        const rw = this.getConnectorSize() * DefaultConfig.connectorEPWidth + DefaultConfig.epGap;
        if (this.getConnectorSize() > 0) {
            return rw;
        } else {
            return 0;
        }
    }

    public getConflictResulutionFailureStatus() {
        return this.conflictResolutionFailed;
    }

    public endVisitSTNode(node: STNode, parent?: STNode) {
        if (!node.viewState) {
            return;
        }
        this.sizeStatement(node);
    }

    public cleanMaps() {
        this.currentWorker = [];
        this.senderReceiverInfo = new Map();
        this.workerMap = new Map();
        this.allEndpoints = new Map();
    }

    public beginVisitModulePart(node: ModulePart, parent?: STNode) {
        const viewState: CompilationUnitViewState = node.viewState;
        node.members.forEach((member, i) => {
            const plusViewState: PlusViewState = getPlusViewState(i, viewState.plusButtons);
            if (!plusViewState) {
                const plusBtnViewBox: PlusViewState = new PlusViewState();
                plusBtnViewBox.index = i;
                plusBtnViewBox.expanded = false;
                plusBtnViewBox.isLast = true;
                plusBtnViewBox.targetPosition = node.position; // TODO check the memeber position
                viewState.plusButtons.push(plusBtnViewBox);
            }
        });

        const lastPlusViewState: PlusViewState = getPlusViewState(node.members.length, viewState.plusButtons);
        if (!lastPlusViewState) {
            const plusBtnViewBox: PlusViewState = new PlusViewState();
            plusBtnViewBox.index = node.members.length;
            plusBtnViewBox.expanded = false;
            plusBtnViewBox.isLast = true;
            viewState.plusButtons.push(plusBtnViewBox);
        }
    }

    public endVisitModulePart(node: ModulePart) {
        const viewState: CompilationUnitViewState = node.viewState;
        if (node.members.length === 0) { // if the bal file is empty.
            viewState.trigger.h = START_SVG_HEIGHT;
            viewState.trigger.w = START_SVG_WIDTH;
            viewState.trigger.lw = START_SVG_WIDTH / 2;
            viewState.trigger.rw = START_SVG_WIDTH / 2;

            viewState.bBox.h = DefaultConfig.canvas.height;
            viewState.bBox.w = DefaultConfig.canvas.width;
            viewState.bBox.lw = DefaultConfig.canvas.width / 2;
            viewState.bBox.rw = DefaultConfig.canvas.width / 2;
        } else {
            let height: number = 0;
            let leftWidth: number = 0;
            let rightWidth: number = 0;
            let width: number = 0;

            node.members.forEach(member => {
                const memberVS = member.viewState as any;
                if (memberVS) {
                    height = memberVS.bBox.h;

                    if (memberVS.bBox.lw > leftWidth) {
                        leftWidth = memberVS.bBox.lw;
                    }
                    if (memberVS.bBox.rw > rightWidth) {
                        rightWidth = memberVS.bBox.rw;
                    }

                    // TODO: check whether we need this calc as
                    // we already calculate right and left widths.
                    if (memberVS.bBox.w > width) {
                        width = memberVS.bBox.w;
                    }
                }

                if (memberVS.precedingPlus) {
                    viewState.plusButtons.push(memberVS.precedingPlus);
                }
            });

            viewState.bBox.h = height;
            viewState.bBox.lw = leftWidth;
            viewState.bBox.rw = rightWidth;
            viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;
        }
    }

    public beginVisitListenerDeclaration(node: ListenerDeclaration) {
        if (node.viewState) {
            const viewState = node.viewState as ModuleMemberViewState;
            viewState.bBox.w = LISTENER_WIDTH;
            viewState.bBox.lw = LISTENER_WIDTH / 2;
            viewState.bBox.rw = LISTENER_WIDTH / 2;
            viewState.bBox.h = LISTENER_HEIGHT;
        }
    }

    public beginVisitModuleVarDecl(node: ModuleVarDecl) {
        const viewState = node.viewState as ModuleMemberViewState;
        viewState.bBox.w = MIN_MODULE_VAR_WIDTH;
        viewState.bBox.lw = MIN_MODULE_VAR_WIDTH / 2;
        viewState.bBox.rw = MIN_MODULE_VAR_WIDTH / 2;
        viewState.bBox.h = MODULE_VAR_HEIGHT;
    }

    public beginVisitFunctionDefinition(node: FunctionDefinition) {
        const viewState: FunctionViewState = node.viewState as FunctionViewState;
        const body: FunctionBodyBlock = node.functionBody as FunctionBodyBlock;
        const bodyViewState: BlockViewState = body.viewState;
        viewState.collapsed = !expandTracker.isExpanded(getNodeSignature(node));

        // Set isCallerAvailable to false.
        bodyViewState.isCallerAvailable = false;

        // If body has no statements and doesn't have a end component
        // Add the plus button to show up on the start end
        if (!bodyViewState.isEndComponentAvailable && body.statements.length <= 0
            && !body.namedWorkerDeclarator) {
            const plusBtnViewState: PlusViewState = new PlusViewState();
            if (!bodyViewState.draft && !viewState.initPlus) {
                plusBtnViewState.index = body.statements.length;
                plusBtnViewState.expanded = true;
                plusBtnViewState.selectedComponent = "PROCESS";
                plusBtnViewState.collapsedClicked = false;
                plusBtnViewState.collapsedPlusDuoExpanded = false;
                plusBtnViewState.isLast = true;
                plusBtnViewState.targetPosition = {
                    startLine: body.position.endLine,
                    startColumn: body.position.endColumn - 1,
                    endLine: body.position.endLine,
                    endColumn: body.position.endColumn - 1
                }
                bodyViewState.plusButtons = [];
                bodyViewState.plusButtons.push(plusBtnViewState);
                viewState.initPlus = plusBtnViewState;
            } else if (viewState.initPlus && viewState.initPlus.draftAdded) {
                viewState.initPlus = undefined;
            }
        }

        this.currentWorker.push(DEFAULT_WORKER_NAME);
    }

    public beginVisitServiceDeclaration(node: ServiceDeclaration, parent?: STNode) {
        const viewState: ServiceViewState = node.viewState;
        viewState.collapsed = !expandTracker.isExpanded(getNodeSignature(node));
        // setting up service lifeline initial height

        node.members.forEach((member, i) => {
            const plusViewState: PlusViewState = getPlusViewState(i, viewState.plusButtons);
            if (!plusViewState) {
                const plusBtnViewBox: PlusViewState = new PlusViewState();
                plusBtnViewBox.index = i;
                plusBtnViewBox.expanded = false;
                plusBtnViewBox.isLast = true;
                viewState.plusButtons.push(plusBtnViewBox);
            }
        });

        const lastPlusViewState: PlusViewState = getPlusViewState(node.members.length, viewState.plusButtons);
        if (!lastPlusViewState) {
            const plusBtnViewBox: PlusViewState = new PlusViewState();
            plusBtnViewBox.index = node.members.length;
            plusBtnViewBox.expanded = false;
            plusBtnViewBox.isLast = true;
            viewState.plusButtons.push(plusBtnViewBox);
        }
    }

    public endVisitServiceDeclaration(node: ServiceDeclaration, parent?: STNode) {
        const viewState: ServiceViewState = node.viewState;
        let height: number = 0;
        let leftWidth: number = 0;
        let rightWidth: number = 0;

        node.members.forEach(member => {
            const memberVS = member.viewState;

            if (memberVS) {
                height += memberVS.bBox.h;

                if (memberVS.bBox.lw > leftWidth) {
                    leftWidth = memberVS.bBox.lw;
                }
                if (memberVS.bBox.rw > rightWidth) {
                    rightWidth = memberVS.bBox.rw;
                }
            }
        });

        viewState.bBox.lw = leftWidth + DefaultConfig.serviceFrontPadding;
        viewState.bBox.rw = rightWidth + DefaultConfig.serviceRearPadding;
        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;

        if (viewState.bBox.w < DEFAULT_SERVICE_WIDTH) {
            viewState.bBox.w = DEFAULT_SERVICE_WIDTH;
        }
        if (viewState.bBox.lw < (DEFAULT_SERVICE_WIDTH / 2)) {
            viewState.bBox.lw = DEFAULT_SERVICE_WIDTH / 2;
        }
        if (viewState.bBox.rw < (DEFAULT_SERVICE_WIDTH / 2)) {
            viewState.bBox.rw = DEFAULT_SERVICE_WIDTH / 2;
        }

        viewState.bBox.h = height + viewState.plusButtons.length * DefaultConfig.serviceMemberSpacing * 2
            + DefaultConfig.serviceVerticalPadding + SERVICE_HEADER_HEIGHT; // memberHeights + plusbutton gap between
    }

    public beginVisitResourceAccessorDefinition(node: ResourceAccessorDefinition) {
        if (node.viewState) {
            const viewState: FunctionViewState = node.viewState as FunctionViewState;
            viewState.isResource = true;
        }

        this.beginVisitFunctionDefinition(node);
    }

    public endVisitResourceAccessorDefinition(node: ResourceAccessorDefinition) {
        this.endVisitFunctionDefinition(node);
    }

    public beginVisitObjectMethodDefinition(node: ObjectMethodDefinition) {
        const viewState: FunctionViewState = node.viewState as FunctionViewState;
        const body: FunctionBodyBlock = node.functionBody as FunctionBodyBlock;
        const bodyViewState: BlockViewState = body.viewState;

        // If body has no statements and doesn't have a end component
        // Add the plus button to show up on the start end
        if (!bodyViewState.isEndComponentAvailable && body.statements.length <= 0 && !body.namedWorkerDeclarator) {
            const plusBtnViewState: PlusViewState = new PlusViewState();
            if (!bodyViewState.draft && !viewState.initPlus) {
                plusBtnViewState.index = body.statements.length;
                plusBtnViewState.expanded = true;
                plusBtnViewState.selectedComponent = "PROCESS";
                plusBtnViewState.collapsedClicked = false;
                plusBtnViewState.collapsedPlusDuoExpanded = false;
                plusBtnViewState.isLast = true;
                plusBtnViewState.targetPosition = {
                    startLine: body.position.endLine,
                    startColumn: body.position.endColumn - 1,
                    endLine: body.position.endLine1,
                    endColumn: body.position.endColumn - 1
                }
                bodyViewState.plusButtons = [];
                bodyViewState.plusButtons.push(plusBtnViewState);
                viewState.initPlus = plusBtnViewState;
            } else if (viewState.initPlus && viewState.initPlus.draftAdded) {
                viewState.initPlus = undefined;
            }
        }
    }

    public endVisitFunctionDefinition(node: FunctionDefinition) {
        // replaces endVisitFunction
        const viewState: FunctionViewState = node.viewState as FunctionViewState;
        const body: FunctionBodyBlock = node.functionBody as FunctionBodyBlock;
        const bodyViewState: BlockViewState = body.viewState;
        const lifeLine = viewState.workerLine;
        const trigger = viewState.trigger;
        const end = viewState.end;

        // Mark the body as a resource if function we are in is a resource function.
        bodyViewState.isResource = viewState.isResource;

        trigger.h = START_SVG_HEIGHT;
        trigger.w = START_SVG_WIDTH;
        trigger.lw = START_SVG_WIDTH / 2;
        trigger.rw = START_SVG_WIDTH / 2;

        end.bBox.w = STOP_SVG_WIDTH;
        end.bBox.lw = STOP_SVG_WIDTH / 2;
        end.bBox.rw = STOP_SVG_WIDTH / 2;
        end.bBox.h = STOP_SVG_HEIGHT;

        lifeLine.h = trigger.offsetFromBottom + bodyViewState.bBox.h + end.bBox.offsetFromTop;

        viewState.bBox.h = lifeLine.h + trigger.h + end.bBox.h + (DefaultConfig.serviceVerticalPadding * 2) + DefaultConfig.functionHeaderHeight;
        viewState.bBox.lw = (trigger.lw > bodyViewState.bBox.lw ? trigger.lw : bodyViewState.bBox.lw) + DefaultConfig.serviceFrontPadding;
        viewState.bBox.rw = (trigger.rw > bodyViewState.bBox.rw ? trigger.rw : bodyViewState.bBox.rw) + DefaultConfig.serviceRearPadding + this.getConnectorGap();

        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;

        const matchedStatements = this.syncAsyncStatements(node, trigger.offsetFromBottom);
        const resolutionVisitor = new ConflictResolutionVisitor(matchedStatements, this.workerMap.size + 1, trigger.offsetFromBottom);
        const startDate = new Date();
        let conflictResolved = false;

        do {
            resolutionVisitor.resetConflictStatus();
            traversNode(node, resolutionVisitor);
            if (!conflictResolved) {
                conflictResolved = resolutionVisitor.conflictFound();
            }
            if ((new Date()).getTime() - startDate.getTime() > 5000) {
                this.conflictResolutionFailed = true;
                break;
            }
        } while (resolutionVisitor.conflictFound())

        if (conflictResolved || bodyViewState.hasWorkerDecl) {
            let maxWorkerHeight = 0;
            let totalWorkerWidth = 0;
            Array.from(this.workerMap.keys()).forEach(key => {
                const workerST = this.workerMap.get(key);
                const workerVS = workerST.viewState as WorkerDeclarationViewState;
                const workerBodyVS = workerST.workerBody.viewState as BlockViewState;
                const workerLifeLine = workerVS.workerLine;
                const workerTrigger = workerVS.trigger;
                this.endSizingBlock(workerST.workerBody, workerST.workerBody.statements.length);

                workerLifeLine.h = workerTrigger.offsetFromBottom + workerBodyVS.bBox.h;

                if (!workerBodyVS.isEndComponentAvailable) {
                    workerLifeLine.h += workerVS.end.bBox.offsetFromTop;
                } else {
                    workerLifeLine.h -= DefaultConfig.offSet * 2; // ToDo: Figure out where this went wrong
                }

                workerVS.bBox.h = workerLifeLine.h + workerTrigger.h + end.bBox.h + DefaultConfig.serviceVerticalPadding * 2
                    + DefaultConfig.functionHeaderHeight;
                workerVS.bBox.lw = (workerTrigger.lw > workerBodyVS.bBox.lw ? workerTrigger.lw : workerBodyVS.bBox.lw) + DefaultConfig.serviceFrontPadding;
                workerVS.bBox.rw = (workerTrigger.rw > workerBodyVS.bBox.rw ? workerTrigger.rw : workerBodyVS.bBox.rw) + DefaultConfig.serviceRearPadding;
                workerVS.bBox.w = workerVS.bBox.lw + workerVS.bBox.rw;

                if (workerVS.initPlus && workerVS.initPlus.selectedComponent === "PROCESS") {
                    workerVS.bBox.h += DefaultConfig.PLUS_HOLDER_STATEMENT_HEIGHT;
                    if (workerVS.bBox.w < DefaultConfig.PLUS_HOLDER_WIDTH) {
                        workerVS.bBox.w = DefaultConfig.PLUS_HOLDER_WIDTH;
                    }
                }

                if (maxWorkerHeight < workerVS.bBox.h) {
                    maxWorkerHeight = workerVS.bBox.h;
                }

                totalWorkerWidth += workerVS.bBox.w;
            });
            this.endVisitFunctionBodyBlock(body, node);

            lifeLine.h = trigger.offsetFromBottom + bodyViewState.bBox.h + end.bBox.offsetFromTop;

            if (bodyViewState.isEndComponentAvailable) {
                lifeLine.h += (body.statements[body.statements.length - 1].viewState as ViewState).bBox.offsetFromTop;
            }

            if (STKindChecker.isExpressionFunctionBody(body) || body.namedWorkerDeclarator) {
                lifeLine.h += end.bBox.offsetFromTop;
            }

            viewState.bBox.h = lifeLine.h + trigger.h + end.bBox.h + DefaultConfig.serviceVerticalPadding * 2 + DefaultConfig.functionHeaderHeight;
            viewState.bBox.lw = (trigger.lw > bodyViewState.bBox.lw ? trigger.lw : bodyViewState.bBox.lw) + DefaultConfig.serviceFrontPadding;
            viewState.bBox.rw = (trigger.rw > bodyViewState.bBox.rw ? trigger.rw : bodyViewState.bBox.rw) + DefaultConfig.serviceRearPadding + totalWorkerWidth + (this.getConnectorSize() * (DefaultConfig.connectorEPWidth)) + DefaultConfig.epGap;
            viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;

            if (bodyViewState.hasWorkerDecl) {
                const maxWorkerFullHeight = body.namedWorkerDeclarator
                    .workerInitStatements
                    .reduce((sum, statement) => sum + (statement.viewState as ViewState).getHeight(), 0)
                    + maxWorkerHeight;

                if (bodyViewState.bBox.h < maxWorkerFullHeight) {
                    viewState.bBox.h += (maxWorkerFullHeight - bodyViewState.bBox.h);
                }

                this.currentWorker.pop();
            }
            this.cleanMaps();
        }

        if (body.VisibleEndpoints && body.VisibleEndpoints.length > 0) {
            for (const value of body.VisibleEndpoints) {
                if (value.isCaller) {
                    bodyViewState.isCallerAvailable = value.isCaller;
                    break;
                }
            }
        }
    }

    /**
     * Sync heights of the send receive pairs
     * @param funcitonDef Function definition ST
     * @param offset Bottom offset of the trigger head this is constant in any mode
     * @returns paired viewstates of sends and receives
     */
    private syncAsyncStatements(funcitonDef: FunctionDefinition, offset: number): SendRecievePairInfo[] {
        const matchedStatements: SendRecievePairInfo[] = [];
        const mainWorkerBody: FunctionBodyBlock = funcitonDef.functionBody as FunctionBodyBlock;

        // pair up sends with corresponding receives
        Array.from(this.senderReceiverInfo.keys()).forEach(key => {
            const workerEntry = this.senderReceiverInfo.get(key);

            // treat waits as receives
            workerEntry.waits.forEach((waitInfo) => {
                const targetViewState = waitInfo.node.viewState as StatementViewState;
                const sourceWorker = this.workerMap.get(waitInfo.for) as NamedWorkerDeclaration;
                const workerNames = Array.from(this.workerMap.keys());
                const sourceWorkerIndex = workerNames.indexOf(waitInfo.for);
                const targetWorkerIndex = workerNames.indexOf(key);
                if (sourceWorker) {
                    const sourceWorkerBody = sourceWorker.workerBody as BlockStatement;

                    const sourceViewstate: EndViewState | StatementViewState =
                        (sourceWorkerBody.viewState as BlockViewState).isEndComponentAvailable ?
                            sourceWorkerBody.statements[sourceWorkerBody.statements.length - 1].viewState
                            : (sourceWorker.viewState as WorkerDeclarationViewState).end as EndViewState;

                    targetViewState.isReceive = true;
                    sourceViewstate.isSend = true;
                    sourceViewstate.bBox.offsetFromTop = offset;
                    targetViewState.bBox.offsetFromTop = offset;

                    if (key === DEFAULT_WORKER_NAME) {
                        targetViewState.arrowFrom = 'Right';
                        sourceViewstate.arrowFrom = 'Left';
                    } else if (sourceWorkerIndex > targetWorkerIndex) {
                        targetViewState.arrowFrom = 'Right'
                        sourceViewstate.arrowFrom = 'Left';
                    } else {
                        targetViewState.arrowFrom = 'Left'
                        sourceViewstate.arrowFrom = 'Right';
                    }

                    const sourceIndex = (sourceWorkerBody.viewState as BlockViewState).isEndComponentAvailable ?
                        sourceWorkerBody.statements.length - 1
                        : sourceWorkerBody.statements.length;

                    matchedStatements.push({
                        sourceName: waitInfo.for,
                        sourceIndex: sourceIndex < 0 ? 0 : sourceIndex,
                        targetName: key,
                        sourceViewState: sourceViewstate,
                        targetViewState: waitInfo.node.viewState,
                        targetIndex: waitInfo.index,
                        pairHeight: 0,
                    });
                }
            });

            workerEntry.sends.forEach(sendInfo => {
                if (sendInfo.paired) {
                    return;
                }

                const matchedReceive = this.senderReceiverInfo
                    .get(sendInfo.to)?.receives?.find(receiveInfo => receiveInfo.from === key && !receiveInfo.paired);

                if (matchedReceive) {
                    matchedReceive.paired = true;
                    sendInfo.paired = true;

                    const sourceViewState: StatementViewState = sendInfo.node.viewState as StatementViewState;
                    const targetViewState: StatementViewState = matchedReceive.node.viewState as StatementViewState;

                    sourceViewState.isSend = true;
                    targetViewState.isReceive = true;
                    sourceViewState.bBox.offsetFromTop = offset;
                    targetViewState.bBox.offsetFromTop = offset;
                    // to figure out from which direction the arrow is approaching/starting to displace the text
                    if (sendInfo.to === DEFAULT_WORKER_NAME) {
                        sourceViewState.arrowFrom = 'Left';
                        targetViewState.arrowFrom = 'Right';
                    } else {
                        sourceViewState.arrowFrom = 'Right';
                        targetViewState.arrowFrom = 'Left';
                    }

                    matchedStatements.push({
                        sourceName: key,
                        sourceIndex: sendInfo.index,
                        targetName: sendInfo.to,
                        sourceViewState,
                        targetViewState,
                        targetIndex: matchedReceive.index,
                        pairHeight: 0,
                    });
                }
            });

            workerEntry.receives.forEach(receiveInfo => {
                if (receiveInfo.paired) {
                    return;
                }

                const matchedSend = this.senderReceiverInfo
                    .get(receiveInfo.from)?.sends?.find(senderInfo => senderInfo.to === key && !senderInfo.paired);

                if (matchedSend) {
                    matchedSend.paired = true;
                    receiveInfo.paired = true;

                    const sourceViewState = matchedSend.node.viewState as StatementViewState;
                    const targetViewState = receiveInfo.node.viewState as StatementViewState;

                    sourceViewState.isSend = true;
                    targetViewState.isReceive = true;
                    sourceViewState.bBox.offsetFromTop = offset;
                    targetViewState.bBox.offsetFromTop = offset;
                    // to figure out from which direction the arrow is approaching/starting to displace the text
                    if (receiveInfo.from === DEFAULT_WORKER_NAME) {
                        sourceViewState.arrowFrom = 'Right';
                        targetViewState.arrowFrom = 'Left';
                    } else {
                        sourceViewState.arrowFrom = 'Left';
                        targetViewState.arrowFrom = 'Right';
                    }

                    matchedStatements.push({
                        sourceName: receiveInfo.from,
                        sourceIndex: matchedSend.index,
                        sourceViewState: matchedSend.node.viewState,
                        targetName: matchedSend.to,
                        targetIndex: receiveInfo.index,
                        targetViewState: receiveInfo.node.viewState,
                        pairHeight: 0,
                    });
                }
            });
        });

        // 2. Sort the pairs in the order they should appear top to bottom
        matchedStatements.sort((p1, p2) => {
            if (p1.targetName === p2.targetName) {
                // If two pairs has the same receiver (send.workerName is the receiver name) one with
                // higher lower receiver index (one defined heigher up in the receiver) should be rendered
                // higher in the list of pairs. Same logic is used for all the cases following.
                return 0;
            }
            if (p1.targetName === p2.sourceName) {
                return p1.targetIndex - p2.sourceIndex;
            }
            if (p1.sourceName === p2.targetName) {
                return p1.sourceIndex - p2.targetIndex;
            }
            if (p1.sourceName === p2.sourceName) {
                return p1.sourceIndex - p2.sourceIndex;
            }
            return 0;
        });

        const workerNameArr = Array.from(this.workerMap.keys());
        workerNameArr.unshift(DEFAULT_WORKER_NAME);

        // for each pair calculate the heights until the send or receive statement and add the diff to the shorter one
        matchedStatements.forEach(matchedPair => {
            let sendHeight = 0;
            let receiveHeight = 0;
            let sourceBody;
            let targetBody;

            if (matchedPair.sourceName === DEFAULT_WORKER_NAME) {
                sourceBody = mainWorkerBody;
            } else {
                const workerDecl = this.workerMap.get(matchedPair.sourceName) as NamedWorkerDeclaration;
                sourceBody = workerDecl.workerBody;
            }

            if (matchedPair.targetName === DEFAULT_WORKER_NAME) {
                targetBody = mainWorkerBody;
            } else {
                const workerDecl = this.workerMap.get(matchedPair.targetName) as NamedWorkerDeclaration;
                targetBody = workerDecl.workerBody;
            }

            sendHeight = this.calculateHeightUptoIndex(matchedPair.sourceIndex, sourceBody as BlockStatement);
            receiveHeight = this.calculateHeightUptoIndex(matchedPair.targetIndex, targetBody as BlockStatement);

            if (sendHeight > receiveHeight) {
                const targetVS = matchedPair.targetViewState as StatementViewState;
                targetVS.bBox.offsetFromTop += (sendHeight - receiveHeight);
            } else {
                const sourceVS = matchedPair.sourceViewState as StatementViewState;
                sourceVS.bBox.offsetFromTop += (receiveHeight - sendHeight);
            }

            const sourceWorkerIndex = workerNameArr.indexOf(matchedPair.sourceName);
            const receiveWorkerIndex = workerNameArr.indexOf(matchedPair.targetName);

            matchedPair.restrictedSpace = {
                x1: sourceWorkerIndex < receiveWorkerIndex ? sourceWorkerIndex : receiveWorkerIndex,
                x2: sourceWorkerIndex < receiveWorkerIndex ? receiveWorkerIndex : sourceWorkerIndex,
                y1: DefaultConfig.offSet + (sendHeight > receiveHeight ? sendHeight : receiveHeight),
                y2: matchedPair.sourceViewState.bBox.h + DefaultConfig.offSet + (sendHeight > receiveHeight ? sendHeight : receiveHeight)
            }

            matchedPair.pairHeight = matchedPair.restrictedSpace.y1;
        });

        return matchedStatements;
    }

    private calculateHeightUptoIndex(targetIndex: number, workerBody: BlockStatement) {
        let index = 0;
        let height = 0;
        const workerBodyVS = workerBody.viewState as BlockViewState;
        const collapsedViewStates: CollapseViewState[] = [...workerBodyVS.collapsedViewStates];

        while (targetIndex !== index) {
            const statement = workerBody.statements[index];
            const viewState: ViewState = statement.viewState as ViewState;

            if (viewState.collapsed) {
                for (let i = 0; i < collapsedViewStates.length; i++) {
                    if (isPositionWithinRange(statement.position, collapsedViewStates[i].range)) {
                        height += COLLAPSED_BLOCK_HEIGHT / 2;
                        collapsedViewStates.splice(i, 1);
                        break;
                    }
                }
            } else {
                height += viewState.getHeight();
            }
            index++;
        }

        if (workerBodyVS.draft && workerBodyVS.draft[0] <= targetIndex) {
            height += workerBodyVS.draft[1].getHeight();
        }

        return height;
    }

    public endVisitObjectMethodDefinition(node: ObjectMethodDefinition) {
        const viewState: FunctionViewState = node.viewState as FunctionViewState;
        const body: FunctionBodyBlock = node.functionBody as FunctionBodyBlock;
        const bodyViewState: BlockViewState = body.viewState;
        const lifeLine = viewState.workerLine;
        const trigger = viewState.trigger;
        const end = viewState.end;

        trigger.h = START_SVG_HEIGHT;
        trigger.w = START_SVG_WIDTH;
        trigger.lw = START_SVG_WIDTH / 2;
        trigger.rw = START_SVG_WIDTH / 2;

        end.bBox.w = STOP_SVG_WIDTH;
        end.bBox.lw = STOP_SVG_WIDTH / 2;
        end.bBox.rw = STOP_SVG_WIDTH / 2;
        end.bBox.h = STOP_SVG_HEIGHT;

        lifeLine.h = trigger.offsetFromBottom + bodyViewState.bBox.h + end.bBox.offsetFromTop;

        viewState.bBox.h = lifeLine.h + trigger.h + end.bBox.h + DefaultConfig.serviceVerticalPadding * 2 + DefaultConfig.functionHeaderHeight;
        viewState.bBox.lw = (trigger.lw > bodyViewState.bBox.lw ? trigger.lw : bodyViewState.bBox.lw) + DefaultConfig.serviceFrontPadding;
        viewState.bBox.rw = (trigger.rw > bodyViewState.bBox.rw ? trigger.rw : bodyViewState.bBox.rw) + DefaultConfig.serviceRearPadding + this.getConnectorGap();
        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;

        if (viewState.initPlus && viewState.initPlus.selectedComponent === "PROCESS") {
            viewState.bBox.h += DefaultConfig.PLUS_HOLDER_STATEMENT_HEIGHT;
            if (viewState.bBox.w < DefaultConfig.PLUS_HOLDER_WIDTH) {
                viewState.bBox.w = DefaultConfig.PLUS_HOLDER_WIDTH;
            }
            if (viewState.bBox.lw < DefaultConfig.PLUS_HOLDER_WIDTH / 2) {
                viewState.bBox.lw = DefaultConfig.PLUS_HOLDER_WIDTH / 2;
            }
            if (viewState.bBox.rw < DefaultConfig.PLUS_HOLDER_WIDTH / 2) {
                viewState.bBox.rw = DefaultConfig.PLUS_HOLDER_WIDTH / 2;
            }
        }
    }

    public beginVisitFunctionBodyBlock(node: FunctionBodyBlock) {
        const viewState: BlockViewState = node.viewState;
        this.allEndpoints = viewState.connectors;
        if (node.statements.length > 0 && STKindChecker.isReturnStatement(node.statements[node.statements.length - 1])) {
            viewState.isEndComponentInMain = true;
        }

        let index = 0;

        if (viewState.hasWorkerDecl) {
            index = this.initiateStatementSizing(node.namedWorkerDeclarator.workerInitStatements, index, viewState);

            const workerPlusVS = getPlusViewState(index + node.statements.length + 1, viewState.plusButtons);
            if (workerPlusVS && workerPlusVS.draftAdded) {
                const draft: DraftStatementViewState = new DraftStatementViewState();
                draft.type = workerPlusVS.draftAdded;
                draft.subType = workerPlusVS.draftSubType;
                draft.connector = workerPlusVS.draftConnector;
                draft.selectedConnector = workerPlusVS.draftSelectedConnector;

                let prevStatement: STNode;

                if (node.namedWorkerDeclarator.workerInitStatements.length > 0) {
                    prevStatement = node.namedWorkerDeclarator
                        .workerInitStatements[node.namedWorkerDeclarator.workerInitStatements.length - 1];
                }

                draft.targetPosition = {
                    startLine: prevStatement ? prevStatement.position.startLine + 1
                        : node.namedWorkerDeclarator.position.startLine,
                    startColumn: 0
                };
                viewState.draft = [index, draft];
                workerPlusVS.draftAdded = undefined;
            } else {
                const plusBtnViewState = new PlusViewState();
                plusBtnViewState.index = index + node.statements.length + 1;
                plusBtnViewState.expanded = true;
                plusBtnViewState.selectedComponent = "PROCESS";
                plusBtnViewState.collapsedClicked = false;
                plusBtnViewState.collapsedPlusDuoExpanded = false;
                plusBtnViewState.allowWorker = true;
                viewState.plusButtons.push(plusBtnViewState)
            }


        }

        this.beginSizingBlock(node as BlockStatement, index);
    }

    public beginVisitExpressionFunctionBody(node: ExpressionFunctionBody) {
        const viewState: BlockViewState = node.viewState;
        this.allEndpoints = viewState.connectors;
        viewState.isEndComponentInMain = true;
    }

    public endVisitExpressionFunctionBody(node: ExpressionFunctionBody) {
        // TODO: Work on this after proper design review for showing expression bodied functions.
        this.cleanMaps();
    }

    public endVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode) {
        const viewState = node.viewState as BlockViewState;
        const functionViewState: FunctionViewState = parent?.viewState as FunctionViewState;
        const triggerVS = functionViewState?.trigger;

        let index = 0;
        let height = 0;
        let width = 0;
        let leftWidth = 0;
        let rightWidth = 0;


        if (viewState.hasWorkerDecl) {
            const workerInitStatements = (node as FunctionBodyBlock).namedWorkerDeclarator.workerInitStatements;
            ({ index, height, width, leftWidth, rightWidth } = this.calculateStatementSizing(workerInitStatements, index, viewState, height, width, workerInitStatements.length + node.statements.length, leftWidth, rightWidth));

            const plusAfterWorker = getPlusViewState(index, viewState.plusButtons);

            if (plusAfterWorker) {
                plusAfterWorker.allowWorker = true;
            }

            // height += DefaultConfig.dotGap * 10;
            height += START_SVG_HEIGHT + (triggerVS.offsetFromBottom * 2);
        }

        this.endSizingBlock(node as BlockStatement, index + node.statements.length, width, height, index, leftWidth, rightWidth);

        if (!viewState.hasWorkerDecl) {
            viewState.plusButtons.forEach(plusVS => {
                plusVS.allowWorker = true;
            })
        }

    }

    public beginVisitBlockStatement(node: BlockStatement, parent?: STNode) {
        if (STKindChecker.isFunctionBodyBlock(parent) || STKindChecker.isBlockStatement(parent)) {
            this.sizeStatement(node);
        } else {
            this.beginSizingBlock(node);
        }
    }

    public endVisitBlockStatement(node: BlockStatement, parent?: STNode) {
        if (STKindChecker.isFunctionBodyBlock(parent) || STKindChecker.isBlockStatement(parent)) {
            this.sizeStatement(node);
        } else {
            this.endSizingBlock(node, node.statements.length);
        }
    }

    public endVisitLocalVarDecl(node: LocalVarDecl) {
        this.sizeStatement(node);
    }

    public endVisitAssignmentStatement(node: AssignmentStatement) {
        this.sizeStatement(node);
    }

    public endVisitActionStatement(node: ActionStatement) {
        this.sizeStatement(node);
    }

    public endVisitCallStatement(node: CallStatement) {
        this.sizeStatement(node);
    }

    public beginVisitForeachStatement(node: ForeachStatement) {
        const bodyViewState: BlockViewState = node.blockStatement.viewState;
        const viewState: ForEachViewState = node.viewState;

        bodyViewState.collapsed = viewState.folded ? viewState.folded : viewState.collapsed;
    }

    public endVisitForeachStatement(node: ForeachStatement) {
        const bodyViewState: BlockViewState = node.blockStatement.viewState;
        const viewState: ForEachViewState = node.viewState;
        viewState.foreachBody = bodyViewState;
        viewState.foreachHead.h = FOREACH_SVG_HEIGHT;
        viewState.foreachHead.w = FOREACH_SVG_WIDTH;
        viewState.foreachHead.rw = FOREACH_SVG_WIDTH / 2;
        viewState.foreachHead.lw = FOREACH_SVG_WIDTH / 2;

        if (viewState.folded) {
            viewState.foreachLifeLine.h = 0;

            viewState.foreachBodyRect.lw = (viewState.foreachBody.bBox.lw > 0)
                ? viewState.foreachHead.lw + DefaultConfig.horizontalGapBetweenComponents
                + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap
                : viewState.foreachBody.bBox.lw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;

            viewState.foreachBodyRect.rw = (viewState.foreachBody.bBox.rw > 0)
                ? viewState.foreachHead.rw + DefaultConfig.horizontalGapBetweenComponents
                + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap
                : viewState.foreachBody.bBox.rw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;

            viewState.foreachBodyRect.w = viewState.foreachBodyRect.lw + viewState.foreachBodyRect.rw;

            viewState.foreachBodyRect.h = (viewState.foreachHead.h / 2) + DefaultConfig.forEach.offSet +
                COLLAPSE_DOTS_SVG_HEIGHT + DefaultConfig.forEach.offSet;
        } else {
            viewState.foreachLifeLine.h = viewState.foreachHead.offsetFromBottom + viewState.foreachBody.bBox.h;

            viewState.foreachBodyRect.lw = (viewState.foreachBody.bBox.lw > 0)
                ? viewState.foreachBody.bBox.lw + DefaultConfig.horizontalGapBetweenComponents + DefaultConfig.dotGap + DefaultConfig.forEach.emptyHorizontalGap
                : viewState.foreachBody.bBox.lw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;

            viewState.foreachBodyRect.rw = (viewState.foreachBody.bBox.rw > 0)
                ? viewState.foreachBody.bBox.rw + DefaultConfig.horizontalGapBetweenComponents + DefaultConfig.dotGap + DefaultConfig.forEach.emptyHorizontalGap
                : viewState.foreachBody.bBox.rw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;

            viewState.foreachBodyRect.w = viewState.foreachBodyRect.lw + viewState.foreachBodyRect.rw;

            viewState.foreachBodyRect.h = (viewState.foreachHead.h / 2) +
                viewState.foreachLifeLine.h + viewState.foreachBodyRect.offsetFromBottom;

            // deducting the svg lifeline height(STOP SVG height and offset) is a end component is there
            if (viewState.foreachBody.isEndComponentAvailable) {
                viewState.foreachLifeLine.h = viewState.foreachLifeLine.h - viewState.foreachBodyRect.offsetFromBottom
                    - STOP_SVG_HEIGHT;
            }
        }

        viewState.bBox.h = (viewState.foreachHead.h / 2) + viewState.foreachBodyRect.h;
        viewState.bBox.lw = viewState.foreachBodyRect.lw;
        viewState.bBox.rw = viewState.foreachBodyRect.rw;
        viewState.bBox.w = viewState.foreachBodyRect.w;
    }

    public beginVisitWhileStatement(node: WhileStatement) {
        const bodyViewState: BlockViewState = node.whileBody.viewState;
        const viewState: WhileViewState = node.viewState;

        bodyViewState.collapsed = viewState.folded ? viewState.folded : viewState.collapsed;
    }

    public endVisitWhileStatement(node: WhileStatement) {
        const bodyViewState: BlockViewState = node.whileBody.viewState;
        const viewState: WhileViewState = node.viewState;
        viewState.whileBody = bodyViewState;

        viewState.whileHead.h = WHILE_SVG_HEIGHT;
        viewState.whileHead.w = WHILE_SVG_WIDTH;
        viewState.whileHead.lw = WHILE_SVG_WIDTH / 2;
        viewState.whileHead.rw = WHILE_SVG_WIDTH / 2;

        if (viewState.folded) {
            viewState.whileLifeLine.h = 0;
            viewState.whileBodyRect.lw = (viewState.whileBody.bBox.lw > 0)
                ? viewState.whileHead.lw + DefaultConfig.horizontalGapBetweenComponents
                + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap
                : viewState.whileBody.bBox.lw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;
            viewState.whileBodyRect.rw = (viewState.whileBody.bBox.rw > 0)
                ? viewState.whileHead.rw + DefaultConfig.horizontalGapBetweenComponents
                + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap
                : viewState.whileBody.bBox.rw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;

            viewState.whileBodyRect.w = viewState.whileBodyRect.rw + viewState.whileBodyRect.lw;
            viewState.whileBodyRect.h = (viewState.whileHead.h / 2) + DefaultConfig.forEach.offSet +
                COLLAPSE_DOTS_SVG_HEIGHT + DefaultConfig.forEach.offSet;
        } else {
            viewState.whileLifeLine.h = viewState.whileHead.offsetFromBottom + viewState.whileBody.bBox.h;

            viewState.whileBodyRect.lw = (viewState.whileBody.bBox.lw > 0)
                ? viewState.whileBody.bBox.lw + DefaultConfig.horizontalGapBetweenComponents
                : viewState.whileBody.bBox.lw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;

            viewState.whileBodyRect.rw = (viewState.whileBody.bBox.rw > 0)
                ? viewState.whileBody.bBox.rw + DefaultConfig.horizontalGapBetweenComponents
                : viewState.whileBody.bBox.rw + DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap;

            viewState.whileBodyRect.w = viewState.whileBodyRect.lw + viewState.whileBodyRect.rw;

            viewState.whileBodyRect.h = (viewState.whileHead.h / 2) +
                viewState.whileLifeLine.h + viewState.whileBodyRect.offsetFromBottom;

            // deducting the svg lifeline height(STOP SVG height and offset) is a end component is there
            if (viewState.whileBody.isEndComponentAvailable) {
                viewState.whileLifeLine.h = viewState.whileLifeLine.h - viewState.whileBodyRect.offsetFromBottom
                    - STOP_SVG_HEIGHT;
            }
        }

        viewState.bBox.h = (viewState.whileHead.h / 2) + viewState.whileBodyRect.h;
        viewState.bBox.lw = viewState.whileBodyRect.lw;
        viewState.bBox.rw = viewState.whileBodyRect.rw;
        viewState.bBox.w = viewState.whileBodyRect.w;
    }

    public beginVisitDoStatement(node: DoStatement, parent?: STNode): void {
        const viewState: DoStatementViewState = node.viewState as DoStatementViewState;
        viewState.doBodyVS = node.blockStatement.viewState as BlockViewState;
        viewState.onFailBodyVS = node.onFailClause.viewState as OnFailClauseViewState;
        viewState.doHeadVS.h = IFELSE_SVG_HEIGHT;
        viewState.doHeadVS.lw = IFELSE_SVG_WIDTH / 2;
        viewState.doHeadVS.rw = IFELSE_SVG_WIDTH / 2;
        viewState.doHeadVS.w = IFELSE_SVG_WIDTH;
    }

    public endVisitDoStatement(node: DoStatement, parent?: STNode): void {
        const viewState: DoStatementViewState = node.viewState as DoStatementViewState;
        const doBlockLifeline: SimpleBBox = viewState.doBodyLifeLine as SimpleBBox;
        const doHeadVS = viewState.doHeadVS;
        const doBlockVS = viewState.doBodyVS;
        const onFailBlockVS = viewState.onFailBodyVS;
        viewState.bBox.h = doHeadVS.h + doHeadVS.offsetFromBottom + doBlockVS.bBox.h + onFailBlockVS.bBox.h + DefaultConfig.offSet;
        doBlockLifeline.h = doHeadVS.offsetFromBottom + doBlockVS.bBox.h;
        if (doBlockVS.isEndComponentAvailable) {
            doBlockLifeline.h = doBlockVS.bBox.h - DefaultConfig.offSet ;
        }
        viewState.bBox.lw = doBlockVS.bBox.lw > onFailBlockVS.bBox.lw ? doBlockVS.bBox.lw : onFailBlockVS.bBox.lw;
        viewState.bBox.lw += DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap
        viewState.bBox.rw = doBlockVS.bBox.rw > onFailBlockVS.bBox.rw ? doBlockVS.bBox.rw : onFailBlockVS.bBox.rw;
        viewState.bBox.rw += DefaultConfig.forEach.emptyHorizontalGap + DefaultConfig.dotGap
        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;
    }

    public beginVisitOnFailClause(node: OnFailClause, parent?: STNode) {
        const viewState: OnFailClauseViewState = node.viewState as OnFailClauseViewState;
        viewState.onFailBodyVS = node.blockStatement.viewState as BlockViewState;
        viewState.onFailHeadVS.h = IFELSE_SVG_HEIGHT;
        viewState.onFailHeadVS.lw = IFELSE_SVG_WIDTH / 2;
        viewState.onFailHeadVS.rw = IFELSE_SVG_WIDTH / 2;
        viewState.onFailHeadVS.w = IFELSE_SVG_WIDTH;
    }

    public endVisitOnFailClause(node: OnFailClause, parent?: STNode) {
        const viewState: OnFailClauseViewState = node.viewState as OnFailClauseViewState;
        const onFailHeadVS = viewState.onFailHeadVS;
        const onFailBlockVS = viewState.onFailBodyVS;
        const onFailLifeLine = viewState.onFailBodyLifeLine as SimpleBBox;
        viewState.bBox.h = onFailHeadVS.h + onFailHeadVS.offsetFromBottom + onFailBlockVS.bBox.h + DefaultConfig.offSet;
        viewState.bBox.lw = onFailBlockVS.bBox.lw;
        viewState.bBox.rw = onFailBlockVS.bBox.rw;
        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;
        onFailLifeLine.h = onFailHeadVS.offsetFromBottom + onFailBlockVS.bBox.h;
        if (onFailBlockVS.isEndComponentAvailable) {
            onFailLifeLine.h = onFailBlockVS.bBox.h - DefaultConfig.offSet ;
        }
    }

    public beginVisitIfElseStatement(node: IfElseStatement) {
        const viewState: IfViewState = node.viewState;
        const ifBodyViewState: BlockViewState = node.ifBody.viewState;

        viewState.headIf.h = IFELSE_SVG_HEIGHT;
        viewState.headIf.lw = IFELSE_SVG_WIDTH / 2;
        viewState.headIf.rw = IFELSE_SVG_WIDTH / 2;
        viewState.headIf.w = IFELSE_SVG_WIDTH;

        // Set predefined max width for the condition text.
        // If text is more lengthier than this it will truncate the text.
        viewState.conditionAssignment.w = CONDITION_ASSIGNMENT_NAME_WIDTH;

        if (viewState.collapsed) {
            ifBodyViewState.collapsed = viewState.collapsed;
        }

        ifBodyViewState.bBox.lw = viewState.headIf.lw;
        ifBodyViewState.bBox.rw = viewState.headIf.rw;
        ifBodyViewState.bBox.w = viewState.headIf.w;

        ifBodyViewState.bBox.h = 0;

        if (node.elseBody?.elseBody) {
            if (node.elseBody.elseBody.kind === "BlockStatement") {
                const elseViewState: ElseViewState = node.elseBody.elseBody.viewState as ElseViewState;
                elseViewState.ifHeadWidthOffset = viewState.headIf.rw;
                elseViewState.ifHeadHeightOffset = viewState.headIf.h / 2;
                elseViewState.isElseBlock = true;
            } else if (node.elseBody.elseBody.kind === "IfElseStatement") {
                const elseIfViewState: IfViewState = node.elseBody.elseBody.viewState as IfViewState;
                elseIfViewState.childElseIfViewState = [];
                elseIfViewState.childElseViewState = undefined;
                elseIfViewState.isElseIf = true;
            }
        } else {
            // setting a default else statement when else is not defined
            viewState.defaultElseVS = new ElseViewState();
            viewState.defaultElseVS.ifHeadWidthOffset = viewState.headIf.rw;
            viewState.defaultElseVS.ifHeadHeightOffset = viewState.headIf.h / 2;
        }

        viewState.bBox.h = viewState.headIf.h + ifBodyViewState.bBox.length;
        viewState.bBox.lw = 0;
        viewState.bBox.rw = viewState.offSetBetweenIfElse;
        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;
    }

    public endVisitIfElseStatement(node: IfElseStatement) {
        // replaces endVisitIf
        const viewState: IfViewState = node.viewState;
        const ifBodyViewState: BlockViewState = node.ifBody.viewState;
        ifBodyViewState.bBox.length = viewState.headIf.offsetFromBottom + ifBodyViewState.bBox.h + viewState.verticalOffset;
        let elseWidth = 0;
        let elseLeftWidth = 0;
        let elseRightWidth = 0;
        viewState.ifBody = ifBodyViewState;

        // Below will calculate the left and right width difference
        // Between If Head component (rectangale) and if block's body's left and right widths.
        // This will be later used to calculate widths of If Statement and Else if and else statements
        // By using this right width to calculate the gap between if and each elseif and else
        // as they grow to the right.
        let diffIfWidthWithHeadWidth = 0;
        let diffIfWidthWithHeadWidthLeft = 0;
        if (viewState.headIf.rw < ifBodyViewState.bBox.rw) {
            diffIfWidthWithHeadWidth = (ifBodyViewState.bBox.rw - viewState.headIf.rw);
        }

        if (viewState.headIf.lw < ifBodyViewState.bBox.lw) {
            diffIfWidthWithHeadWidthLeft = (ifBodyViewState.bBox.lw - viewState.headIf.lw);
        }

        if (node.elseBody) {
            if (STKindChecker.isBlockStatement(node.elseBody.elseBody)) {
                const elseStmt: BlockStatement = node.elseBody.elseBody as BlockStatement;
                const elseViewState: ElseViewState = elseStmt.viewState as ElseViewState;

                viewState.childElseViewState = elseViewState;

                if (elseViewState.isEndComponentAvailable) {
                    elseViewState.elseBody.length = viewState.headIf.offsetFromBottom + elseViewState.bBox.h;
                } else {
                    elseViewState.elseBody.length = elseViewState.ifHeadHeightOffset +
                        viewState.headIf.offsetFromBottom + elseViewState.bBox.h + viewState.verticalOffset;
                }

                if ((elseViewState.bBox.h < ifBodyViewState.bBox.h) && !elseViewState.isEndComponentAvailable) {
                    elseViewState.elseBody.length += ifBodyViewState.bBox.h - elseViewState.bBox.h;
                } else if (elseViewState.bBox.h >= ifBodyViewState.bBox.h) {
                    ifBodyViewState.bBox.length += elseViewState.bBox.h - ifBodyViewState.bBox.h;
                }
                elseLeftWidth = elseViewState.bBox.lw;
                elseRightWidth = elseViewState.bBox.rw;
                elseWidth = elseLeftWidth + elseRightWidth;

                elseViewState.elseTopHorizontalLine.length = diffIfWidthWithHeadWidth + viewState.offSetBetweenIfElse + elseLeftWidth;
                elseViewState.elseBottomHorizontalLine.length = elseViewState.ifHeadWidthOffset +
                    diffIfWidthWithHeadWidth + viewState.offSetBetweenIfElse + elseLeftWidth;
            } else if (STKindChecker.isIfElseStatement(node.elseBody.elseBody)) {
                const elseIfStmt: IfElseStatement = node.elseBody.elseBody as IfElseStatement;
                const elseIfViewState: IfViewState = elseIfStmt.viewState as IfViewState;
                const elseIfBodyViewState: BlockViewState = elseIfStmt.ifBody.viewState;
                elseIfViewState.elseIfHeadWidthOffset = elseIfViewState.headIf.rw;
                elseIfViewState.elseIfHeadHeightOffset = elseIfViewState.headIf.h / 2;

                elseIfViewState.elseIfLifeLine.h = elseIfViewState.bBox.h - elseIfViewState.headIf.h;

                let diffElseIfWidthWithHeadWidthLeft = 0;
                if (elseIfBodyViewState.bBox.lw > elseIfViewState.headIf.lw) {
                    diffElseIfWidthWithHeadWidthLeft = (elseIfBodyViewState.bBox.lw - elseIfViewState.headIf.lw);
                }

                elseWidth = elseIfViewState.bBox.w;
                elseLeftWidth = elseIfViewState.bBox.lw;
                elseRightWidth = elseIfViewState.bBox.rw;

                elseIfViewState.elseIfTopHorizontalLine.length = diffIfWidthWithHeadWidth + elseIfViewState.offSetBetweenIfElse + diffElseIfWidthWithHeadWidthLeft;
                elseIfViewState.elseIfBottomHorizontalLine.length = (viewState.headIf.rw) + diffIfWidthWithHeadWidth + elseIfViewState.offSetBetweenIfElse
                    + diffElseIfWidthWithHeadWidthLeft + (elseIfViewState.headIf.lw);

                elseIfViewState.childElseIfViewState.forEach((childViewState: IfViewState) => {
                    viewState.childElseIfViewState.push(childViewState)
                });
                // Add child`s else if view state to the parent
                viewState.childElseIfViewState.push(elseIfViewState);
            }

            // identifying the final else or else-if statement
            if (!viewState.isElseIf) {
                const elseIfViewStateChildren: IfViewState[] = viewState.childElseIfViewState;
                if (elseIfViewStateChildren?.length > 0) {
                    let maxHeight: number = elseIfViewStateChildren[0].elseIfLifeLine.h;
                    for (let i = 1; i < elseIfViewStateChildren.length; i++) {
                        if (maxHeight < elseIfViewStateChildren[i].elseIfLifeLine.h) {
                            maxHeight = elseIfViewStateChildren[i].elseIfLifeLine.h;
                        }
                    }

                    // setting if line height
                    if (maxHeight < (ifBodyViewState.bBox.h + (2 * DefaultConfig.offSet))) {
                        maxHeight = ifBodyViewState.bBox.h + (2 * DefaultConfig.offSet);
                    } else {
                        ifBodyViewState.bBox.length += maxHeight - ifBodyViewState.bBox.h - (2 * DefaultConfig.offSet);
                    }

                    // setting if and else line height
                    const childElseViewState: ElseViewState = elseIfViewStateChildren[0]?.childElseViewState as ElseViewState;
                    if (childElseViewState && (maxHeight < (childElseViewState.bBox.h + (2 * DefaultConfig.offSet)))) {
                        maxHeight = childElseViewState.bBox.h + (2 * DefaultConfig.offSet);
                        ifBodyViewState.bBox.length = maxHeight;
                    } else if (childElseViewState && (maxHeight > childElseViewState.bBox.h)) {
                        childElseViewState.elseBody.length = maxHeight + (IFELSE_SVG_HEIGHT / 2);
                    }

                    // updating the heights with max height in else-ifs
                    for (const elseIfChild of elseIfViewStateChildren) {
                        elseIfChild.elseIfLifeLine.h = maxHeight;
                    }
                }
            }

        } else {
            const defaultElseVS: ElseViewState = viewState.defaultElseVS as ElseViewState;
            defaultElseVS.elseBody.length = viewState.headIf.offsetFromBottom + defaultElseVS.ifHeadHeightOffset +
                ifBodyViewState.bBox.h + viewState.verticalOffset;
            elseWidth = defaultElseVS.bBox.w;
            elseLeftWidth = defaultElseVS.bBox.lw;
            elseRightWidth = defaultElseVS.bBox.rw;

            defaultElseVS.elseTopHorizontalLine.length = diffIfWidthWithHeadWidth + viewState.offSetBetweenIfElse;
            defaultElseVS.elseBottomHorizontalLine.length = defaultElseVS.ifHeadWidthOffset +
                diffIfWidthWithHeadWidth + viewState.offSetBetweenIfElse;
            viewState.childElseViewState = defaultElseVS;
        }

        // Calculate whole if/else statement width and height
        viewState.bBox.h = viewState.headIf.h + ifBodyViewState.bBox.length;
        viewState.bBox.lw = viewState.headIf.lw + (diffIfWidthWithHeadWidthLeft > viewState.conditionAssignment.w ? diffIfWidthWithHeadWidthLeft : viewState.conditionAssignment.w);
        viewState.bBox.rw = viewState.headIf.rw + diffIfWidthWithHeadWidth + viewState.offSetBetweenIfElse + elseWidth;
        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;
    }

    public beginVisitNamedWorkerDeclaration(node: NamedWorkerDeclaration) {
        // this.beginSizingBlock(node.workerBody);
        this.workerMap.set(node.workerName.value, node);
        this.currentWorker.push(node.workerName.value);
    }

    public endVisitNamedWorkerDeclaration(node: NamedWorkerDeclaration) {
        const viewState: WorkerDeclarationViewState = node.viewState as WorkerDeclarationViewState;
        const body: BlockStatement = node.workerBody as BlockStatement;
        const bodyViewState: BlockViewState = body.viewState;
        const lifeLine = viewState.workerLine;
        const trigger = viewState.trigger;
        const end = viewState.end;

        trigger.h = START_SVG_HEIGHT;
        trigger.lw = START_SVG_WIDTH / 2;
        trigger.rw = START_SVG_WIDTH / 2;
        trigger.w = trigger.lw + trigger.rw;

        end.bBox.rw = STOP_SVG_WIDTH / 2;
        end.bBox.lw = STOP_SVG_WIDTH / 2;
        end.bBox.w = STOP_SVG_WIDTH;
        end.bBox.h = STOP_SVG_HEIGHT;

        lifeLine.h = trigger.offsetFromBottom + bodyViewState.bBox.h + end.bBox.offsetFromTop;

        if (!bodyViewState.isEndComponentAvailable
            && (STKindChecker.isExpressionFunctionBody(body) || body.statements.length > 0)) {
            lifeLine.h += end.bBox.offsetFromTop;
        }

        viewState.bBox.h = lifeLine.h + trigger.h + end.bBox.h + DefaultConfig.serviceVerticalPadding * 2
            + DefaultConfig.functionHeaderHeight;
        viewState.bBox.lw = (trigger.lw > bodyViewState.bBox.lw ? trigger.lw : bodyViewState.bBox.lw) + DefaultConfig.serviceFrontPadding;
        viewState.bBox.rw = (trigger.rw > bodyViewState.bBox.rw ? trigger.rw : bodyViewState.bBox.rw) + DefaultConfig.serviceRearPadding;
        viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;

        if (viewState.initPlus && viewState.initPlus.selectedComponent === "PROCESS") {
            viewState.bBox.h += DefaultConfig.PLUS_HOLDER_STATEMENT_HEIGHT;
            if (viewState.bBox.w < DefaultConfig.PLUS_HOLDER_WIDTH) {
                viewState.bBox.w = DefaultConfig.PLUS_HOLDER_WIDTH;
            }
        }

        this.currentWorker.pop();
    }

    private sizeStatement(node: STNode) {
        if (!node.viewState) {
            return;
        }
        const viewState: StatementViewState = node.viewState;
        if ((viewState.isAction || viewState.isEndpoint) && !viewState.isCallerAction) {
            if (viewState.isAction && viewState.action.endpointName && !viewState.hidden) {
                viewState.dataProcess.h = PROCESS_SVG_HEIGHT;

                viewState.dataProcess.w = PROCESS_SVG_WIDTH;
                viewState.dataProcess.lw = PROCESS_SVG_WIDTH / 2;
                viewState.dataProcess.rw = PROCESS_SVG_WIDTH / 2;

                viewState.variableName.w = VARIABLE_NAME_WIDTH;
                viewState.variableAssignment.w = ASSIGNMENT_NAME_WIDTH;

                viewState.bBox.h = viewState.dataProcess.h;

                viewState.bBox.w = viewState.dataProcess.w + viewState.variableName.w + viewState.variableAssignment.w;
                viewState.bBox.lw = viewState.dataProcess.lw + viewState.variableName.w;
                viewState.bBox.rw = viewState.dataProcess.rw + viewState.variableAssignment.w;

                viewState.action.trigger.w = TRIGGER_RECT_SVG_WIDTH;
                viewState.action.trigger.lw = TRIGGER_RECT_SVG_WIDTH / 2;
                viewState.action.trigger.rw = TRIGGER_RECT_SVG_WIDTH / 2;

                viewState.action.trigger.h = TRIGGER_RECT_SVG_HEIGHT;
            }

            if (viewState.isEndpoint && viewState.endpoint.epName) {

                // Update endpoint sizing values.
                viewState.bBox.h = CLIENT_SVG_HEIGHT;
                viewState.bBox.r = CLIENT_RADIUS;

                if (isVarTypeDescriptor(node)) {
                    // renders process box if the endpoint var type
                    viewState.dataProcess.lw = (DefaultConfig.defaultBlockWidth) / 2;
                    viewState.dataProcess.rw = (DefaultConfig.defaultBlockWidth) / 2;

                    viewState.dataProcess.w = viewState.dataProcess.lw + viewState.dataProcess.rw;
                } else {
                    viewState.bBox.lw = (DefaultConfig.defaultBlockWidth) / 2;
                    viewState.bBox.rw = (DefaultConfig.defaultBlockWidth) / 2;

                    viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;
                }
            }
        } else {
            if (viewState.isCallerAction) {
                viewState.bBox.h = RESPOND_SVG_HEIGHT;
                viewState.bBox.w = RESPOND_SVG_WIDTH;
                viewState.bBox.lw = RESPOND_SVG_WIDTH / 2;
                viewState.bBox.rw = RESPOND_SVG_WIDTH / 2;
            } else if (STKindChecker.isReturnStatement(node)) {
                viewState.bBox.h = RETURN_SVG_HEIGHT;
                viewState.bBox.w = RETURN_SVG_WIDTH + VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset;
                viewState.bBox.lw = (RETURN_SVG_WIDTH + VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset) / 2;
                viewState.bBox.rw = (RETURN_SVG_WIDTH + VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset) / 2;
            } else {
                viewState.dataProcess.h = PROCESS_SVG_HEIGHT;

                viewState.dataProcess.w = PROCESS_SVG_WIDTH;
                viewState.dataProcess.lw = PROCESS_SVG_WIDTH / 2;
                viewState.dataProcess.rw = PROCESS_SVG_WIDTH / 2;

                viewState.variableName.w = VARIABLE_NAME_WIDTH + DefaultConfig.textAlignmentOffset;
                viewState.variableAssignment.w = ASSIGNMENT_NAME_WIDTH + PROCESS_SVG_WIDTH_WITH_HOVER_SHADOW / 2 + (DefaultConfig.dotGap * 3);

                viewState.bBox.h = viewState.dataProcess.h;

                viewState.bBox.lw = viewState.dataProcess.lw + viewState.variableName.w;
                viewState.bBox.rw = viewState.dataProcess.rw + viewState.variableAssignment.w;
                viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;

                // todo: commented because this is always true
                // if (STKindChecker.isLocalVarDecl) {
                //     const varDeclatarion = node as LocalVarDecl
                // } else {
                //     viewState.bBox.w = viewState.dataProcess.w + viewState.variableAssignment.w;
                // }
            }
        }
        if (viewState.functionNode) {
            if (viewState.functionNodeExpanded) {
                recalculateSizingAndPositioning(viewState.functionNode, null, this.allEndpoints);
                const newHeight = viewState.functionNode.viewState.bBox.h - (PROCESS_SVG_HEIGHT * 2 + DefaultConfig.dotGap * 3);
                viewState.bBox.h += newHeight;
                if (viewState.functionNode.viewState.bBox.rw > viewState.bBox.rw) {
                    viewState.bBox.rw = viewState.functionNode.viewState.bBox.rw;
                }
                viewState.bBox.w = viewState.bBox.lw + viewState.bBox.rw;
            }
        }
    }

    private getMaxCX(endpoints: Map<string, Endpoint>) {
        let max = 0;
        endpoints.forEach((ep: Endpoint, key: string) => {
            if (ep.visibleEndpoint.viewState.lifeLine.cx > max) {
                max = ep.visibleEndpoint.viewState.lifeLine.cx;
            }
        });
        return max;
    }
    private beginSizingBlock(node: BlockStatement, index: number = 0) {
        if (!node.viewState) {
            return;
        }
        const blockViewState: BlockViewState = node.viewState;
        index = this.initiateStatementSizing(node.statements, index, blockViewState);

        // add END component dimensions for return statement
        if (blockViewState.isEndComponentAvailable && !blockViewState.collapseView &&
            !blockViewState.isEndComponentInMain) {
            const returnViewState: StatementViewState = node.statements[node.statements.length - 1].viewState;
            returnViewState.bBox.h = STOP_SVG_HEIGHT;
            returnViewState.bBox.w = STOP_SVG_WIDTH;
            returnViewState.bBox.lw = STOP_SVG_WIDTH / 2;
            returnViewState.bBox.rw = STOP_SVG_WIDTH / 2;
        }
    }

    private initiateStatementSizing(statements: STNode[], index: number, blockViewState: BlockViewState) {
        statements.forEach((element) => {
            const stmtViewState: StatementViewState = element.viewState;
            const plusForIndex: PlusViewState = getPlusViewState(index, blockViewState.plusButtons);

            if (isSTActionInvocation(element)
                && !haveBlockStatement(element)
                && this.allEndpoints
                && this.allEndpoints.has(stmtViewState.action.endpointName)
            ) {
                // check if it's the same as actioninvocation
                stmtViewState.isAction = true;
            }
            ++index;
        });
        return index;
    }

    private endSizingBlock(node: BlockStatement, lastStatementIndex: number, width: number = 0, height: number = 0,
                           index: number = 0, leftWidth: number = 0, rightWidth: number = 0) {
        if (!node.viewState) {
            return;
        }
        const blockViewState: BlockViewState = node.viewState;

        // Add last plus button.
        const plusViewState: PlusViewState = getPlusViewState(lastStatementIndex, blockViewState.plusButtons);

        if (plusViewState && plusViewState.draftAdded) {
            const draft: DraftStatementViewState = new DraftStatementViewState();
            draft.type = plusViewState.draftAdded;
            draft.subType = plusViewState.draftSubType;
            draft.connector = plusViewState.draftConnector;
            draft.selectedConnector = plusViewState.draftSelectedConnector;
            draft.targetPosition = {
                startLine: node.position.endLine, // todo: can't find the equivalent to position
                startColumn: node.position.endColumn - 1
            };
            blockViewState.draft = [lastStatementIndex, draft];
            plusViewState.draftAdded = undefined;
        } else if (plusViewState?.collapsedClicked) {
            plusViewState.index = lastStatementIndex;
            plusViewState.expanded = false;
        } else if (plusViewState && plusViewState.collapsedPlusDuoExpanded) {
            height += PLUS_SVG_HEIGHT;
        } else if (!plusViewState && !blockViewState.isEndComponentAvailable) {
            const plusBtnViewBox: PlusViewState = new PlusViewState();
            plusBtnViewBox.index = lastStatementIndex;
            plusBtnViewBox.expanded = false;
            plusBtnViewBox.isLast = true;
            plusBtnViewBox.targetPosition = {
                startLine: node.position.endLine,
                startColumn: node.position.endColumn - 1,
                endLine: node.position.endLine,
                endColumn: node.position.endColumn - 1
            }
            blockViewState.plusButtons.push(plusBtnViewBox);
        }

        ({
            index, height, width, leftWidth, rightWidth
        } = this.calculateStatementSizing(node.statements, index, blockViewState, height, width, lastStatementIndex, leftWidth, rightWidth));

        if (blockViewState.draft && blockViewState.draft[0] === lastStatementIndex) {
            // Get the draft.
            const draft = blockViewState.draft[1];
            if (draft) {
                const { h, w } = getDraftComponentSizes(draft.type, draft.subType);
                draft.bBox.h = h;
                draft.bBox.offsetFromBottom = draft.bBox.offsetFromTop = DefaultConfig.offSet;
                draft.bBox.w = w;
                draft.bBox.lw = w / 2;
                draft.bBox.rw = w / 2;
                height += draft.getHeight();
                if (width < draft.bBox.w) {
                    width = draft.bBox.w;
                }
                if (leftWidth < draft.bBox.lw) {
                    leftWidth = draft.bBox.lw;
                }
                if (rightWidth < draft.bBox.rw) {
                    rightWidth = draft.bBox.rw;
                }
            }
        }

        if (height > 0) {
            blockViewState.bBox.h = height;
        }


        blockViewState.bBox.lw = leftWidth > 0 ? leftWidth + (node?.controlFlow ? METRICS_LABEL_MARGIN : 0) : DefaultConfig.defaultBlockWidth / 2;
        blockViewState.bBox.rw = rightWidth > 0 ? rightWidth : DefaultConfig.defaultBlockWidth / 2;

        blockViewState.bBox.w = blockViewState.bBox.lw + blockViewState.bBox.rw;

        blockViewState.collapsedViewStates.forEach(collapsedVS => {
            if (!collapsedVS.collapsed) {
                collapsedVS.bBox.lw = blockViewState.bBox.lw;
                collapsedVS.bBox.rw = blockViewState.bBox.rw;
                collapsedVS.bBox.offsetFromTop = DefaultConfig.offSet;
                collapsedVS.bBox.offsetFromBottom = DefaultConfig.offSet;

                collapsedVS.bBox.w = collapsedVS.bBox.lw + collapsedVS.bBox.rw;
            }
        });
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

    private seperateWorkerStatements(statement: STNode, index: number, startIndex: number) {

        if (STKindChecker.isActionStatement(statement)) {
            if (statement.expression.kind === 'AsyncSendAction') {
                const sendExpression: any = statement.expression;
                const targetName: string = sendExpression.peerWorker?.name?.value as string;
                this.addToSendReceiveMap('Send', {
                    to: targetName, node: statement, paired: false, index: (index - startIndex)
                });
            } else if (STKindChecker.isWaitAction(statement.expression)
                && STKindChecker.isSimpleNameReference(statement.expression.waitFutureExpr)) {
                this.addToSendReceiveMap('Wait', {
                    for: statement.expression.waitFutureExpr.name.value,
                    node: statement,
                    index: (index - startIndex)
                });
            } else if (STKindChecker.isCheckAction(statement.expression)
                && STKindChecker.isWaitAction(statement.expression.expression)
                && STKindChecker.isSimpleNameReference(statement.expression.expression.waitFutureExpr)) {
                this.addToSendReceiveMap('Wait', {
                    for: statement.expression.expression.waitFutureExpr.name.value,
                    node: statement,
                    index: (index - startIndex)
                });
            }
        } else if (STKindChecker.isLocalVarDecl(statement) && statement.initializer) {
            if (statement.initializer?.kind === 'ReceiveAction') {
                const receiverExpression: any = statement.initializer;
                const senderName: string = receiverExpression.receiveWorkers?.name?.value;
                this.addToSendReceiveMap('Receive',
                    { from: senderName, node: statement, paired: false, index: (index - startIndex) });
            } else if (STKindChecker.isCheckAction(statement.initializer)
                && (statement.initializer.expression.kind === 'ReceiveAction')) {
                const receiverExpression: any = statement.initializer.expression;
                const senderName: string = receiverExpression.receiveWorkers?.name?.value;

                this.addToSendReceiveMap('Receive',
                    { from: senderName, node: statement, paired: false, index: (index - startIndex) });
            } else if (STKindChecker.isWaitAction(statement.initializer)
                && STKindChecker.isSimpleNameReference(statement.initializer.waitFutureExpr)) {
                this.addToSendReceiveMap('Wait', {
                    for: statement.initializer.waitFutureExpr.name.value,
                    node: statement,
                    index: (index - startIndex)
                });
            } else if (STKindChecker.isCheckAction(statement.initializer)
                && STKindChecker.isWaitAction(statement.initializer.expression)
                && STKindChecker.isSimpleNameReference(statement.initializer.expression.waitFutureExpr)) {
                this.addToSendReceiveMap('Wait', {
                    for: statement.initializer.expression.waitFutureExpr.name.value,
                    node: statement,
                    index: (index - startIndex)
                });
            }
        } else if (STKindChecker.isAssignmentStatement(statement)) {
            if (statement.expression?.kind === 'ReceiveAction') {
                const receiverExpression: any = statement.expression;
                const senderName: string = receiverExpression.receiveWorkers?.name?.value;
                this.addToSendReceiveMap('Receive',
                    { from: senderName, node: statement, paired: false, index: (index - startIndex) });
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
                    index: (index - startIndex)
                });
            } else if (STKindChecker.isCheckAction(statement.expression)
                && STKindChecker.isWaitAction(statement.expression.expression)
                && STKindChecker.isSimpleNameReference(statement.expression.expression.waitFutureExpr)) {
                this.addToSendReceiveMap('Wait', {
                    for: statement.expression.expression.waitFutureExpr.name.value,
                    node: statement,
                    index: (index - startIndex)
                });
            }
        } else if (STKindChecker.isReturnStatement(statement) && statement.expression
            && STKindChecker.isWaitAction(statement.expression) && statement.expression.waitFutureExpr
            && STKindChecker.isSimpleNameReference(statement.expression.waitFutureExpr)) {
            this.addToSendReceiveMap('Wait', {
                for: statement.expression.waitFutureExpr.name.value,
                node: statement,
                index: (index - startIndex)
            });
        }
    }

    private calculateStatementSizing(statements: STNode[], index: number, blockViewState: BlockViewState,
                                     height: number, width: number, lastStatementIndex: any, leftWidth: number,
                                     rightWidth: number) {
        const startIndex = index;

        blockViewState.collapsedViewStates.forEach(collapsedVS => {
            // if (!collapsedVS.bBox) {
            // }

            if (collapsedVS.collapsed) {
                collapsedVS.bBox = new SimpleBBox();
                collapsedVS.bBox.offsetFromTop = DefaultConfig.interactionModeOffset;
                collapsedVS.bBox.offsetFromBottom = DefaultConfig.interactionModeOffset;
                collapsedVS.bBox.lw = COLLAPSED_BLOCK_WIDTH / 2;
                collapsedVS.bBox.rw = COLLAPSED_BLOCK_WIDTH / 2;
                collapsedVS.bBox.h = COLLAPSED_BLOCK_HEIGHT;

                height += collapsedVS.getHeight();
            }
        });

        statements.forEach((statement) => {
            const stmtViewState: StatementViewState = statement.viewState;
            const plusForIndex: PlusViewState = getPlusViewState(index, blockViewState.plusButtons);

            // identify sends, recieves, and waits and put them into a map
            this.seperateWorkerStatements(statement, index, startIndex);

            // This captures the collapsed statement
            if (blockViewState.collapsedFrom === index && blockViewState.collapseView) {
                // This captures the collapse button click
                if (plusForIndex && plusForIndex.collapsedClicked) {
                    const collapsedView = blockViewState.collapseView;
                    collapsedView.bBox.h = collapsedView.bBox.offsetFromTop + COLLAPSED_BLOCK_HEIGHT
                        + collapsedView.bBox.offsetFromBottom;
                    collapsedView.bBox.lw = COLLAPSED_BLOCK_WIDTH / 2;
                    collapsedView.bBox.rw = COLLAPSED_BLOCK_WIDTH / 2;
                    collapsedView.bBox.w = collapsedView.bBox.lw + collapsedView.bBox.rw;

                    height += collapsedView.bBox.h;
                    if (width < collapsedView.bBox.w) {
                        width = collapsedView.bBox.w;
                    }
                    if (leftWidth < collapsedView.bBox.lw) {
                        leftWidth = collapsedView.bBox.lw;
                    }
                    if (rightWidth < collapsedView.bBox.rw) {
                        rightWidth = collapsedView.bBox.rw;
                    }

                    blockViewState.collapseView = collapsedView;

                    // to make the next plus invisible if the current statement is not the last statement
                    for (const invisiblePlusIndex of blockViewState.plusButtons) {
                        if (invisiblePlusIndex.index > index && invisiblePlusIndex.index !== lastStatementIndex) {
                            invisiblePlusIndex.visible = false;
                        }
                    }
                    plusForIndex.collapsedClicked = false;
                } else {
                    height += blockViewState.collapseView.bBox.h;
                    // updates the width if the block collapse view width the higher
                    if (width < blockViewState.collapseView.bBox.w) {
                        width = blockViewState.collapseView.bBox.w;
                    }
                    if (leftWidth < blockViewState.collapseView.bBox.lw) {
                        leftWidth = blockViewState.collapseView.bBox.lw;
                    }
                    if (rightWidth < blockViewState.collapseView.bBox.rw) {
                        rightWidth = blockViewState.collapseView.bBox.rw;
                    }
                    // Adding the height and width for collapsed duo click in a collapsed scenario
                    if (plusForIndex && !plusForIndex.collapsedClicked) {
                        if (plusForIndex && plusForIndex.draftAdded) {
                            const draft: DraftStatementViewState = new DraftStatementViewState();
                            draft.type = plusForIndex.draftAdded;
                            draft.subType = plusForIndex.draftSubType;
                            draft.connector = plusForIndex.draftConnector;
                            draft.selectedConnector = plusForIndex.draftSelectedConnector;

                            draft.targetPosition = {
                                startLine: statement.position.startLine,
                                startColumn: statement.position.startColumn
                            };
                            blockViewState.draft = [index, draft];
                            plusForIndex.draftAdded = undefined;
                        } else if (plusForIndex?.collapsedPlusDuoExpanded) {
                            height += PLUS_SVG_HEIGHT;
                            if (width < PLUS_SVG_WIDTH) {
                                width = PLUS_SVG_WIDTH;
                            }
                            if (leftWidth < (PLUS_SVG_WIDTH / 2)) {
                                leftWidth = (PLUS_SVG_WIDTH / 2);
                            }
                            if (rightWidth < (PLUS_SVG_WIDTH / 2)) {
                                rightWidth = (PLUS_SVG_WIDTH / 2);
                            }
                        }
                    }
                }
                // To handle collapses above the current statement where it has a collapse view
            } else if (blockViewState.collapsedFrom < index && blockViewState.collapseView) {
                // TODO: revisit this logic as this might not be needed and it might be wrong.
                // Adding the height and width for collapsed duo click in a collapsed scenario
                if (plusForIndex && !plusForIndex.collapsedClicked && plusForIndex?.collapsedPlusDuoExpanded) {
                    height += PLUS_SVG_HEIGHT;
                    if (width < PLUS_SVG_WIDTH) {
                        width = PLUS_SVG_WIDTH;
                    }
                    if (leftWidth < PLUS_SVG_WIDTH / 2) {
                        leftWidth = PLUS_SVG_WIDTH / 2;
                    }
                    if (rightWidth < PLUS_SVG_WIDTH / 2) {
                        rightWidth = PLUS_SVG_WIDTH / 2;
                    }
                }
            } else {
                if (plusForIndex && plusForIndex.draftAdded) {
                    const draft: DraftStatementViewState = new DraftStatementViewState();
                    draft.type = plusForIndex.draftAdded;
                    draft.subType = plusForIndex.draftSubType;
                    draft.connector = plusForIndex.draftConnector;
                    draft.selectedConnector = plusForIndex.draftSelectedConnector;

                    draft.targetPosition = {
                        startLine: statement.position.startLine,
                        startColumn: statement.position.startColumn
                    };
                    blockViewState.draft = [index, draft];
                    plusForIndex.draftAdded = undefined;
                } else if (plusForIndex && plusForIndex.collapsedPlusDuoExpanded) {
                    height += PLUS_SVG_HEIGHT;
                    if (width < PLUS_SVG_WIDTH) {
                        width = PLUS_SVG_WIDTH;
                    }
                    if (leftWidth < PLUS_SVG_WIDTH / 2) {
                        leftWidth = PLUS_SVG_WIDTH / 2;
                    }
                    if (rightWidth < PLUS_SVG_WIDTH / 2) {
                        rightWidth = PLUS_SVG_WIDTH / 2;
                    }
                } else if (!plusForIndex && !stmtViewState.hidden) {
                    const plusBtnViewState: PlusViewState = new PlusViewState();
                    plusBtnViewState.index = index;
                    plusBtnViewState.expanded = false;
                    plusBtnViewState.targetPosition = {
                        startLine: statement.position.startLine,
                        startColumn: statement.position.startColumn,
                        endLine: statement.position.startLine,
                        endColumn: statement.position.startColumn
                    };
                    blockViewState.plusButtons.push(plusBtnViewState);
                }

                if ((stmtViewState.isEndpoint && stmtViewState.isAction && !stmtViewState.hidden) ||
                    (!stmtViewState.collapsed)) {
                    // Excluding return statement heights which is in the main function block
                    if (!(blockViewState.isEndComponentInMain && (index === lastStatementIndex - 1))) {
                        height += stmtViewState.getHeight();
                    }
                }

                if ((width < stmtViewState.bBox.w) && !stmtViewState.collapsed) {
                    width = stmtViewState.bBox.w;
                }

                if ((leftWidth < stmtViewState.bBox.lw) && !stmtViewState.collapsed) {
                    leftWidth = stmtViewState.bBox.lw;
                }

                if ((rightWidth < stmtViewState.bBox.rw) && !stmtViewState.collapsed) {
                    rightWidth = stmtViewState.bBox.rw;
                }

            }


            if (blockViewState.draft && blockViewState.draft[0] === index) {
                // Get the draft.
                const draft = blockViewState.draft[1];
                if (draft) {
                    const { h, w } = getDraftComponentSizes(draft.type, draft.subType);
                    draft.bBox.h = h;
                    draft.bBox.offsetFromTop = draft.bBox.offsetFromBottom = DefaultConfig.offSet
                    draft.bBox.lw = w / 2;
                    draft.bBox.rw = w / 2;
                    draft.bBox.w = draft.bBox.lw + draft.bBox.rw;

                    height += draft.getHeight();

                    if (width < draft.bBox.w) {
                        width = draft.bBox.w;
                    }
                    if (leftWidth < draft.bBox.lw) {
                        leftWidth = draft.bBox.lw;
                    }

                    if (rightWidth < draft.bBox.rw) {
                        rightWidth = draft.bBox.rw;
                    }
                }
            }

            ++index;
        });
        return { index, height, width, leftWidth, rightWidth };
    }
}

export const sizingVisitor = new SizingVisitor();
