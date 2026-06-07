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
    CheckKeyword,
    CheckpanicKeyword,
    ConstDeclaration,
    FieldAccess,
    FunctionCall,
    IdentifierToken,
    IndexedExpression,
    IntersectionTypeDesc,
    KeySpecifier,
    LetClause,
    LimitClause,
    ListConstructor,
    LocalVarDecl,
    MappingConstructor,
    MethodCall,
    ModuleVarDecl,
    NodePosition,
    OptionalFieldAccess,
    OptionalTypeDesc,
    OrderByClause,
    ParenthesisedTypeDesc,
    QueryExpression,
    QueryPipeline,
    RecordField,
    RecordFieldWithDefaultValue,
    RecordTypeDesc,
    SimpleNameReference,
    SpecificField,
    STKindChecker,
    STNode,
    TableTypeDesc,
    TrapKeyword,
    TupleTypeDesc,
    TypeCastExpression,
    TypedBindingPattern,
    TypeDefinition,
    TypeParameter,
    TypeTestExpression,
    UnaryExpression,
    UnionTypeDesc,
    Visitor,
    WhereClause
} from "@wso2/syntax-tree";

import { END_OF_LINE_MINUTIAE } from "../constants";
import { RemainingContent } from "../models/definitions";
import { isPositionsEquals } from "../utils";

export const DEFAULT_EXPR = "EXPRESSION";
export const DEFAULT_FUNCTION_CALL = "FUNCTION_CALL()";
export const DEFAULT_TYPE_DESC = "TYPE_DESCRIPTOR";
export const DEFAULT_BINDING_PATTERN = "BINDING_PATTERN";
export const DEFAULT_FIELD_NAME = "FIELD_NAME";

class ExpressionDeletingVisitor implements Visitor {
    private deletePosition: NodePosition;
    private newPosition: NodePosition;
    private codeAfterDeletion: string;
    private isNodeFound: boolean;

    public beginVisitBinaryExpression(node: BinaryExpression) {
        if (!this.isNodeFound) {
            if (isPositionsEquals(this.deletePosition, node.lhsExpr.position)) {
                if (node.lhsExpr.source.trim() === DEFAULT_EXPR) {
                    this.setProperties(node.rhsExpr.source, node.position);
                } else {
                    this.setProperties(DEFAULT_EXPR, node.lhsExpr.position);
                }
            } else if (isPositionsEquals(this.deletePosition, node.operator.position)) {
                this.setProperties(node.lhsExpr.source, node.position);
            } else if (isPositionsEquals(this.deletePosition, node.rhsExpr.position)) {
                if (node.rhsExpr.source.trim() === DEFAULT_EXPR) {
                    this.setProperties(node.lhsExpr.source, node.position);
                } else {
                    this.setProperties(DEFAULT_EXPR, node.rhsExpr.position);
                }
            }
        }
    }

    public beginVisitFieldAccess(node: FieldAccess) {
        if (!this.isNodeFound) {
            if (isPositionsEquals(this.deletePosition, node.expression.position)) {
                this.setProperties(DEFAULT_EXPR, node.position);
            } else if (isPositionsEquals(this.deletePosition, node.fieldName.position)) {
                this.setProperties(node.expression.source, node.position);
            }
        }
    }

    public beginVisitOptionalFieldAccess(node: OptionalFieldAccess) {
        if (!this.isNodeFound) {
            if (isPositionsEquals(this.deletePosition, node.expression.position)) {
                this.setProperties(DEFAULT_EXPR, node.position);
            } else if (isPositionsEquals(this.deletePosition, node.fieldName.position)) {
                this.setProperties(node.expression.source, node.position);
            }
        }
    }

    public beginVisitMethodCall(node: MethodCall) {
        if (!this.isNodeFound) {
            const methodNamePosition = {
                ...node.methodName.position,
                endLine: 0,
                endColumn: node.methodName.position.startColumn + node.methodName.source.length
            };

            if (isPositionsEquals(this.deletePosition, node.expression.position)) {
                this.setProperties(DEFAULT_EXPR, node.position);
            } else if (isPositionsEquals(this.deletePosition, node.methodName.position)) {
                this.setProperties('', {
                    ...node.dotToken.position,
                    endColumn: node.closeParenToken.position.endColumn
                });
            } else if (isPositionsEquals(this.deletePosition, methodNamePosition)) {
                this.setProperties('', {
                    ...node.dotToken.position,
                    endColumn: node.closeParenToken.position.endColumn
                });
            } else {
                const hasArgToBeDeleted = node.arguments.some((arg: STNode) => {
                    return isPositionsEquals(this.deletePosition, arg.position);
                });

                if (hasArgToBeDeleted) {
                    const expressions: string[] = [];
                    node.arguments.map((expr: STNode) => {
                        if (!isPositionsEquals(this.deletePosition, expr.position) && !STKindChecker.isCommaToken(expr)) {
                            expressions.push(expr.source);
                        }
                    });

                    this.setProperties(expressions.join(','), {
                        ...node.position,
                        startColumn: node.openParenToken.position.endColumn,
                        endColumn: node.closeParenToken.position.startColumn
                    });
                }
            }
        }
    }

