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
    BlockStatement, DoStatement, ElseBlock, ForeachStatement, FunctionBodyBlock, FunctionDefinition, IfElseStatement, NamedWorkerDeclaration, NodePosition, STKindChecker, STNode, Visitor, WhileStatement
} from "@wso2/syntax-tree";

import { BlockViewState, CollapseViewState, FunctionViewState, IfViewState, StatementViewState, ViewState } from "../ViewState";
import { DoStatementViewState } from "../ViewState/do-statement";
import { OnFailClauseViewState } from "../ViewState/on-fail-clause";
import { WorkerDeclarationViewState } from "../ViewState/worker-declaration";

import { DefaultConfig } from "./default";
import { isPositionEquals, isPositionWithinRange } from "./util";

export class CollapseInitVisitor implements Visitor {
    private position: NodePosition;
    constructor(position: NodePosition) {
        this.position = position;
    }

    beginVisitFunctionDefinition(node: FunctionDefinition): void {
        const viewState: FunctionViewState = node.viewState as FunctionViewState;
        const trigger = viewState.trigger;
        const end = viewState?.end?.bBox;

        trigger.offsetFromBottom = DefaultConfig.interactionModeOffset;
        trigger.offsetFromTop = DefaultConfig.interactionModeOffset;
        end.offsetFromBottom = DefaultConfig.interactionModeOffset;
        end.offsetFromTop = DefaultConfig.interactionModeOffset;
    }

    beginVisitNamedWorkerDeclaration(node: NamedWorkerDeclaration, parent?: STNode): void {
        const viewState: WorkerDeclarationViewState = node.viewState as WorkerDeclarationViewState;
        const trigger = viewState.trigger;
        const end = viewState?.end?.bBox;

        trigger.offsetFromBottom = DefaultConfig.interactionModeOffset;
        trigger.offsetFromTop = DefaultConfig.interactionModeOffset;
        end.offsetFromBottom = DefaultConfig.interactionModeOffset;
        end.offsetFromTop = DefaultConfig.interactionModeOffset;
    }

    endVisitFunctionBodyBlock(node: FunctionBodyBlock, parent?: STNode): void {
        this.endVisitBlock(node);
    }

    endVisitWhileStatement(node: WhileStatement, parent?: STNode): void {
        const whileViewstate = node.viewState as StatementViewState;
        const whileBodyBlock = node.whileBody as BlockStatement;
        const whileBodyVS = whileBodyBlock.viewState as BlockViewState;
        // mark the statement as collapsed if it doesn't contain an action statement.
        whileViewstate.collapsed = !whileBodyVS.containsAction;
    }

    endVisitDoStatement(node: DoStatement, parent?: STNode): void {
        const viewState = node.viewState as DoStatementViewState;
        const doBodyVS = viewState.doBodyVS as BlockViewState;
        const onFailVS = viewState.onFailBodyVS as OnFailClauseViewState;
        const onFailBody = onFailVS.onFailBodyVS as BlockViewState;

        viewState.collapsed = !(doBodyVS.containsAction || onFailBody.containsAction);
    }

    endVisitForeachStatement(node: ForeachStatement, parent?: STNode): void {
        const foreachViewstate = node.viewState as StatementViewState;
        const foreachBodyBlock = node.blockStatement as BlockStatement;
        const foreachBodyVS = foreachBodyBlock.viewState as BlockViewState;
        // mark the statement as collapsed if it doesn't contain an action statement.
        foreachViewstate.collapsed = !foreachBodyVS.containsAction;
    }

    endVisitBlockStatement(node: BlockStatement, parent?: STNode): void {
        this.endVisitBlock(node);
    }

