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
    FunctionDefinition,
    IdentifierToken,
    LetVarDecl,
    MappingConstructor,
    SpecificField,
    STKindChecker,
    STNode,
    traversNode,
    Visitor
} from "@wso2/syntax-tree";

import { DataMapperViewState } from "../../../utils/data-mapper-view-state";
import { DMNode } from "../../DataMapper/DataMapper";
import { SELECT_CALUSE_QUERY } from "../utils/constants";
import { QueryExprFindingVisitorByIndex } from "./QueryExprFindingVisitorByIndex";

export class SelectedSTFindingVisitor implements Visitor {

    private updatedPrevST: DMNode[];

    private pathSegmentIndex: number;

    constructor(
        private prevST: DMNode[],
    ) {
        this.updatedPrevST = [];
        const fnST = prevST[0].stNode;
        const isOutputAnydata = fnST && STKindChecker.isFunctionDefinition(fnST)
            && fnST.functionSignature?.returnTypeDesc
            && STKindChecker.isAnydataTypeDesc(fnST.functionSignature.returnTypeDesc.type);
        const isOutputInlineRecord = fnST && STKindChecker.isFunctionDefinition(fnST)
            && fnST.functionSignature?.returnTypeDesc
            && STKindChecker.isRecordTypeDesc(fnST.functionSignature.returnTypeDesc.type);
        this.pathSegmentIndex = isOutputAnydata || isOutputInlineRecord ? 0 : 1; // If the output type is available, the field path starts with the record root name, hence segmentIndex = 1
    }

