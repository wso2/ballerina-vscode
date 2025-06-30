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
import { ExpressionRange, LinePosition } from "@wso2/ballerina-core";
import {
    ExpressionFunctionBody,
    FieldAccess,
    FromClause,
    FunctionDefinition,
    JoinClause,
    LetClause,
    LetExpression,
    LetVarDecl,
    NodePosition,
    OptionalFieldAccess,
    SelectClause,
    SimpleNameReference,
    SpecificField,
    STKindChecker,
    STNode,
    Visitor
} from "@wso2/syntax-tree";

import { getInnermostExpressionBody } from "../utils/dm-utils";

export interface FnDefPositions {
    fnNamePosition: LinePosition;
    returnTypeDescPosition: LinePosition;
}

export class TypeFindingVisitor implements Visitor {
    private readonly expressionNodeRanges: ExpressionRange[];
    private readonly symbolNodesPositions: LinePosition[];
    private fnDefPositions: FnDefPositions;
    private noOfParams: number;
    private readonly isArraysSupported: boolean;

    constructor(isArraysSupported: boolean) {
        this.expressionNodeRanges = []
        this.symbolNodesPositions = []
        this.fnDefPositions = {fnNamePosition: undefined, returnTypeDescPosition: undefined}
        this.isArraysSupported = isArraysSupported
        this.noOfParams = 0
    }

    public beginVisitFunctionDefinition(node: FunctionDefinition) {
        if (this.isArraysSupported) {
            this.fnDefPositions = {
                fnNamePosition: {
                    line: (node.functionName.position as NodePosition).startLine,
                    offset: (node.functionName.position as NodePosition).startColumn
                },
                returnTypeDescPosition: node.functionSignature?.returnTypeDesc ?
                    {
                        line: (node.functionSignature.returnTypeDesc.type.position as NodePosition).startLine,
                        offset: (node.functionSignature.returnTypeDesc.type.position as NodePosition).startColumn
                    } : null
            }
            this.noOfParams = node.functionSignature.parameters.filter(param => !STKindChecker.isCommaToken(param)).length;
        } else {
            node.functionSignature.parameters.map((param: STNode) => {
                if (STKindChecker.isRequiredParam(param)) {
                    const paramPosition: NodePosition = STKindChecker.isQualifiedNameReference(param.typeName)
                        ? param.typeName.identifier.position as NodePosition
                        : param.position as NodePosition as NodePosition;
                    this.symbolNodesPositions.push({
                        line: paramPosition.startLine,
                        offset: paramPosition.startColumn
                    });
                    this.noOfParams++;
                }
            });
            if (node.functionSignature?.returnTypeDesc) {
                const typePosition: NodePosition = STKindChecker.isQualifiedNameReference(node.functionSignature.returnTypeDesc.type)
                    ? node.functionSignature.returnTypeDesc.type.identifier.position as NodePosition
                    : node.functionSignature.returnTypeDesc.type.position as NodePosition;
                this.symbolNodesPositions.push({
                    line: typePosition.startLine,
                    offset: typePosition.startColumn
                });
            }
        }
    }

    public beginVisitExpressionFunctionBody(node: ExpressionFunctionBody) {
        const fnBody = getInnermostExpressionBody(node.expression);
        const fnBodyPosition: NodePosition = fnBody.position as NodePosition;
        this.expressionNodeRanges.push({
            startLine: {
                line: fnBodyPosition.startLine,
                offset: fnBodyPosition.startColumn
            },
            endLine: {
                line: fnBodyPosition.endLine,
                offset: fnBodyPosition.endColumn
            }
        });
    }

    public beginVisitFromClause(node: FromClause) {
        let typePosition: NodePosition;
        // tslint:disable-next-line: prefer-conditional-expression
        if (STKindChecker.isBinaryExpression(node.expression) && STKindChecker.isElvisToken(node.expression.operator)) {
            typePosition = node.expression.lhsExpr.position as NodePosition;
        } else {
            typePosition = node.expression.position as NodePosition;
        }
        this.expressionNodeRanges.push({
            startLine: {
                line: typePosition.startLine,
                offset: typePosition.startColumn
            },
            endLine: {
                line: typePosition.endLine,
                offset: typePosition.endColumn
            }
        });
    }

    public beginVisitSpecificField(node: SpecificField) {
        const fieldNamePosition: NodePosition = node.fieldName.position as NodePosition;
        this.symbolNodesPositions.push({
            line: fieldNamePosition.startLine,
            offset: fieldNamePosition.startColumn
        });
    }

    public beginVisitSelectClause(node: SelectClause){
        const exprBody = getInnermostExpressionBody(node.expression);
        const typePosition: NodePosition = exprBody.position as NodePosition;
        this.expressionNodeRanges.push({
            startLine: {
                line: typePosition.startLine,
                offset: typePosition.startColumn
            },
            endLine: {
                line: typePosition.endLine,
                offset: typePosition.endColumn
            }
        });
    }

    public beginVisitLetClause(node: LetClause){
        const typePosition: NodePosition = (node.letVarDeclarations[0] as LetVarDecl)?.expression?.position as NodePosition;
        this.expressionNodeRanges.push({
            startLine: {
                line: typePosition.startLine,
                offset: typePosition.startColumn
            },
            endLine: {
                line: typePosition.endLine,
                offset: typePosition.endColumn
            }
        });
    }

    public beginVisitLetExpression(node: LetExpression){
        node.letVarDeclarations.map((decl: STNode) => {
            if (STKindChecker.isLetVarDecl(decl)) {
                if (STKindChecker.isCaptureBindingPattern(decl.typedBindingPattern.bindingPattern)) {
                    const varNamePosition: NodePosition = decl.typedBindingPattern.bindingPattern.variableName.position;
                    this.symbolNodesPositions.push({
                        line: varNamePosition.startLine,
                        offset: varNamePosition.startColumn
                    });
                }
                // TODO: Add support for other binding patterns

                // Keeping the below to ensure the backward compatibility
                const declPosition: NodePosition = decl.expression.position;
                this.expressionNodeRanges.push({
                    startLine: {
                        line: declPosition.startLine,
                        offset: declPosition.startColumn
                    },
                    endLine: {
                        line: declPosition.endLine,
                        offset: declPosition.endColumn
                    }
                });
            }
        });
    }

    public beginVisitJoinClause(node: JoinClause){
        const rhsExpression = node.joinOnCondition.rhsExpression
        let typePosition: NodePosition;
        if (STKindChecker.isFieldAccess(rhsExpression)){
            typePosition = (node.joinOnCondition.rhsExpression as FieldAccess)?.expression?.position;
        } else if (STKindChecker.isSimpleNameReference(rhsExpression)){
            typePosition = (node.joinOnCondition.rhsExpression as SimpleNameReference)?.position;
        } else if (STKindChecker.isOptionalFieldAccess(node.joinOnCondition.rhsExpression)){
            typePosition = (node.joinOnCondition.rhsExpression as OptionalFieldAccess)?.expression?.position;
        }

        if (typePosition){
            this.expressionNodeRanges.push({
                startLine: {
                    line: typePosition.startLine,
                    offset: typePosition.startColumn
                },
                endLine: {
                    line: typePosition.endLine,
                    offset: typePosition.endColumn
                }
            });
        }
    }

    public getExpressionNodesRanges(){
        return this.expressionNodeRanges;
    }

    public getSymbolNodesPositions(){
        return this.symbolNodesPositions;
    }

    public getFnDefPositions(){
        return this.fnDefPositions;
    }

    public getNoOfParams(){
        return this.noOfParams;
    }
}

