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
    BlockStatement, FunctionBodyBlock, IfElseStatement, NodePosition, STKindChecker, STNode, Visitor
} from "@wso2/syntax-tree";

import { COLLAPSE_SVG_HEIGHT } from "../Components/RenderingComponents/ForEach/ColapseButtonSVG";
import { BlockViewState, CollapseViewState, StatementViewState } from "../ViewState";

import { DefaultConfig } from "./default";
import { isPositionWithinRange } from "./util";

export class CollapseExpandedRangeVisitor implements Visitor {
    private expandRange: NodePosition;

    constructor(expandRange: NodePosition) {
        this.expandRange = expandRange;
    }

    beginVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode): void {
        const blockViewState: BlockViewState = node.viewState as BlockViewState;

        if (blockViewState.hasWorkerDecl) {
            this.collapseMatchingRange(blockViewState.collapsedViewStates, node.namedWorkerDeclarator.workerInitStatements);
        }

        this.beginVisitBlock(node);
    }

    beginVisitIfElseStatement(node: IfElseStatement, parent?: STNode) {
        this.beginVisitBlock(node.ifBody);
        if (node.elseBody && STKindChecker.isElseBlock(node.elseBody)
            && STKindChecker.isBlockStatement(node.elseBody.elseBody)) {
            this.beginVisitBlock(node.elseBody.elseBody)
        }
    }

    beginVisitBlockStatement(node: BlockStatement): void {
        this.beginVisitBlock(node);
    }

    beginVisitBlock(node: BlockStatement | FunctionBodyBlock) {
        const blockVS: BlockViewState = node.viewState as BlockViewState;
        const collapsedViewStates: CollapseViewState[] = blockVS.collapsedViewStates;
        const statements: STNode[] = node.statements;

        this.collapseMatchingRange(collapsedViewStates, statements);
    }

    private collapseMatchingRange(collapsedViewStates: CollapseViewState[], statements: STNode[]) {
        collapsedViewStates.forEach(collapsedVS => {
            if (isPositionWithinRange(collapsedVS.range, this.expandRange)) {
                collapsedVS.collapsed = true;
                collapsedVS.bBox.h = COLLAPSE_SVG_HEIGHT;
            }
        });

        statements.forEach(statement => {
            const stmtVS: StatementViewState = statement.viewState as StatementViewState;
            if (isPositionWithinRange(statement.position, this.expandRange)) {
                stmtVS.collapsed = true;
                stmtVS.bBox.offsetFromTop = DefaultConfig.interactionModeOffset;
                stmtVS.bBox.offsetFromBottom = DefaultConfig.interactionModeOffset;
            }
        });
    }
}
