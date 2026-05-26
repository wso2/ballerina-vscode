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
    BlockStatement, ForeachStatement, FunctionBodyBlock, IfElseStatement,
    NamedWorkerDeclaration, STKindChecker, STNode, traversNode, Visitor,
    WhileStatement
} from "@wso2/syntax-tree";

import { COLLAPSE_SVG_HEIGHT } from "../Components/RenderingComponents/ForEach/ColapseButtonSVG";
import { FOREACH_SVG_HEIGHT } from "../Components/RenderingComponents/ForEach/ForeachSVG";
import { IFELSE_SVG_HEIGHT } from "../Components/RenderingComponents/IfElse/IfElseSVG";
import { WHILE_SVG_HEIGHT } from "../Components/RenderingComponents/While/WhileSVG";
import {
    BlockViewState, CollapseViewState, EndViewState, ForEachViewState, FunctionViewState, IfViewState, StatementViewState,
    WhileViewState
} from "../ViewState";
import { WorkerDeclarationViewState } from "../ViewState/worker-declaration";

import { DefaultConfig } from "./default";
import { ConflictRestrictSpace, DEFAULT_WORKER_NAME, SendRecievePairInfo, SizingVisitor } from "./sizing-visitor";
import { isPositionWithinRange } from "./util";

export class ConflictResolutionVisitor implements Visitor {
    private matchedPairInfo: SendRecievePairInfo[];
    private workerNames: string[];
    private hasConflict: boolean;
    private endPointPositions: ConflictRestrictSpace[];
    private workerCount: number;
    private evaluatingIf: boolean;
    private defaultOffset: number;

    constructor(matchedPairInfo: SendRecievePairInfo[], workerCount: number, defaultOffset: number) {
        this.matchedPairInfo = matchedPairInfo;
        this.workerNames = [];
        this.hasConflict = false;
        this.workerCount = workerCount;
        this.endPointPositions = [];
        this.evaluatingIf = false;
        this.defaultOffset = defaultOffset;
    }

    public conflictFound() {
        return this.hasConflict;
    }

    public resetConflictStatus() {
        this.hasConflict = false;
        this.endPointPositions = [];
    }

    beginVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode): void {
        this.workerNames.push(DEFAULT_WORKER_NAME);
        this.visitBlockStatement(node as BlockStatement, parent);
    }

    endVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode): void {
        this.workerNames = [];
    }

    beginVisitNamedWorkerDeclaration(node: NamedWorkerDeclaration, parent?: STNode): void {
        this.workerNames.push(node.workerName.value);
        this.visitBlockStatement(node.workerBody, node);
    }

    // beginVisitBlockStatement(node: BlockStatement, parent?: STNode): void {
    // }

    private visitBlockStatement(node: BlockStatement, parent?: STNode, height: number = 0) {
        const blockViewState: BlockViewState = node.viewState as BlockViewState;
        let collapsedViewStates: CollapseViewState[] = [...blockViewState.collapsedViewStates];

        node.statements.forEach((statementNode, statementIndex) => {
            const statementViewState: StatementViewState = statementNode.viewState as StatementViewState;

            for (let i = 0; i < collapsedViewStates.length; i++) {
                if (isPositionWithinRange(statementNode.position, collapsedViewStates[i].range)) {
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

            if (statementViewState.collapsed) return;

            if (blockViewState.draft && blockViewState.draft[0] === statementIndex) {
                height += blockViewState.draft[1].getHeight();
            }

            let updatedAsConflict = false;
            const statementBoxStartHeight = height + statementViewState.bBox.offsetFromTop;
            let statementBoxEndHeight = statementBoxStartHeight;

            if (STKindChecker.isIfElseStatement(statementNode)) {
                statementBoxEndHeight += IFELSE_SVG_HEIGHT;
            } else if (STKindChecker.isWhileStatement(statementNode)) {
                statementBoxEndHeight += WHILE_SVG_HEIGHT;
            } else if (STKindChecker.isForeachStatement(statementNode)) {
                statementBoxEndHeight += FOREACH_SVG_HEIGHT;
            } else {
                statementBoxEndHeight += statementViewState.bBox.h
            }

            if (!this.hasConflict) {
                updatedAsConflict = this.fixConflictsWithEndpoints(statementBoxStartHeight, statementBoxEndHeight,
                    statementViewState, statementIndex);
                if (!this.hasConflict) {
                    updatedAsConflict = this.fixConflictsWithMessages(statementBoxStartHeight, statementBoxEndHeight,
                        statementViewState, statementIndex);
                }
            }

            if (!updatedAsConflict) {
                let relatedPairInfo;
                let linkedViewState;

                if (statementViewState.isSend) {
                    relatedPairInfo = this.matchedPairInfo.find(pairInfo =>
                        pairInfo.sourceIndex === statementIndex
                        && pairInfo.sourceName === this.workerNames[this.workerNames.length - 1]);

                    linkedViewState = relatedPairInfo.targetViewState as StatementViewState;
                }

                if (statementViewState.isReceive) {
                    relatedPairInfo = this.matchedPairInfo.find(pairInfo =>
                        pairInfo.targetIndex === statementIndex
                        && pairInfo.targetName === this.workerNames[this.workerNames.length - 1]);

                    linkedViewState = relatedPairInfo.sourceViewState as StatementViewState;
                }

                if (relatedPairInfo && linkedViewState) {
                    if (height + statementViewState.bBox.offsetFromTop > relatedPairInfo.pairHeight) {
                        const newOffset = (height + statementViewState.bBox.offsetFromTop) - relatedPairInfo.pairHeight;

                        linkedViewState.bBox.offsetFromTop += newOffset;
                        relatedPairInfo.pairHeight += newOffset;
                        relatedPairInfo.restrictedSpace.y1 += newOffset;
                        relatedPairInfo.restrictedSpace.y2 += newOffset;
                    }
                }
            }

            if (STKindChecker.isIfElseStatement(statementNode)) {
                const ifViewState: IfViewState = statementNode.viewState as IfViewState;
                const ifStatementStartHeight = height + ifViewState.bBox.offsetFromTop + IFELSE_SVG_HEIGHT
                    + this.defaultOffset;
                this.fixIfElseStatementConflicts(statementNode, ifStatementStartHeight);
            }

            if (STKindChecker.isForeachStatement(statementNode)) {
                const forEachViewstate: ForEachViewState = statementNode.viewState as ForEachViewState;
                const forStatementStartHeight = height + forEachViewstate.bBox.offsetFromTop + this.defaultOffset;
                this.fixForEachBlockConflicts(statementNode, forStatementStartHeight)
            }

            if (STKindChecker.isWhileStatement(statementNode)) {
                const whileViewstate: WhileViewState = statementNode.viewState as WhileViewState;
                const forStatementStartHeight = height + whileViewstate.bBox.offsetFromTop + this.defaultOffset;
                this.fixWhileBlockConflicts(statementNode, forStatementStartHeight)
            }

            if (blockViewState.draft && blockViewState.draft[0] === node.statements.length) {
                height += blockViewState.draft[1].getHeight();
            }

            if (statementViewState.isEndpoint || statementViewState.isAction) {
                this.endPointPositions.push({
                    x1: this.workerNames.length - 1,
                    x2: this.workerCount + 1,
                    y1: height + statementViewState.bBox.offsetFromTop,
                    y2: height + statementViewState.bBox.offsetFromTop + statementViewState.bBox.h
                })
            }

            height += statementViewState.getHeight();
        });

        if (parent
            && (STKindChecker.isFunctionDefinition(parent) || STKindChecker.isNamedWorkerDeclaration(parent))
            && !blockViewState.isEndComponentAvailable) {
            const parentViewState = parent.viewState as FunctionViewState | WorkerDeclarationViewState;
            const endViewState = parentViewState.end as EndViewState;
            if (endViewState) {
                const endBlockStartHeight = height + endViewState.bBox.offsetFromTop;
                const endBlockEndHeight = endBlockStartHeight + endViewState.bBox.h;
                if (!this.hasConflict) {
                    this.fixConflictsWithEndpoints(endBlockStartHeight, endBlockEndHeight,
                        endViewState as StatementViewState, node.statements.length);

                    if (!this.hasConflict) {
                        this.fixConflictsWithMessages(endBlockStartHeight, endBlockEndHeight,
                            endViewState as StatementViewState, node.statements.length);
                    }
                }
            }
        }
    }

    private fixIfElseStatementConflicts(node: IfElseStatement, height: number) {
        this.visitBlockStatement(node.ifBody, undefined, height);
        if (node.elseBody) {
            this.evaluatingIf = true;
            if (STKindChecker.isIfElseStatement(node.elseBody.elseBody)) {
                this.fixIfElseStatementConflicts(node.elseBody.elseBody, height);
            } else if (STKindChecker.isBlockStatement(node.elseBody.elseBody)) {
                this.visitBlockStatement(node.elseBody.elseBody, undefined, height)
                this.evaluatingIf = false;
            }
        }

        if (!this.evaluatingIf) {
            traversNode(node, new SizingVisitor());
        }
    }

    private fixForEachBlockConflicts(node: ForeachStatement, height: number) {
        this.visitBlockStatement(node.blockStatement, undefined, height);
        traversNode(node, new SizingVisitor());
    }

    private fixWhileBlockConflicts(node: WhileStatement, height: number) {
        this.visitBlockStatement(node.whileBody, undefined, height);
        traversNode(node, new SizingVisitor());
    }

    private fixConflictsWithMessages(boxStartHeight: number, boxEndHeight: number, viewState: StatementViewState,
                                     statementIndex: number): boolean {
        let updatedAsConflict: boolean = false;

        this.matchedPairInfo.forEach(matchedPair => {
            const restrictedSpaceCoords = matchedPair.restrictedSpace;

            if (((boxStartHeight >= restrictedSpaceCoords.y1 && boxStartHeight <= restrictedSpaceCoords.y2)
                || (boxEndHeight >= restrictedSpaceCoords.y1 && boxEndHeight <= restrictedSpaceCoords.y2))
                && ((this.workerNames.length - 1 > restrictedSpaceCoords.x1
                    && this.workerNames.length - 1 < restrictedSpaceCoords.x2))) {
                this.hasConflict = true;
                updatedAsConflict = true;
                const newOffset = (restrictedSpaceCoords.y2 - boxStartHeight) + this.defaultOffset * 2;

                viewState.bBox.offsetFromTop += newOffset;

                let relatedPairInfo: SendRecievePairInfo;
                let linkedViewState: StatementViewState;
                if (viewState.isSend) {
                    relatedPairInfo = this.matchedPairInfo.find(pairInfo =>
                        pairInfo.sourceIndex === statementIndex
                        && pairInfo.sourceName === this.workerNames[this.workerNames.length - 1]);

                    linkedViewState = relatedPairInfo.targetViewState as StatementViewState;
                }

                if (viewState.isReceive) {
                    relatedPairInfo = this.matchedPairInfo.find(pairInfo =>
                        pairInfo.targetIndex === statementIndex
                        && pairInfo.targetName === this.workerNames[this.workerNames.length - 1]);

                    linkedViewState = relatedPairInfo.sourceViewState as StatementViewState;
                }

                if (relatedPairInfo && linkedViewState) {
                    linkedViewState.bBox.offsetFromTop += newOffset;
                    relatedPairInfo.pairHeight += newOffset;
                    relatedPairInfo.restrictedSpace.y1 += newOffset;
                    relatedPairInfo.restrictedSpace.y2 += newOffset;
                }
            }
        });


        return updatedAsConflict;
    }

    private fixConflictsWithEndpoints(boxStartHeight: number, boxEndHeight: number, viewState: StatementViewState,
                                      statementIndex: number): boolean {
        let updatedAsConflict = false;
        this.endPointPositions.forEach(position => {
            if (((boxStartHeight >= position.y1 && boxStartHeight <= position.y2)
                || (boxEndHeight >= position.y1 && boxEndHeight <= position.y2))
                && ((this.workerNames.length - 1 > position.x1
                    && this.workerNames.length - 1 < position.x2)
                    || (this.workerNames.length - 1 === position.x1 && this.evaluatingIf))) {

                this.hasConflict = true;
                updatedAsConflict = true;
                const newOffset = (position.y2 - boxStartHeight) + this.defaultOffset * 2;

                viewState.bBox.offsetFromTop += newOffset;

                let relatedPairInfo: SendRecievePairInfo;
                let linkedViewState: StatementViewState;
                if (viewState.isSend) {
                    relatedPairInfo = this.matchedPairInfo.find(pairInfo =>
                        pairInfo.sourceIndex === statementIndex
                        && pairInfo.sourceName === this.workerNames[this.workerNames.length - 1]);

                    linkedViewState = relatedPairInfo.targetViewState as StatementViewState;
                }

                if (viewState.isReceive) {
                    relatedPairInfo = this.matchedPairInfo.find(pairInfo =>
                        pairInfo.targetIndex === statementIndex
                        && pairInfo.targetName === this.workerNames[this.workerNames.length - 1]);

                    linkedViewState = relatedPairInfo.sourceViewState as StatementViewState;
                }

                if (relatedPairInfo && linkedViewState) {
                    linkedViewState.bBox.offsetFromTop += newOffset;
                    relatedPairInfo.pairHeight += newOffset;
                    relatedPairInfo.restrictedSpace.y1 += newOffset;
                    relatedPairInfo.restrictedSpace.y2 += newOffset;
                }
            }
        })

        return updatedAsConflict;
    }
}