    beginVisitSTNode(node: FunctionDefinition | SpecificField | LetVarDecl) {
        const item = this.prevST[0];
        const isItemSpecificField = item && item.stNode && STKindChecker.isSpecificField(item.stNode);
        const isItemLetVarDecl = item && item.stNode && STKindChecker.isSpecificField(item.stNode);

        if (isItemSpecificField || isItemLetVarDecl) {
            const pathSegments = item.fieldPath.split('.');
            if (STKindChecker.isSpecificField(node) && node.fieldName.value === pathSegments[this.pathSegmentIndex]) {
                this.pathSegmentIndex++;
            } else if (STKindChecker.isListConstructor(node)
                && !isNaN(+pathSegments[this.pathSegmentIndex])
                && !node.dataMapperViewState) {
                node.expressions.forEach((exprNode, index) => {
                    if (!STKindChecker.isCommaToken(exprNode)) {
                        (exprNode.dataMapperViewState as DataMapperViewState).elementIndex = index / 2;
                    }
                });
            } else if (node.dataMapperViewState) {
                const elementIndex = (node.dataMapperViewState as DataMapperViewState).elementIndex;
                if (elementIndex === +pathSegments[this.pathSegmentIndex]) {
                    if (STKindChecker.isMappingConstructor(node)) {
                        this.pathSegmentIndex++;
                        const hasNextFieldName = node.fields.some(field =>
                            STKindChecker.isSpecificField(field)
                            && field.fieldName.value === pathSegments[this.pathSegmentIndex]
                        );
                        if (!hasNextFieldName) {
                            this.pathSegmentIndex++; // Skipping the record name segment
                        }
                    } else if (STKindChecker.isListConstructor(node) && !isNaN(+pathSegments[this.pathSegmentIndex++])) {
                        // Add element indexes for list constructors followed by another list constructor
                        node.expressions.forEach((exprNode, index) => {
                            if (!STKindChecker.isCommaToken(exprNode)) {
                                (exprNode.dataMapperViewState as DataMapperViewState).elementIndex = index / 2;
                            }
                        });
                    } else {
                        this.pathSegmentIndex++;
                    }
                }
            } else if (!STKindChecker.isLetVarDecl(node)) {
                return;
            }
        }

        const itemIdentifierName = item && item.stNode && this.getIdentifier(item.stNode)?.value;
        const nodeIdentifierName = node && this.getIdentifier(node)?.value;

        if (itemIdentifierName
            && nodeIdentifierName
            && nodeIdentifierName === itemIdentifierName
            && this.areValExprKindsEqual(item.stNode, node))
        {
            if (this.prevST.some(prevST => prevST.fieldPath === SELECT_CALUSE_QUERY)) {
                // Specific fields are repeated when value expression containes chained query expressions
                // (Query expression as the expression value of a select clause)
                [...this.prevST].forEach(_ => {
                    const prevST = this.prevST.shift();
                    let updatedDMNode: DMNode = { ...prevST, stNode: node };
                    if (prevST.fieldPath === SELECT_CALUSE_QUERY) {
                        const queryExprFindingVisitor = new QueryExprFindingVisitorByIndex(prevST.index);
                        traversNode(prevST.stNode, queryExprFindingVisitor);
                        const queryExpr = queryExprFindingVisitor.getQueryExpression();
                        updatedDMNode = {...updatedDMNode, position: queryExpr.position}
                    } else if (STKindChecker.isSpecificField(node) && STKindChecker.isQueryExpression(node.valueExpr)) {
                        // Update the position of the query expressions declared as the value expression of specific fields
                        updatedDMNode = {...updatedDMNode, position: node.valueExpr.position};
                    }
                    this.updatedPrevST = [...this.updatedPrevST, updatedDMNode];
                });
            } else {
                const prevST = this.prevST.shift();
                let updatedDMNode: DMNode = { ...prevST, stNode: node };
                if (STKindChecker.isSpecificField(node) && STKindChecker.isQueryExpression(node.valueExpr)) {
                    // Update the position of the query expressions declared as the value expression of specific fields
                    updatedDMNode = {...updatedDMNode, position: node.valueExpr.position};
                }
                this.updatedPrevST = [...this.updatedPrevST, updatedDMNode];
            }
            this.pathSegmentIndex = 1;
            const expr = STKindChecker.isSpecificField(node)
                ? node.valueExpr
                : STKindChecker.isLetVarDecl(node)
                    ? node.expression
                    : undefined;
            let nextItem: MappingConstructor;
            if (expr) {
                if (STKindChecker.isMappingConstructor(expr)) {
                    nextItem = expr;
                } else if (STKindChecker.isQueryExpression(expr)) {
                    const selectClause = expr?.selectClause || expr?.resultClause;
                    if (STKindChecker.isMappingConstructor(selectClause.expression)) {
                        nextItem = selectClause.expression;
                    }
                }
            }
            if (nextItem && this.prevST) {
                const nexFieldPath = this.prevST[this.prevST.length - 1]?.fieldPath;
                const nextPathSegment = nexFieldPath && nexFieldPath.split('.')[0];
                const hasNextFieldName = nextItem.fields.some(field =>
                    STKindChecker.isSpecificField(field)
                    && field.fieldName.value === nextPathSegment
                );
                if (hasNextFieldName) {
                    this.pathSegmentIndex = 0;
                }
            }
        } else if (node && STKindChecker.isFunctionDefinition(node)) {
            // Function definitions are repeated when the expr function body is query expression
            const functionDefs = this.prevST.filter(prevST =>
                prevST.stNode && STKindChecker.isFunctionDefinition(prevST.stNode)
            );
            functionDefs.forEach(fnDef => {
                if (STKindChecker.isFunctionDefinition(fnDef.stNode)
                    && node.functionName.value === fnDef.stNode.functionName?.value)
                {
                    const prevST = this.prevST.shift();
                    let updatedDMNode: DMNode = { ...prevST, stNode: node };
                    if (prevST.fieldPath === SELECT_CALUSE_QUERY) {
                        const queryExprFindingVisitor = new QueryExprFindingVisitorByIndex(prevST.index);
                        traversNode(prevST.stNode, queryExprFindingVisitor);
                        const queryExpr = queryExprFindingVisitor.getQueryExpression();
                        updatedDMNode = {...updatedDMNode, position: queryExpr.position}
                    }
                    this.updatedPrevST = [...this.updatedPrevST, updatedDMNode];
                }
            });
        }
    }

    getIdentifier(node: STNode): IdentifierToken {
        let identifierName: IdentifierToken;
        if (STKindChecker.isLetVarDecl(node)) {
            if (STKindChecker.isCaptureBindingPattern(node.typedBindingPattern.bindingPattern)) {
                identifierName = node.typedBindingPattern.bindingPattern.variableName;
            }
            // TODO: Handle other binding patterns
        } else if (STKindChecker.isSpecificField(node)) {
            identifierName = node.fieldName as IdentifierToken;
        }
        return identifierName;
    }

    areValExprKindsEqual(expr1: STNode, expr2: STNode): boolean {
        if (STKindChecker.isSpecificField(expr1) && STKindChecker.isSpecificField(expr2)) {
            return expr1.valueExpr.kind === expr2.valueExpr.kind;
        }
        return expr1.kind === expr2.kind;
    }

    getST() {
        const selectedST = this.updatedPrevST.pop();
        return {
            selectedST,
            prevST: this.updatedPrevST,
        };
    }
}
