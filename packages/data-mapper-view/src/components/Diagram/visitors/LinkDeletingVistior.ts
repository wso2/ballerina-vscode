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
    BinaryExpression,
    FunctionCall,
    ListConstructor,
    MappingConstructor,
    NodePosition,
    STKindChecker,
    STNode,
    traversNode,
    Visitor,
} from "@wso2/syntax-tree";

import { isPositionsEquals } from "../../../utils/st-utils";
import { getExprBodyFromLetExpression, getInnermostExpressionBody } from "../utils/dm-utils";

export class LinkDeletingVisitor implements Visitor {
    /** NodePosition of the specific field or mapping construct that needs to be removed */
    private fieldPosition: NodePosition;
    /** Node of the root level mapping construct which will be traversed to find the delete position */
    private rootMapConstruct: STNode;
    /** Node position that needs to be removed when deleting a link in a mapping construct */
    private deletePosition: NodePosition;

    /**
     * Visitor to traverse and identify the delete position when deleting a link
     * @param fieldPosition NodePosition of the specific field or mapping construct that needs to be removed
     * @param rootMapConstruct Node of the root level mapping construct
     */
    constructor(fieldPosition: NodePosition, rootMapConstruct: STNode) {
        this.fieldPosition = fieldPosition;
        this.rootMapConstruct = STKindChecker.isLetExpression(rootMapConstruct)
            ? getExprBodyFromLetExpression(rootMapConstruct)
            : rootMapConstruct;
        this.deletePosition = null;
    }

    public beginVisitMappingConstructor(node: MappingConstructor) {
        this.findDeletePosition(node, false);
    }

    public beginVisitListConstructor(node: ListConstructor): void {
        this.findDeletePositionWithinListConstructor(node);
    }

    public beginVisitBinaryExpression(node: BinaryExpression): void {
        if (this.deletePosition === null) {
            // LHS could be another binary expression or field access node
            // RHS is always field access node

            if (node.lhsExpr && STKindChecker.isFieldAccess(node.lhsExpr)
                && isPositionsEquals(this.fieldPosition, node.lhsExpr.position as NodePosition)) {
                // If LHS is a field access node to be deleted
                // Then also delete the operator right to it
                this.deletePosition = {
                    ...(node.lhsExpr.position as NodePosition),
                    endLine: (node.operator.position as NodePosition)?.endLine,
                    endColumn: (node.operator.position as NodePosition)?.endColumn,
                }
            }else if (node.rhsExpr && STKindChecker.isFieldAccess(node.rhsExpr)
                    && isPositionsEquals(this.fieldPosition, node.rhsExpr.position as NodePosition)){
                // If RHS is a field access node to be deleted
                // Then also delete the operator left to it
                this.deletePosition = {
                    ...(node.rhsExpr.position as NodePosition),
                    startLine: (node.operator.position as NodePosition)?.startLine,
                    startColumn: (node.operator.position as NodePosition)?.startColumn,
                }
            }
        }
    }

    public beginVisitFunctionCall(node: FunctionCall, parent?: STNode): void {
        if (this.deletePosition === null) {
            const argIndex = node.arguments.findIndex((arg: STNode) =>
                isPositionsEquals(this.fieldPosition, arg.position as NodePosition)
            );

            if (argIndex !== -1) {
                const selectedArg = node.arguments[argIndex];
                const previousArg = node.arguments[argIndex - 1];
                const nextArg = node.arguments[argIndex + 1];
                const isLastArg = argIndex + 1 === node.arguments.length;

                if (node.arguments.length === 1) {
                    // If it's the only argument, just delete the argument
                    this.deletePosition = selectedArg.position as NodePosition;
                } else if (previousArg && STKindChecker.isCommaToken(previousArg) && isLastArg) {
                    // If it's the last argument, include the previous comma in deletion
                    this.deletePosition = {
                        ...(selectedArg.position as NodePosition),
                        startLine: (previousArg.position as NodePosition)?.startLine,
                        startColumn: (previousArg.position as NodePosition)?.startColumn,
                    };
                } else if (nextArg && STKindChecker.isCommaToken(nextArg)) {
                    // If it's not the last argument, include the next comma in deletion
                    this.deletePosition = {
                        ...(selectedArg.position as NodePosition),
                        endLine: (nextArg.position as NodePosition)?.endLine,
                        endColumn: (nextArg.position as NodePosition)?.endColumn,
                    };
                }
            }
        }
    }

