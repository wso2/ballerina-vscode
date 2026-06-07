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
    ConstDeclaration,
    FieldAccess,
    ImplicitAnonymousFunctionExpression,
    IntersectionTypeDesc,
    MethodCall,
    OptionalTypeDesc,
    OrderByClause,
    OrderKey,
    ParenthesisedTypeDesc,
    QueryExpression,
    QueryPipeline,
    RecordField,
    RecordFieldWithDefaultValue,
    SpecificField,
    STNode,
    TableTypeDesc,
    TupleTypeDesc,
    TypeCastExpression,
    TypedBindingPattern,
    TypeParameter,
    TypeTestExpression,
    UnionTypeDesc,
    Visitor
} from "@wso2/syntax-tree";

import { ModelType, StatementEditorViewState } from "../utils/statement-editor-viewstate";

class ModelTypeSetupVisitor implements Visitor {
    public beginVisitSTNode(node: STNode, parent?: STNode) {
        // Propagate model type info to leaf nodes
        if (parent && (parent.viewState as StatementEditorViewState).modelType === ModelType.TYPE_DESCRIPTOR) {
            (node.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        } else if (parent && (parent.viewState as StatementEditorViewState).modelType === ModelType.BINDING_PATTERN) {
            (node.viewState as StatementEditorViewState).modelType = ModelType.BINDING_PATTERN;
        } else if (parent && (parent.viewState as StatementEditorViewState).modelType === ModelType.METHOD_CALL) {
            (node.viewState as StatementEditorViewState).modelType = ModelType.METHOD_CALL;
        } else if (parent && (parent.viewState as StatementEditorViewState).modelType === ModelType.FIELD_ACCESS) {
            (node.viewState as StatementEditorViewState).modelType = ModelType.FIELD_ACCESS;
        } else if (parent && (parent.viewState as StatementEditorViewState).modelType === ModelType.SPECIFIC_FIELD_NAME) {
            (node.viewState as StatementEditorViewState).modelType = ModelType.SPECIFIC_FIELD_NAME;
        }
    }

    public beginVisitTypedBindingPattern(node: TypedBindingPattern) {
        (node.typeDescriptor.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        (node.bindingPattern.viewState as StatementEditorViewState).modelType = ModelType.BINDING_PATTERN;
    }

    public beginVisitTypeTestExpression(node: TypeTestExpression) {
        (node.typeDescriptor.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitBinaryExpression(node: BinaryExpression) {
        (node.operator.viewState as StatementEditorViewState).modelType = ModelType.OPERATOR;
    }

    public beginVisitTypeCastExpression(node: TypeCastExpression) {
        (node.typeCastParam.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitQueryPipeline(node: QueryPipeline) {
        (node.fromClause.viewState as StatementEditorViewState).modelType = ModelType.QUERY_CLAUSE;
        node.intermediateClauses.map((intermediateClause: STNode) => {
            (intermediateClause.viewState as StatementEditorViewState).modelType = ModelType.QUERY_CLAUSE;
        });
    }

    public beginVisitOrderByClause(node: OrderByClause, parent?: STNode) {
        node.orderKey.map((orderKey: STNode) => {
            (orderKey.viewState as StatementEditorViewState).modelType = ModelType.ORDER_KEY;
        });
    }

    public beginVisitUnionTypeDesc(node: UnionTypeDesc) {
        (node.leftTypeDesc.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        (node.rightTypeDesc.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitIntersectionTypeDesc(node: IntersectionTypeDesc) {
        (node.leftTypeDesc.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        (node.rightTypeDesc.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitOptionalTypeDesc(node: OptionalTypeDesc) {
        (node.typeDescriptor.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitTupleTypeDesc(node: TupleTypeDesc) {
        node.memberTypeDesc.map((memberTypeDesc: STNode) => {
            (memberTypeDesc.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        });
    }

    public beginVisitParenthesisedTypeDesc(node: ParenthesisedTypeDesc) {
        (node.typedesc.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitTableTypeDesc(node: TableTypeDesc) {
        (node.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        (node.rowTypeParameterNode.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitTypeParameter(node: TypeParameter) {
        (node.typeNode.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
    }

    public beginVisitRecordField(node: RecordField) {
        (node.typeName.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        (node.fieldName.viewState as StatementEditorViewState).modelType = ModelType.BINDING_PATTERN;
    }

    public beginVisitRecordFieldWithDefaultValue(node: RecordFieldWithDefaultValue) {
        (node.typeName.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        (node.fieldName.viewState as StatementEditorViewState).modelType = ModelType.BINDING_PATTERN;
    }

    public beginVisitMethodCall(node: MethodCall) {
        (node.expression.viewState as StatementEditorViewState).modelType = ModelType.METHOD_CALL;
        (node.methodName.viewState as StatementEditorViewState).modelType = ModelType.METHOD_CALL;
    }

    public beginVisitFieldAccess(node: FieldAccess) {
        (node.expression.viewState as StatementEditorViewState).modelType = ModelType.FIELD_ACCESS;
        (node.fieldName.viewState as StatementEditorViewState).modelType = ModelType.FIELD_ACCESS;
    }

    public beginVisitQueryExpression(node: QueryExpression) {
        (node.queryPipeline.viewState as StatementEditorViewState).modelType = ModelType.QUERY_EXPRESSION;
        if (node.selectClause) {
            (node.selectClause.viewState as StatementEditorViewState).modelType = ModelType.QUERY_EXPRESSION;
        } else if ((node as any).resultClause) {
            ((node as any).resultClause.viewState as StatementEditorViewState).modelType = ModelType.QUERY_EXPRESSION;
        }
        if (node?.queryConstructType) {
            (node.queryConstructType.viewState as StatementEditorViewState).modelType = ModelType.QUERY_EXPRESSION;
        }
    }

    public beginVisitImplicitAnonymousFunctionExpression(node: ImplicitAnonymousFunctionExpression) {
        (node.viewState as StatementEditorViewState).modelType = ModelType.FUNCTION;
    }

    public beginVisitSpecificField(node: SpecificField) {
        (node.fieldName.viewState as StatementEditorViewState).modelType = ModelType.SPECIFIC_FIELD_NAME;
    }

    public beginVisitOrderKey(node: OrderKey) {
        if (node?.orderDirection) {
            (node.orderDirection.viewState as StatementEditorViewState).modelType = ModelType.ORDER_DIRECTION_KEYWORDS;
        }
    }

    public beginVisitConstDeclaration(node: ConstDeclaration) {
        if (node?.typeDescriptor) {
            (node.typeDescriptor.viewState as StatementEditorViewState).modelType = ModelType.TYPE_DESCRIPTOR;
        }
    }

}

export const visitor = new ModelTypeSetupVisitor();
