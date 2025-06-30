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
    AssignmentStatement,
    BinaryExpression,
    ComputedResourceAccessSegment,
    FunctionCall,
    IdentifierToken,
    IndexedExpression,
    KeySpecifier,
    LetVarDecl,
    LimitClause,
    ListConstructor,
    LocalVarDecl,
    MethodCall,
    OrderKey,
    QueryExpression,
    QueryPipeline,
    RecordField,
    RecordFieldWithDefaultValue,
    ReturnStatement,
    SimpleNameReference,
    STKindChecker,
    STNode,
    TupleTypeDesc, TypeCastExpression,
    TypedBindingPattern,
    Visitor, WhereClause
} from "@wso2/syntax-tree";

import { StatementEditorViewState } from "../utils/statement-editor-viewstate";

class DeleteConfigSetupVisitor implements Visitor {

    public beginVisitBinaryExpression(node: BinaryExpression) {
        (node.lhsExpr.viewState as StatementEditorViewState).templateExprDeletable = true;
        (node.rhsExpr.viewState as StatementEditorViewState).templateExprDeletable = true;
    }

    public beginVisitListConstructor(node: ListConstructor) {
        node.expressions.map((expr: STNode) => {
            (expr.viewState as StatementEditorViewState).templateExprDeletable = true;
        });
    }

    public beginVisitTypedBindingPattern(node: TypedBindingPattern) {
        (node.bindingPattern.viewState as StatementEditorViewState).exprNotDeletable = true;
        (node.typeDescriptor.viewState as StatementEditorViewState).templateExprDeletable = false;
        if (STKindChecker.isFromClause(node.parent)) {
            (node.bindingPattern.viewState as StatementEditorViewState).templateExprDeletable = false;
        }
    }


    public beginVisitAssignmentStatement(node: AssignmentStatement) {
        (node.varRef.viewState as StatementEditorViewState).exprNotDeletable = true;
    }

    public beginVisitReturnStatement(node: ReturnStatement) {
        if (node.expression) {
            (node.expression.viewState as StatementEditorViewState).templateExprDeletable = true;
        }
    }

    public beginVisitTypeCastExpression(node: TypeCastExpression) {
        (node.typeCastParam.viewState as StatementEditorViewState).templateExprDeletable = true;
    }

    public beginVisitLocalVarDecl(node: LocalVarDecl, parent?: STNode) {
        if (node.initializer) {
            (node.initializer.viewState as StatementEditorViewState).templateExprDeletable = true;
        }
    }

    public beginVisitTupleTypeDesc(node: TupleTypeDesc) {
        if (node.memberTypeDesc.length === 1) {
            (node.memberTypeDesc[0].viewState as StatementEditorViewState).exprNotDeletable = true;
            (node.memberTypeDesc[0].viewState as StatementEditorViewState).templateExprDeletable = false;
        } else {
            node.memberTypeDesc.map((memberTypeDesc: STNode) => {
                (memberTypeDesc.viewState as StatementEditorViewState).templateExprDeletable = true;
            });
        }
    }

    public beginVisitKeySpecifier(node: KeySpecifier) {
        if (node.fieldNames.length === 1) {
            (node.fieldNames[0].viewState as StatementEditorViewState).exprNotDeletable = true;
            (node.fieldNames[0].viewState as StatementEditorViewState).templateExprDeletable = false;
        } else {
            node.fieldNames.map((fieldNames: STNode) => {
                (fieldNames.viewState as StatementEditorViewState).templateExprDeletable = true;
            });
        }
    }

    public beginVisitIndexedExpression(node: IndexedExpression) {
        node.keyExpression.map((fieldNames: STNode) => {
            (fieldNames.viewState as StatementEditorViewState).templateExprDeletable = true;
        });
    }

    public beginVisitMethodCall(node: MethodCall) {
        node.arguments.map((args: STNode) => {
            (args.viewState as StatementEditorViewState).templateExprDeletable = true;
        });
    }

    public beginVisitFunctionCall(node: FunctionCall) {
        node.arguments.map((args: STNode) => {
            (args.viewState as StatementEditorViewState).templateExprDeletable = true;
        });
    }

    public beginVisitOrderKey(node: OrderKey) {
        (node.orderDirection.viewState as StatementEditorViewState).exprNotDeletable = true;
    }

    public beginVisitLetVarDecl(node: LetVarDecl) {
        (node.viewState as StatementEditorViewState).templateExprDeletable = true;
    }

    public beginVisitWhereClause(node: WhereClause) {
        (node.viewState as StatementEditorViewState).templateExprDeletable = true;
        (node.expression.viewState as StatementEditorViewState).templateExprDeletable = true;
    }

    public beginVisitLimitClause(node: LimitClause) {
        (node.viewState as StatementEditorViewState).templateExprDeletable = true;
        (node.expression.viewState as StatementEditorViewState).templateExprDeletable = true;
    }

    public beginVisitRecordField(node: RecordField) {
        (node.fieldName.viewState as StatementEditorViewState).templateExprDeletable = false;
    }

    public beginVisitRecordFieldWithDefaultValue(node: RecordFieldWithDefaultValue) {
        (node.fieldName.viewState as StatementEditorViewState).templateExprDeletable = false;
        if (node.expression) {
            (node.expression.viewState as StatementEditorViewState).templateExprDeletable = true;
        }
    }

    public beginVisitQueryExpression(node: QueryExpression) {
        (node.queryPipeline.viewState as StatementEditorViewState).exprNotDeletable = true;
        if (node.selectClause) {
            (node.selectClause.viewState as StatementEditorViewState).exprNotDeletable = true;
        } else if ((node as any).resultClause) {
            ((node as any).resultClause.viewState as StatementEditorViewState).exprNotDeletable = true;
        }
    }

    public beginVisitQueryPipeline(node: QueryPipeline) {
        (node.fromClause.viewState as StatementEditorViewState).exprNotDeletable = true;
    }

    public beginVisitIdentifierToken(node: IdentifierToken, parent?: STNode) {
        if (parent && (parent.viewState as StatementEditorViewState).templateExprDeletable) {
            (node.viewState as StatementEditorViewState).templateExprDeletable = true;
        } else if (parent?.parent && STKindChecker.isFieldAccess(parent.parent)) {
            (node.viewState as StatementEditorViewState).templateExprDeletable = true;
        } else if (parent && STKindChecker.isClientResourceAccessAction(parent)) {
            (node.viewState as StatementEditorViewState).templateExprDeletable = true;
        }
    }

    public beginVisitSimpleNameReference(node: SimpleNameReference, parent?: STNode) {
        if (parent && STKindChecker.isClientResourceAccessAction(parent)) {
            (node.viewState as StatementEditorViewState).templateExprDeletable = true;
        }
    }

    public beginVisitComputedResourceAccessSegment(node: ComputedResourceAccessSegment, parent?: STNode) {
        (node.viewState as StatementEditorViewState).templateExprDeletable = true;
    }
}

export const visitor = new DeleteConfigSetupVisitor();