    /**
     * Traverse and find the position that needs to be removed
     * @param node Mapping constructor node which will be checked for the item to delete
     * @param isChildOfList Is mapping constructor, a child of a list constructor
     */
    private findDeletePosition(node: MappingConstructor, isChildOfList: boolean) {
        if (this.deletePosition === null) {
            const deleteIndex = node.fields.findIndex((field: STNode) => {
                if (STKindChecker.isSpecificField(field)) {
                    const innerExprBody = getInnermostExpressionBody(field.valueExpr);
                    if (STKindChecker.isMappingConstructor(innerExprBody)) {
                        // If its a nested map constructor, then compare with the value expression position
                        if (isPositionsEquals(this.fieldPosition, (innerExprBody.position as NodePosition))) {
                            return true;
                        }
                    }
                }
                // Else if its a normal field access elements
                return isPositionsEquals(this.fieldPosition, (field.position as NodePosition));
            });

            if (deleteIndex !== -1) {
                /** Field to be deleted */
                const selected = node.fields[deleteIndex];
                /** Comma element prior to the link to be deleted */
                const previous = node.fields[deleteIndex - 1];
                /** Comma element after to the link to be deleted */
                const next = node.fields[deleteIndex + 1];
                /** Is field, the last element in the mapping construct */
                const isLastElement = deleteIndex + 1 === node.fields.length;

                let updatedDeletePosition = this.fieldPosition;
                if (STKindChecker.isSpecificField(selected)) {
                    const innerExpr = getInnermostExpressionBody(selected.valueExpr);
                    if (STKindChecker.isMappingConstructor(innerExpr)) {
                        // If its a nested map constructor, then select the delete position as the selected node position
                        updatedDeletePosition = (selected.position as NodePosition);
                    }
                }

                if (node.fields.length === 1) {
                    // If only one element in the construct (Could be a root level or sub level map construct)
                    if (isPositionsEquals((node.position as NodePosition),
                                            (this.rootMapConstruct.position as NodePosition))
                        || isChildOfList) {
                        // If only single element in the root level mapping, then only delete that link
                        // Or if the last element is within a mapping construct which is within a list constructor
                        this.deletePosition = updatedDeletePosition;
                    } else {
                        // if there's only a single element in a sub level record mapping
                        // Then, will need to delete record mapping construct element itself
                        // Therefore rerunning the same visitor with the parent record map as the one to delete
                        const linkDeleteVisitor = new LinkDeletingVisitor((node.position as NodePosition),
                                                                        this.rootMapConstruct);
                        traversNode(this.rootMapConstruct, linkDeleteVisitor);
                        this.deletePosition = linkDeleteVisitor.getPositionToDelete();
                    }
                } else if (previous && STKindChecker.isCommaToken(previous) && isLastElement) {
                    // if its the last element, need to delete previous comma as well
                    this.deletePosition = {
                        ...updatedDeletePosition,
                        startLine: (previous.position as NodePosition)?.startLine,
                        startColumn: (previous.position as NodePosition)?.startColumn,
                    };
                } else if (next && STKindChecker.isCommaToken(next)) {
                    // When there are multiple mappings and user tries to delete a link other than the last one
                    // Then, will need to delete the next comma node as well
                    this.deletePosition = {
                        ...updatedDeletePosition,
                        endLine: (next.position as NodePosition)?.endLine,
                        endColumn: (next.position as NodePosition)?.endColumn,
                    };
                }
            }
        }
    }

    private findDeletePositionWithinListConstructor(node: ListConstructor) {
        if (this.deletePosition === null) {
            const deleteIndex = node.expressions.findIndex((expression: STNode) => {
                return isPositionsEquals(this.fieldPosition, expression.position as NodePosition);
            });

            if (deleteIndex !== -1) {
                const selected = node.expressions[deleteIndex];
                const previous = node.expressions[deleteIndex - 1];
                const next = node.expressions[deleteIndex + 1];
                const isLastElement = deleteIndex + 1 === node.expressions.length;

                const updatedDeletePosition = selected.position as NodePosition;

                if (node.expressions.length === 1) {
                    this.deletePosition = updatedDeletePosition;
                } else if (previous && STKindChecker.isCommaToken(previous) && isLastElement) {
                    this.deletePosition = {
                        ...updatedDeletePosition,
                        startLine: (previous.position as NodePosition)?.startLine,
                        startColumn: (previous.position as NodePosition)?.startColumn,
                    };
                } else if (next && STKindChecker.isCommaToken(next)) {
                    this.deletePosition = {
                        ...updatedDeletePosition,
                        endLine: (next.position as NodePosition)?.endLine,
                        endColumn: (next.position as NodePosition)?.endColumn,
                    };
                }
            } else {
                for (const item of node.expressions) {
                    const innerExpr = getInnermostExpressionBody(item);
                    if (STKindChecker.isMappingConstructor(innerExpr)) {
                        this.findDeletePosition(innerExpr, true);
                    }
                }
            }
        }
    }

    /** Get the Node position to be removed when deleting a link in a mapping construct */
    getPositionToDelete(): NodePosition {
        return this.deletePosition;
    }
}