    public beginVisitSimpleNameReference(node: SimpleNameReference, parent?: STNode) {
        if (!this.isNodeFound) {
            if (STKindChecker.isReturnStatement(node.parent) && isPositionsEquals(this.deletePosition, node.position)) {
                this.setProperties("", node.position);
            }
        }
    }

    public beginVisitIdentifierToken(node: IdentifierToken, parent?: STNode) {
        if (!this.isNodeFound && parent?.parent && STKindChecker.isClientResourceAccessAction(parent.parent)
            && node.value.trim() === DEFAULT_EXPR && isPositionsEquals(this.deletePosition, node.position)) {
            this.setProperties("", {
                ...node.position,
                startColumn: parent.parent.dotToken?.position?.startColumn,
                endColumn: parent.parent.arguments?.closeParenToken.position?.endColumn
            });
        } else if (!this.isNodeFound && parent && STKindChecker.isClientResourceAccessAction(parent)
            && isPositionsEquals(this.deletePosition, node.position)) {
            this.setProperties("", {
                ...node.position,
                startColumn: (parent.slashToken.position.startColumn === node.position.startColumn - 1) ?
                    node.position.startColumn : node.position.startColumn - 1
            });
        }
    }

    public beginVisitTypeCastExpression(node: TypeCastExpression) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typeCastParam.position)) {
            this.setProperties("", {
                startLine: node.ltToken.position.startLine,
                startColumn: node.ltToken.position.startColumn,
                endLine: node.gtToken.position.endLine,
                endColumn: node.gtToken.position.endColumn
            });
        }
    }

    public beginVisitListConstructor(node: ListConstructor) {
        if (!this.isNodeFound) {
            const hasItemsToBeDeleted = node.expressions.some((item: STNode) => {
                return isPositionsEquals(this.deletePosition, item.position);
            });

            if (hasItemsToBeDeleted) {
                const expressions: string[] = [];
                node.expressions.map((expr: STNode) => {
                    if (!isPositionsEquals(this.deletePosition, expr.position) && !STKindChecker.isCommaToken(expr)) {
                        expressions.push(expr.source);
                    }
                });

                this.setProperties(expressions.join(','), {
                    ...node.position,
                    startColumn: node.openBracket.position.endColumn,
                    endColumn: node.closeBracket.position.startColumn
                });
            }
        }
    }

    public beginVisitTupleTypeDesc(node: TupleTypeDesc) {
        if (!this.isNodeFound) {
            if (isPositionsEquals(this.deletePosition, node.memberTypeDesc[0]?.position)) {
                this.setProperties(DEFAULT_TYPE_DESC, node.memberTypeDesc[0].position);
            } else {
                const hasItemsToBeDeleted = node.memberTypeDesc.some((item: STNode) => {
                    return isPositionsEquals(this.deletePosition, item.position);
                });

                if (hasItemsToBeDeleted) {
                    const typeDescList: string[] = [];
                    node.memberTypeDesc.map((types: STNode) => {
                        if (!isPositionsEquals(this.deletePosition, types.position) && !STKindChecker.isCommaToken(types)) {
                            typeDescList.push(types.source);
                        }
                    });

                    this.setProperties(typeDescList.join(','), {
                        ...node.position,
                        startColumn: node.openBracketToken.position.endColumn,
                        endColumn: node.closeBracketToken.position.startColumn
                    });
                }
            }
        }
    }

    public beginVisitTableTypeDesc(node: TableTypeDesc) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.keyConstraintNode?.position)) {
            this.setProperties("", node.keyConstraintNode.position);
        }
    }

    public beginVisitMappingConstructor(node: MappingConstructor) {
        if (!this.isNodeFound) {
            const hasItemsToBeDeleted = node.fields.some((field: STNode) => {
                return isPositionsEquals(this.deletePosition, field.position);
            });

            if (hasItemsToBeDeleted) {
                const expressions: string[] = [];
                let separator;
                node.fields.map((field: STNode) => {
                    if (!isPositionsEquals(this.deletePosition, field.position)) {
                        if (!STKindChecker.isCommaToken(field)) {
                            expressions.push(field.source);
                        } else {
                            separator = field.trailingMinutiae.some(minutiae => minutiae.kind === END_OF_LINE_MINUTIAE)
                                ? ',\n' : ',';
                        }
                    }
                });

                this.setProperties(expressions.join(separator), {
                    startLine: node.openBrace.position.startLine,
                    startColumn: node.openBrace.position.endColumn,
                    endLine: node.closeBrace.position.endLine,
                    endColumn: node.closeBrace.position.startColumn
                });
            }
        }
    }

    public beginVisitModuleVarDecl(node: ModuleVarDecl) {
        if (!this.isNodeFound) {
            if (node.visibilityQualifier && isPositionsEquals(this.deletePosition, node.visibilityQualifier.position)) {
                this.setProperties("", node.visibilityQualifier.position);
            } else if (node.qualifiers) {
                node.qualifiers.map((qualifier: STNode) => {
                    if (isPositionsEquals(this.deletePosition, qualifier.position)) {
                        this.setProperties("", qualifier.position);
                    }
                });
            }
        }
    }

    public beginVisitLocalVarDecl(node: LocalVarDecl) {
        if (!this.isNodeFound) {
            if (node.finalKeyword && isPositionsEquals(this.deletePosition, node.finalKeyword.position)) {
                this.setProperties("", node.finalKeyword.position);
            } else if (node.initializer && isPositionsEquals(this.deletePosition, node.initializer.position) &&
                node.initializer.source.trim() === DEFAULT_EXPR) {
                this.setProperties("", {
                    startLine: node.equalsToken.position.startLine,
                    startColumn: node.equalsToken.position.startColumn,
                    endLine: node.initializer.position.endLine,
                    endColumn: node.initializer.position.endColumn
                })
            }
        }
    }

    public beginVisitCheckKeyword(node: CheckKeyword) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.position)) {
            this.setProperties("", node.position);
        }
    }

    public beginVisitCheckpanicKeyword(node: CheckpanicKeyword) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.position)) {
            this.setProperties("", node.position);
        }
    }

    public beginVisitTrapKeyword(node: TrapKeyword) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.position)) {
            this.setProperties("", node.position);
        }
    }

    public beginVisitSpecificField(node: SpecificField) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.valueExpr.position)) {
            this.setProperties(DEFAULT_EXPR, node.valueExpr.position);
        }
    }

    public beginVisitIndexedExpression(node: IndexedExpression) {
        if (!this.isNodeFound) {
            if (isPositionsEquals(this.deletePosition, node.keyExpression[0].position)) {
                node.keyExpression.length === 1 && node.keyExpression[0].source.trim() === DEFAULT_EXPR ?
                    this.setProperties(node.containerExpression.source, node.position) :
                    this.setProperties(DEFAULT_EXPR, node.keyExpression[0].position);
            } else {
                const hasKeyExprToBeDeleted = node.keyExpression.some((expr: STNode) => {
                    return isPositionsEquals(this.deletePosition, expr.position);
                });

                if (hasKeyExprToBeDeleted) {
                    const expressions: string[] = [];
                    node.keyExpression.map((expr: STNode) => {
                        if (!isPositionsEquals(this.deletePosition, expr.position) && !STKindChecker.isCommaToken(expr)) {
                            expressions.push(expr.source);
                        }
                    });

                    this.setProperties(expressions.join(','), {
                        ...node.position,
                        startColumn: node.openBracket.position.endColumn,
                        endColumn: node.closeBracket.position.startColumn
                    });
                }
            }
        }
    }

    public beginVisitFunctionCall(node: FunctionCall) {
        if (!this.isNodeFound) {
            const hasArgToBeDeleted = node.arguments.some((arg: STNode) => {
                return isPositionsEquals(this.deletePosition, arg.position);
            });

            if (hasArgToBeDeleted) {
                const expressions: string[] = [];
                node.arguments.map((expr: STNode) => {
                    if (!isPositionsEquals(this.deletePosition, expr.position) && !STKindChecker.isCommaToken(expr)) {
                        expressions.push(expr.source);
                    }
                });

                this.setProperties(expressions.join(','), {
                    ...node.position,
                    startColumn: node.openParenToken.position.endColumn,
                    endColumn: node.closeParenToken.position.startColumn
                });
            }
        }
    }

    public beginVisitTypeTestExpression(node: TypeTestExpression) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.expression.position)) {
            this.setProperties(DEFAULT_EXPR, node.expression.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typeDescriptor.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.typeDescriptor.position);
        }
    }

    public beginVisitTypedBindingPattern(node: TypedBindingPattern) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typeDescriptor.position)) {
            if (node.typeDescriptor.source.trim() === DEFAULT_TYPE_DESC) {
                this.setProperties(node.bindingPattern.source, node.position);
            } else {
                this.setProperties(DEFAULT_TYPE_DESC, node.typeDescriptor.position);
            }
        }
    }

    public beginVisitParenthesisedTypeDesc(node: ParenthesisedTypeDesc) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typedesc.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.typedesc.position);
        }
    }

    public beginVisitUnionTypeDesc(node: UnionTypeDesc) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.leftTypeDesc.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.leftTypeDesc.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.rightTypeDesc.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.rightTypeDesc.position);
        }
    }

    public beginVisitIntersectionTypeDesc(node: IntersectionTypeDesc) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.leftTypeDesc.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.leftTypeDesc.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.rightTypeDesc.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.rightTypeDesc.position);
        }
    }

    public beginVisitOptionalTypeDesc(node: OptionalTypeDesc) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typeDescriptor.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.typeDescriptor.position);
        }
    }

    public beginVisitTypeParameter(node: TypeParameter) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typeNode.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.typeNode.position);
        }
    }

    public beginVisitKeySpecifier(node: KeySpecifier) {
        if (!this.isNodeFound) {
            const hasItemsToBeDeleted = node.fieldNames.some((item: STNode) => {
                return isPositionsEquals(this.deletePosition, item.position);
            });

            if (hasItemsToBeDeleted) {
                const expressions: string[] = [];
                node.fieldNames.map((expr: STNode) => {
                    if (!isPositionsEquals(this.deletePosition, expr.position) && !STKindChecker.isCommaToken(expr)) {
                        expressions.push(expr.value);
                    }
                });

                this.setProperties(expressions.join(','), {
                    ...node.position,
                    startColumn: node.openParenToken.position.endColumn,
                    endColumn: node.closeParenToken.position.startColumn
                });
            }
        }
    }

    public beginVisitRecordTypeDesc(node: RecordTypeDesc) {
        if (!this.isNodeFound) {
            const hasItemsToBeDeleted = node.fields.some((item: STNode) => {
                return isPositionsEquals(this.deletePosition, item.position);
            });

            if (hasItemsToBeDeleted) {
                const expressions: string[] = [];
                node.fields.map((expr: STNode) => {
                    if (!isPositionsEquals(this.deletePosition, expr.position)) {
                        expressions.push(expr.source);
                    }
                });

                this.setProperties(expressions.join(''), {
                    ...node.position,
                    startColumn: node.bodyStartDelimiter.position.endColumn,
                    endColumn: node.bodyEndDelimiter.position.startColumn
                });
            }
        }
    }

    public beginVisitRecordField(node: RecordField) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typeName.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.typeName.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.fieldName.position)) {
            this.setProperties(DEFAULT_FIELD_NAME, node.fieldName.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.questionMarkToken?.position)) {
            this.setProperties('', node.questionMarkToken.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.readonlyKeyword?.position)) {

            this.setProperties(node.typeName.source, {
                ...node.position,
                startColumn: node.readonlyKeyword.position.startColumn,
                endColumn: node.typeName.position.endColumn
            });
        }
    }

    public beginVisitRecordFieldWithDefaultValue(node: RecordFieldWithDefaultValue) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.typeName.position)) {
            this.setProperties(DEFAULT_TYPE_DESC, node.typeName.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.fieldName.position)) {
            this.setProperties(DEFAULT_BINDING_PATTERN, node.fieldName.position);
        } else if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.expression.position) &&
            node.expression.source.trim() === DEFAULT_EXPR) {
            this.setProperties("", {
                startLine: node.equalsToken.position.startLine,
                startColumn: node.equalsToken.position.startColumn,
                endLine: node.expression.position.endLine,
                endColumn: node.expression.position.endColumn
            })
        }
    }

    public beginVisitLetClause(node: LetClause) {
        if (!this.isNodeFound) {
            if (node.letVarDeclarations.length === 1 && isPositionsEquals(this.deletePosition, node.letVarDeclarations[0].position)) {
                this.setProperties("", node.position);
            } else {
                const hasItemsToBeDeleted = node.letVarDeclarations.some((item: STNode) => {
                    return isPositionsEquals(this.deletePosition, item.position);
                });

                if (hasItemsToBeDeleted) {
                    const expressions: string[] = [];
                    node.letVarDeclarations.map((expr: STNode) => {
                        if (!isPositionsEquals(this.deletePosition, expr.position) && !STKindChecker.isCommaToken(expr)) {
                            expressions.push(expr.source);
                        }
                    });

                    this.setProperties(expressions.join(','), {
                        ...node.position,
                        startColumn: node.letVarDeclarations[0].position.startColumn
                    });
                }
            }
        }
    }

    public beginVisitOrderByClause(node: OrderByClause) {
        if (!this.isNodeFound) {
            if (node.orderKey.length === 1 && isPositionsEquals(this.deletePosition, node.orderKey[0].position)) {
                this.setProperties("", node.position);
            } else {
                const hasItemsToBeDeleted = node.orderKey.some((item: STNode) => {
                    return isPositionsEquals(this.deletePosition, item.position);
                });

                if (hasItemsToBeDeleted) {
                    const expressions: string[] = [];
                    node.orderKey.map((expr: STNode) => {
                        if (!isPositionsEquals(this.deletePosition, expr.position) && !STKindChecker.isCommaToken(expr)) {
                            expressions.push(expr.source);
                        }
                    });

                    this.setProperties(expressions.join(','), {
                        ...node.position,
                        startColumn: node.orderKey[0].position.startColumn
                    });
                }
            }
        }
    }

    public beginVisitWhereClause(node: WhereClause) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.expression.position)) {
            this.setProperties("", node.position);
        }
    }

    public beginVisitLimitClause(node: LimitClause) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.expression.position)) {
            this.setProperties("", node.position);
        }
    }

    public beginVisitQueryPipeline(node: QueryPipeline, parent?: QueryExpression) {
        if (!this.isNodeFound) {
            const hasClausesToBeDeleted = node.intermediateClauses.some((clause: STNode) => {
                return isPositionsEquals(this.deletePosition, clause.position);
            });

            if (hasClausesToBeDeleted) {
                const expressions: string[] = [];
                node.intermediateClauses.map((clause: STNode) => {
                    if (!isPositionsEquals(this.deletePosition, clause.position)) {
                        expressions.push(clause.source);
                    }
                });

                if (parent) {
                    this.setProperties(!!expressions.length ? expressions.join('') : ' ', {
                        startLine: node.fromClause.position.endLine,
                        endLine: parent.selectClause ? parent.selectClause.position.startLine : (parent as any).resultClause.position.startLine,
                        startColumn: node.fromClause.position.endColumn,
                        endColumn: parent.selectClause ? parent.selectClause.position.startColumn : (parent as any).resultClause.position.startColumn
                    });
                }
            }
        }
    }

    public beginVisitConstDeclaration(node: ConstDeclaration) {
        if (!this.isNodeFound) {
            if (isPositionsEquals(this.deletePosition, node?.typeDescriptor?.position)) {
                this.setProperties('', node?.typeDescriptor?.position);
            } else if (isPositionsEquals(this.deletePosition, node.visibilityQualifier?.position)) {
                this.setProperties('', node.visibilityQualifier.position);
            }
        }
    }

    public beginVisitTypeDefinition(node: TypeDefinition) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.visibilityQualifier?.position)) {
            this.setProperties('', node.visibilityQualifier.position);
        }
    }

    public beginVisitUnaryExpression(node: UnaryExpression) {
        if (!this.isNodeFound && isPositionsEquals(this.deletePosition, node.unaryOperator.position)) {
            this.setProperties('', node.unaryOperator.position);
        }
    }

    setProperties(codeAfterDeletion: string, newPosition: NodePosition) {
        this.codeAfterDeletion = codeAfterDeletion;
        this.newPosition = newPosition;
        this.isNodeFound = true;
    }

    getContent(): RemainingContent {
        return {
            code: this.isNodeFound ? this.codeAfterDeletion : DEFAULT_EXPR,
            position: this.isNodeFound ? this.newPosition : this.deletePosition
        };
    }

    getFunctionCallContent(): RemainingContent {
        return {
            code: this.isNodeFound ? this.codeAfterDeletion : DEFAULT_FUNCTION_CALL,
            position: this.isNodeFound ? this.newPosition : this.deletePosition
        };
    }

    setPosition(position: NodePosition) {
        this.cleanDeletingInfo();
        this.deletePosition = position;
    }

    cleanDeletingInfo() {
        this.isNodeFound = false;
        this.newPosition = null;
        this.codeAfterDeletion = '';
    }
}

export const visitor = new ExpressionDeletingVisitor();