    endVisitIfElseStatement(node: IfElseStatement): void {
        const ifElseVS: ViewState = node.viewState as ViewState;
        const ifBodyBlock: BlockStatement = node.ifBody as BlockStatement;
        const ifBodyVS = ifBodyBlock.viewState as BlockViewState;
        const elseBody: ElseBlock = node.elseBody as ElseBlock;
        // mark the statement as collapsed if it doesn't contain an action statement.
        ifElseVS.collapsed = !ifBodyVS.containsAction;

        if (elseBody && elseBody.elseBody) {
            if (STKindChecker.isIfElseStatement(elseBody.elseBody)) {
                const elseVS = elseBody.elseBody.viewState as ViewState;
                ifElseVS.collapsed = ifElseVS.collapsed && elseVS.collapsed;
            }

            if (STKindChecker.isBlockStatement(elseBody.elseBody)) {
                const elseVS = elseBody.elseBody.viewState as BlockViewState;
                ifElseVS.collapsed = ifElseVS.collapsed && !elseVS.containsAction;
            }
        }
    }

    endVisitBlock(node: BlockStatement | FunctionBodyBlock) {
        const blockViewState = node.viewState as BlockViewState;

        if (STKindChecker.isFunctionBodyBlock(node) && node.namedWorkerDeclarator
            && node.namedWorkerDeclarator.workerInitStatements.length > 0) {
            this.populateBlockVSWithCollapseVS(node.namedWorkerDeclarator.workerInitStatements, blockViewState);
        }

        this.populateBlockVSWithCollapseVS(node.statements, blockViewState);
    }

    private populateBlockVSWithCollapseVS(statements: STNode[], blockViewState: BlockViewState) {
        if (statements.length > 0) {
            let range: NodePosition = {
                startLine: statements[0].position.startLine,
                endLine: statements[0].position.startLine,
                startColumn: statements[0].position.startColumn,
                endColumn: statements[0].position.endColumn
            };

            statements.forEach((statement, statementIndex) => {
                const statementVS = statement.viewState as StatementViewState;
                statementVS.bBox.offsetFromBottom = DefaultConfig.interactionModeOffset;
                statementVS.bBox.offsetFromTop = DefaultConfig.interactionModeOffset;
                if (isPositionWithinRange(statement.position, this.position)) {
                    if (!(statementVS.isAction || statementVS.isEndpoint || statementVS.isSend || statementVS.isReceive
                        || this.isSkippedConstruct(statement)) || statementVS.collapsed) {
                        // when the statement is neither an end point or a construct that contains an action
                        // collapse that construct
                        statementVS.collapsed = true;

                        // update the range last line and end column
                        range.endLine = statement.position.endLine;
                        range.endColumn = statement.position.endColumn;

                        // if the last staetement is reached we can collapse the range upto that position
                        if (statementIndex === statements.length - 1) {
                            const collapseVS = new CollapseViewState();
                            collapseVS.range = { ...range };
                            blockViewState.collapsedViewStates.push(collapseVS);
                        }
                    } else {
                        if (!blockViewState.containsAction) {
                            // mark if a block contains a action statement
                            blockViewState.containsAction = statementVS.isAction || statementVS.isEndpoint
                                || statementVS.isSend || statementVS.isReceive;
                        }

                        if (!isPositionEquals(range, statement.position)) {
                            // populate the collapsed range array if the range isn't an action/endpoint statement
                            const collapseVS = new CollapseViewState();
                            collapseVS.range = { ...range };
                            if (statementIndex > 0) blockViewState.collapsedViewStates.push(collapseVS);
                        }

                        // re initiate range variable once an action is found
                        if (statementIndex !== statements.length - 1) {
                            range = {
                                startLine: statements[statementIndex + 1].position.startLine,
                                endLine: statements[statementIndex + 1].position.endLine,
                                startColumn: statements[statementIndex + 1].position.startColumn,
                                endColumn: statements[statementIndex + 1].position.endColumn,
                            };
                        }
                    }
                }
            });
        }
    }

    private isSkippedConstruct(node: STNode): boolean {
        return STKindChecker.isWhileStatement(node)
            || STKindChecker.isForeachStatement(node)
            || STKindChecker.isIfElseStatement(node)
            || STKindChecker.isDoStatement(node);
    }
}
