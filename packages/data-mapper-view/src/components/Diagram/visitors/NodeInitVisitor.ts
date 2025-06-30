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
import { AnydataType, PrimitiveBalType } from "@wso2/ballerina-core";
import {
    CaptureBindingPattern,
    ExpressionFunctionBody,
    FunctionDefinition,
    IdentifierToken,
    JoinClause,
    LetClause,
    LetVarDecl,
    ListConstructor,
    MappingConstructor,
    NodePosition,
    QueryExpression,
    SelectClause,
    SpecificField,
    STKindChecker,
    STNode,
    traversNode,
    Visitor
} from "@wso2/syntax-tree";
import { DataMapperContext } from "../../../utils/DataMapperContext/DataMapperContext";
import { hasErrorDiagnosis, isPositionsEquals } from "../../../utils/st-utils";
import { SelectionState } from "../../DataMapper/DataMapper";
import {
    MappingConstructorNode,
    QueryExpressionNode,
    RequiredParamNode
} from "../Node";
import { DataMapperNodeModel } from "../Node/commons/DataMapperNode";
import { EnumTypeNode } from "../Node/EnumType";
import { ExpandedMappingHeaderNode } from "../Node/ExpandedMappingHeader";
import { FromClauseNode } from "../Node/FromClause";
import { JoinClauseNode } from "../Node/JoinClause";
import { LetClauseNode } from "../Node/LetClause";
import { LetExpressionNode } from "../Node/LetExpression";
import { LinkConnectorNode } from "../Node/LinkConnector";
import { ListConstructorNode } from "../Node/ListConstructor";
import { ModuleVariable, ModuleVariableNode } from "../Node/ModuleVariable";
import { PrimitiveTypeNode } from "../Node/PrimitiveType";
import { UnionTypeNode } from "../Node/UnionType";
import { UnsupportedExprNodeKind, UnsupportedIONode } from "../Node/UnsupportedIO";
import { EXPANDED_QUERY_INPUT_NODE_PREFIX, FUNCTION_BODY_QUERY, OFFSETS, SELECT_CALUSE_QUERY } from "../utils/constants";
import {
    getEnumTypes,
    getExprBodyFromLetExpression,
    getExprBodyFromTypeCastExpression,
    getFnDefForFnCall,
    getFromClauseNodeLabel,
    getInnermostExpressionBody,
    getInputNodes,
    getModuleVariables,
    getPrevOutputType,
    getSubArrayType,
    getTypeFromStore,
    getTypeOfOutput,
    isComplexExpression,
    isFnBodyQueryExpr,
    isIndexedExpression,
    isSelectClauseQueryExpr
} from "../utils/dm-utils";
import { constructTypeFromSTNode } from "../utils/type-utils";

import { QueryParentFindingVisitor } from "./QueryParentFindingVisitor"
import { QueryExprFindingVisitorByPosition } from "./QueryExprFindingVisitorByPosition";
import { DefaultPortModel } from "@projectstorm/react-diagrams";

export class NodeInitVisitor implements Visitor {

    private inputParamNodes: DataMapperNodeModel[] = [];
    private outputNode: DataMapperNodeModel;
    private intermediateNodes: DataMapperNodeModel[] = [];
    private otherInputNodes: DataMapperNodeModel[] = [];
    private queryNode: DataMapperNodeModel;
    private mapIdentifiers: STNode[] = [];
    private isWithinQuery = 0;
    private isWithinLetVarDecl = 0;

    constructor(
        private context: DataMapperContext,
        private selection: SelectionState
    ) { }

    beginVisitFunctionDefinition(node: FunctionDefinition) {
        const typeDesc = node.functionSignature?.returnTypeDesc && node.functionSignature.returnTypeDesc.type;
        const exprFuncBody = STKindChecker.isExpressionFunctionBody(node.functionBody) && node.functionBody;
        let moduleVariables: Map<string, ModuleVariable> = getModuleVariables(exprFuncBody, this.context.moduleComponents);
        let enumTypes: Map<string, ModuleVariable> = getEnumTypes(exprFuncBody, this.context.moduleComponents);
        let isFnBodyQueryExpr = false;
        if (typeDesc && exprFuncBody) {
            let returnType = getTypeOfOutput(typeDesc, this.context.ballerinaVersion);

            const isAnydataTypedField = returnType
                && (returnType.typeName === AnydataType
                    || (returnType.typeName === PrimitiveBalType.Array
                        && returnType?.memberType?.typeName === AnydataType));
            if (isAnydataTypedField) {
                returnType = constructTypeFromSTNode(exprFuncBody.expression);
            }

            if (returnType) {

                let bodyExpr: STNode = getInnermostExpressionBody(exprFuncBody.expression);
                if (
                    STKindChecker.isIndexedExpression(exprFuncBody.expression) &&
                    STKindChecker.isBracedExpression(exprFuncBody.expression.containerExpression) &&
                    STKindChecker.isQueryExpression(exprFuncBody.expression.containerExpression.expression)
                ) {
                    bodyExpr = exprFuncBody.expression.containerExpression.expression;
                }

                if (STKindChecker.isConditionalExpression(bodyExpr)) {
                    this.outputNode = new UnsupportedIONode(
                        this.context,
                        UnsupportedExprNodeKind.Output,
                        undefined,
                        bodyExpr,
                    );
                } else if (STKindChecker.isQueryExpression(bodyExpr)) {
                    const { queryPipeline: { fromClause, intermediateClauses } } = bodyExpr;
                    if (this.context.selection.selectedST.fieldPath === FUNCTION_BODY_QUERY) {
                        isFnBodyQueryExpr = true;
                        const selectClause = bodyExpr?.selectClause || bodyExpr?.resultClause;
                        const intermediateClausesHeight = 100 + intermediateClauses.length * OFFSETS.INTERMEDIATE_CLAUSE_HEIGHT;
                        if (returnType?.typeName === PrimitiveBalType.Array) {
                            const { memberType } = returnType;
                            if (memberType?.typeName === PrimitiveBalType.Record) {
                                this.outputNode = new MappingConstructorNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType,
                                    bodyExpr
                                );
                            } else if (memberType?.typeName === PrimitiveBalType.Array) {
                                this.outputNode = new ListConstructorNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType,
                                    bodyExpr
                                );
                            } else if (memberType?.typeName === PrimitiveBalType.Union) {
                                this.outputNode = new UnionTypeNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType
                                );
                            } else {
                                this.outputNode = new PrimitiveTypeNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType,
                                    bodyExpr
                                );
                            }
                        } else if (returnType?.typeName === PrimitiveBalType.Record) {
                            this.outputNode = new MappingConstructorNode(
                                this.context,
                                selectClause,
                                typeDesc,
                                returnType,
                                bodyExpr
                            );
                        } else if (returnType?.typeName === PrimitiveBalType.Union) {
                            const message = "Union types within query expressions are not supported at the moment"
                            this.outputNode = new UnsupportedIONode(
                                this.context,
                                UnsupportedExprNodeKind.Output,
                                message,
                                undefined
                            );
                            // TODO: Uncomment this once the union type support is added in the lang
                            //  (https://github.com/ballerina-platform/ballerina-lang/issues/40012)
                            // this.outputNode = new UnionTypeNode(
                            //     this.context,
                            //     selectClause,
                            //     parentIdentifier,
                            //     exprType
                            // );
                        } else {
                            this.outputNode = new PrimitiveTypeNode(
                                this.context,
                                selectClause,
                                typeDesc,
                                returnType,
                                bodyExpr
                            );
                        }

                        if (isComplexExpression(selectClause.expression)
                            || isIndexedExpression(selectClause.expression)
                        ) {
                            const inputNodes = getInputNodes(selectClause);
                            const linkConnectorNode = new LinkConnectorNode(
                                this.context,
                                selectClause,
                                "",
                                node,
                                inputNodes,
                                this.mapIdentifiers.slice(0)
                            );
                            this.intermediateNodes.push(linkConnectorNode);
                        }

                        this.outputNode.setPosition(OFFSETS.TARGET_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, intermediateClausesHeight + OFFSETS.QUERY_VIEW_TOP_MARGIN);

                        const expandedHeaderPorts: DefaultPortModel[] = [];
                        const fromClauseNode = new FromClauseNode(this.context, fromClause);
                        fromClauseNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, intermediateClausesHeight + OFFSETS.QUERY_VIEW_TOP_MARGIN);
                        this.inputParamNodes.push(fromClauseNode);

                        const fromClauseNodeValueLabel = getFromClauseNodeLabel(fromClause?.typedBindingPattern?.bindingPattern, fromClause.expression);
                        const fromClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${fromClauseNodeValueLabel}`);
                        expandedHeaderPorts.push(fromClausePort);
                        fromClauseNode.addPort(fromClausePort);

                        const letClauses = intermediateClauses?.filter((item) => {
                            return (
                                (STKindChecker.isLetClause(item) && !hasErrorDiagnosis(item)) ||
                                (STKindChecker.isJoinClause(item) && !hasErrorDiagnosis(item))
                            );
                        });

                        for (const [, item] of letClauses.entries()) {
                            if (STKindChecker.isLetClause(item)) {
                                const paramNode = new LetClauseNode(this.context, item as LetClause);
                                paramNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                                this.inputParamNodes.push(paramNode);
                                const letClauseValueLabel = (
                                    ((item as LetClause)?.letVarDeclarations[0] as LetVarDecl)?.typedBindingPattern
                                        ?.bindingPattern as CaptureBindingPattern
                                )?.variableName?.value;
                                const letClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${letClauseValueLabel}`);
                                expandedHeaderPorts.push(letClausePort);
                            } else if (STKindChecker.isJoinClause(item)) {
                                const paramNode = new JoinClauseNode(this.context, item as JoinClause);
                                if (paramNode.getSourceType()){
                                    paramNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                                    this.inputParamNodes.push(paramNode);
                                    const joinClauseValueLabel = ((item as JoinClause)?.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value;
                                    const joinClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${joinClauseValueLabel}`);
                                    expandedHeaderPorts.push(joinClausePort);
                                }
                            }
                        }

                        const queryNode = new ExpandedMappingHeaderNode(this.context, bodyExpr);
                        queryNode.setLocked(true)
                        this.queryNode = queryNode;
                        queryNode.targetPorts = expandedHeaderPorts;
                        queryNode.height = intermediateClausesHeight;
                        moduleVariables = getModuleVariables(selectClause.expression, this.context.moduleComponents);
                        enumTypes = getEnumTypes(selectClause.expression, this.context.moduleComponents);
                    } else if (this.context.selection.selectedST.fieldPath === SELECT_CALUSE_QUERY) {
                        isFnBodyQueryExpr = true;
                        const queryExprFindingVisitor = new QueryExprFindingVisitorByPosition(this.selection.selectedST.position);
                        traversNode(bodyExpr, queryExprFindingVisitor);
                        const queryExpr = queryExprFindingVisitor.getQueryExpression();
                        const selectClauseIndex = queryExprFindingVisitor.getSelectClauseIndex();
                        returnType = getSubArrayType(returnType, selectClauseIndex);
                        const selectClause = queryExpr?.selectClause || queryExpr?.resultClause;
                        const intermediateClausesHeight = 100 + intermediateClauses.length * OFFSETS.INTERMEDIATE_CLAUSE_HEIGHT;
                        if (returnType?.typeName === PrimitiveBalType.Array) {
                            const { memberType } = returnType;
                            if (memberType?.typeName === PrimitiveBalType.Record) {
                                this.outputNode = new MappingConstructorNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType,
                                    queryExpr
                                );
                            } else if (memberType?.typeName === PrimitiveBalType.Array) {
                                this.outputNode = new ListConstructorNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType,
                                    queryExpr
                                );
                            } else if (memberType?.typeName === PrimitiveBalType.Union) {
                                this.outputNode = new UnionTypeNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType
                                );
                            } else {
                                this.outputNode = new PrimitiveTypeNode(
                                    this.context,
                                    selectClause,
                                    typeDesc,
                                    memberType,
                                    queryExpr
                                );
                            }
                        } else if (returnType?.typeName === PrimitiveBalType.Record) {
                            this.outputNode = new MappingConstructorNode(
                                this.context,
                                selectClause,
                                typeDesc,
                                returnType,
                                queryExpr
                            );
                        } else if (returnType?.typeName === PrimitiveBalType.Union) {
                            const message = "Union types within query expressions are not supported at the moment"
                            this.outputNode = new UnsupportedIONode(
                                this.context,
                                UnsupportedExprNodeKind.Output,
                                message,
                                undefined
                            );
                        } else {
                            this.outputNode = new PrimitiveTypeNode(
                                this.context,
                                selectClause,
                                typeDesc,
                                returnType,
                                queryExpr
                            );
                        }

                        this.outputNode.setPosition(OFFSETS.TARGET_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, intermediateClausesHeight + OFFSETS.QUERY_VIEW_TOP_MARGIN);

                        const expandedHeaderPorts: DefaultPortModel[] = [];
                        const fromClauseNode = new FromClauseNode(this.context, queryExpr.queryPipeline.fromClause);
                        fromClauseNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, intermediateClausesHeight + OFFSETS.QUERY_VIEW_TOP_MARGIN);
                        this.inputParamNodes.push(fromClauseNode);

                        const fromClauseNodeValueLabel = getFromClauseNodeLabel(fromClause?.typedBindingPattern?.bindingPattern, fromClause.expression);
                        const fromClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${fromClauseNodeValueLabel}`);
                        expandedHeaderPorts.push(fromClausePort);
                        fromClauseNode.addPort(fromClausePort);

                        const letClauses = intermediateClauses?.filter((item) => {
                            return (
                                (STKindChecker.isLetClause(item) && item.typeData?.diagnostics?.length === 0) ||
                                (STKindChecker.isJoinClause(item) && item.typeData?.diagnostics?.length === 0)
                            );
                        });

                        for (const [, item] of letClauses.entries()) {
                            if (STKindChecker.isLetClause(item)) {
                                const paramNode = new LetClauseNode(this.context, item as LetClause);
                                paramNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                                this.inputParamNodes.push(paramNode);
                                const letClauseValueLabel = (
                                    ((item as LetClause)?.letVarDeclarations[0] as LetVarDecl)?.typedBindingPattern
                                        ?.bindingPattern as CaptureBindingPattern
                                )?.variableName?.value;
                                const letClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${letClauseValueLabel}`);
                                expandedHeaderPorts.push(letClausePort);
                            } else if (STKindChecker.isJoinClause(item)) {
                                const paramNode = new JoinClauseNode(this.context, item as JoinClause);
                                if (paramNode.getSourceType()){
                                    paramNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                                    this.inputParamNodes.push(paramNode);
                                    const joinClauseValueLabel = ((item as JoinClause)?.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value;
                                    const joinClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${joinClauseValueLabel}`);
                                    expandedHeaderPorts.push(joinClausePort);
                                }
                            }
                        }

                        const queryNode = new ExpandedMappingHeaderNode(this.context, bodyExpr);
                        queryNode.setLocked(true)
                        this.queryNode = queryNode;
                        queryNode.targetPorts = expandedHeaderPorts;
                        queryNode.height = intermediateClausesHeight;
                        moduleVariables = getModuleVariables(selectClause.expression, this.context.moduleComponents);
                        enumTypes = getEnumTypes(selectClause.expression, this.context.moduleComponents);
                    } else {
                        if (returnType.typeName === PrimitiveBalType.Array) {
                            this.outputNode = new ListConstructorNode(
                                this.context,
                                exprFuncBody,
                                typeDesc,
                                returnType
                            );
                        } else if (returnType.typeName === PrimitiveBalType.Union) {
                            // TODO: Uncomment this once the union type support is added in the lang
                            //  (https://github.com/ballerina-platform/ballerina-lang/issues/40012)
                            this.outputNode = new UnionTypeNode(
                                this.context,
                                exprFuncBody,
                                typeDesc,
                                returnType
                            );
                        } else {
                            const body = STKindChecker.isIndexedExpression(exprFuncBody.expression)
                                ? exprFuncBody.expression.containerExpression
                                : exprFuncBody;
                            this.outputNode = new PrimitiveTypeNode(
                                this.context,
                                body as any,
                                typeDesc,
                                returnType
                            );
                        }
                    }
                } else if (returnType.typeName === PrimitiveBalType.Record) {
                    this.outputNode = new MappingConstructorNode(
                        this.context,
                        exprFuncBody,
                        typeDesc,
                        returnType
                    );
                } else if (returnType.typeName === PrimitiveBalType.Union) {
                    this.outputNode = new UnionTypeNode(
                        this.context,
                        exprFuncBody,
                        typeDesc,
                        returnType
                    );
                } else if (returnType.typeName === PrimitiveBalType.Array) {
                    this.outputNode = new ListConstructorNode(
                        this.context,
                        exprFuncBody,
                        typeDesc,
                        returnType
                    );
                } else {
                    this.outputNode = new PrimitiveTypeNode(
                        this.context,
                        exprFuncBody,
                        typeDesc,
                        returnType
                    );
                }
                this.outputNode.setPosition(OFFSETS.TARGET_NODE.X, OFFSETS.TARGET_NODE.Y);
            }
        }
        // create input nodes
        if (!isFnBodyQueryExpr) {
            const params = node.functionSignature.parameters;
            if (params.length) {
                for (const param of params) {
                    if (STKindChecker.isRequiredParam(param)) {
                        const paramNode = new RequiredParamNode(
                            this.context,
                            param,
                            param.typeName
                        );
                        paramNode.setPosition(OFFSETS.SOURCE_NODE.X, OFFSETS.SOURCE_NODE.Y);
                        this.inputParamNodes.push(paramNode);
                    } else {
                        // TODO for other param types
                    }
                }
            }
        }

        // create node for configuring sub mappings
        const letExprNode = new LetExpressionNode(
            this.context,
            exprFuncBody
        );
        letExprNode.setPosition(OFFSETS.SOURCE_NODE.X + (isFnBodyQueryExpr ? 80 : 0), 0);
        this.otherInputNodes.push(letExprNode);

        // create node for module variables
        if (moduleVariables.size > 0) {
            const moduleVarNode = new ModuleVariableNode(
                this.context,
                moduleVariables
            );
            moduleVarNode.setPosition(OFFSETS.SOURCE_NODE.X + (isFnBodyQueryExpr ? 80 : 0), 0);
            this.otherInputNodes.push(moduleVarNode);
        }

        // create node for enums
        if (enumTypes.size > 0) {
            const enumTypeNode = new EnumTypeNode(
                this.context,
                enumTypes
            );
            enumTypeNode.setPosition(OFFSETS.SOURCE_NODE.X + (isFnBodyQueryExpr ? 80 : 0), 0);
            this.otherInputNodes.push(enumTypeNode);
        }
    }

    beginVisitQueryExpression?(node: QueryExpression, parent?: STNode) {
        // TODO: Implement a way to identify the selected query expr without using the positions since positions might change with imports, etc.
        const { stNode: selectedSTNode, position, fieldPath  } = this.selection.selectedST;
        const isLetVarDecl = STKindChecker.isLetVarDecl(parent);
        let parentIdentifier: IdentifierToken;
        let parentNode = parent;

        if (STKindChecker.isSpecificField(parent) && STKindChecker.isIdentifierToken(parent.fieldName)) {
            parentIdentifier = parent.fieldName;
        } else if (isLetVarDecl && STKindChecker.isCaptureBindingPattern(parent.typedBindingPattern.bindingPattern)) {
            parentIdentifier = parent.typedBindingPattern.bindingPattern.variableName;
        } else {
            // Find specific field node if query is nested within braced or indexed expressions
            const specificFieldFindingVisitor = new QueryParentFindingVisitor(node.position)
            traversNode(this.context.selection.selectedST.stNode, specificFieldFindingVisitor);
            const specificField = specificFieldFindingVisitor.getSpecificField();
            if (specificField && STKindChecker.isSpecificField(specificField) && STKindChecker.isIdentifierToken(specificField.fieldName)) {
                parentIdentifier = specificField.fieldName as IdentifierToken
                parentNode = isSelectClauseQueryExpr(fieldPath) ? parent : specificField;
            }
        }

        const isSelectedExpr = parentNode
            && (STKindChecker.isSpecificField(selectedSTNode) || STKindChecker.isLetVarDecl(selectedSTNode))
            && (isPositionsEquals(parentNode.position, selectedSTNode.position) || isSelectClauseQueryExpr(fieldPath))
            && (!position || isPositionsEquals(node.position, position));

        if (isSelectedExpr) {
            const { fromClause, intermediateClauses } = node.queryPipeline;
            if (parentIdentifier) {
                const intermediateClausesHeight = 100 + intermediateClauses.length * OFFSETS.INTERMEDIATE_CLAUSE_HEIGHT;
                // create output node
                let exprType = getTypeOfOutput(parentIdentifier, this.context.ballerinaVersion);
                // Fetch types from let var decl expression to ensure the backward compatibility
                if (!exprType && STKindChecker.isLetVarDecl(parentNode)) {
                    exprType = getTypeFromStore(parentNode.expression.position as NodePosition);
                } else if (exprType && isSelectClauseQueryExpr(fieldPath)) {
                    exprType = getSubArrayType(exprType, this.selection.selectedST.index);
                }

                const isAnydataTypedField = exprType
                    && (exprType.typeName === AnydataType
                        || (exprType.typeName === PrimitiveBalType.Array
                            && exprType?.memberType?.typeName === AnydataType));
                if (!exprType || isAnydataTypedField) {
                    const prevOutputType = getPrevOutputType(this.selection.prevST, this.context.ballerinaVersion);
                    const isPrevOutputAnydata = prevOutputType
                        && (prevOutputType.typeName === AnydataType
                            || (prevOutputType.typeName === PrimitiveBalType.Array
                                && prevOutputType.memberType.typeName === AnydataType));
                    if (isPrevOutputAnydata || isAnydataTypedField) {
                        exprType = constructTypeFromSTNode(node);
                    }
                }

                const selectClause = node?.selectClause || node?.resultClause
                const innerExpr = getInnermostExpressionBody(selectClause.expression);
                const hasConditionalOutput = STKindChecker.isConditionalExpression(innerExpr);
                if (hasConditionalOutput) {
                    this.outputNode = new UnsupportedIONode(
                        this.context,
                        UnsupportedExprNodeKind.Output,
                        undefined,
                        innerExpr,
                    );
                } else if (exprType?.typeName === PrimitiveBalType.Array) {
                    const { memberType } = exprType;
                    if (memberType.typeName === PrimitiveBalType.Record) {
                        this.outputNode = new MappingConstructorNode(
                            this.context,
                            selectClause,
                            parentIdentifier,
                            memberType,
                            node
                        );
                    } else if (memberType.typeName === PrimitiveBalType.Array) {
                        this.outputNode = new ListConstructorNode(
                            this.context,
                            selectClause,
                            parentIdentifier,
                            memberType,
                            node
                        );
                    } else if (memberType.typeName === PrimitiveBalType.Union) {
                        this.outputNode = new UnionTypeNode(
                            this.context,
                            selectClause,
                            parentIdentifier,
                            memberType
                        );
                    } else {
                        this.outputNode = new PrimitiveTypeNode(
                            this.context,
                            selectClause,
                            parentIdentifier,
                            memberType,
                            node
                        );
                    }
                } else {
                    if (exprType?.typeName === PrimitiveBalType.Record) {
                        this.outputNode = new MappingConstructorNode(
                            this.context,
                            selectClause,
                            parentIdentifier,
                            exprType
                        );
                    } else if (exprType?.typeName === PrimitiveBalType.Union) {
                        const message = "Union types within query expressions are not supported at the moment"
                        this.outputNode = new UnsupportedIONode(
                            this.context,
                            UnsupportedExprNodeKind.Output,
                            message,
                            undefined
                        );
                        // TODO: Uncomment this once the union type support is added in the lang
                        //  (https://github.com/ballerina-platform/ballerina-lang/issues/40012)
                        // this.outputNode = new UnionTypeNode(
                        //     this.context,
                        //     selectClause,
                        //     parentIdentifier,
                        //     exprType
                        // );
                    } else {
                        this.outputNode = new PrimitiveTypeNode(
                            this.context,
                            selectClause,
                            parentIdentifier,
                            exprType,
                            node
                        );
                    }
                    if (isComplexExpression(selectClause.expression) || isIndexedExpression(selectClause.expression)) {
                        const inputNodes = getInputNodes(selectClause);
                        const linkConnectorNode = new LinkConnectorNode(
                            this.context,
                            node,
                            "",
                            parent,
                            inputNodes,
                            this.mapIdentifiers.slice(0)
                        );
                        this.intermediateNodes.push(linkConnectorNode);
                    }
                }

                this.outputNode.setPosition(OFFSETS.TARGET_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, intermediateClausesHeight + 50);

                const expandedHeaderPorts: DefaultPortModel[] = [];

                // create input nodes
                const fromClauseNode = new FromClauseNode(this.context, fromClause);
                fromClauseNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, intermediateClausesHeight + OFFSETS.QUERY_VIEW_TOP_MARGIN);
                this.inputParamNodes.push(fromClauseNode);

                const fromClauseNodeValueLabel = getFromClauseNodeLabel(fromClause?.typedBindingPattern?.bindingPattern, fromClause.expression);
                const fromClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${fromClauseNodeValueLabel}`);
                expandedHeaderPorts.push(fromClausePort);
                fromClauseNode.addPort(fromClausePort);

                const letClauses = intermediateClauses?.filter((item) => {
                    return (
                        (STKindChecker.isLetClause(item) && !hasErrorDiagnosis(item)) ||
                        (STKindChecker.isJoinClause(item) && !hasErrorDiagnosis(item))
                    );
                });

                for (const [, item] of letClauses.entries()) {
                    if (STKindChecker.isLetClause(item)) {
                        const paramNode = new LetClauseNode(this.context, item as LetClause);
                        paramNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                        this.inputParamNodes.push(paramNode);

                        const letClauseValueLabel = (
                            ((item as LetClause)?.letVarDeclarations[0] as LetVarDecl)?.typedBindingPattern
                                ?.bindingPattern as CaptureBindingPattern
                        )?.variableName?.value;
                        const letClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${letClauseValueLabel}`);
                        expandedHeaderPorts.push(letClausePort);
                    } else if (STKindChecker.isJoinClause(item)) {
                        const paramNode = new JoinClauseNode(this.context, item as JoinClause);
                        if (paramNode.getSourceType()){
                            paramNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                            this.inputParamNodes.push(paramNode);

                            const joinClauseValueLabel = ((item as JoinClause)?.typedBindingPattern?.bindingPattern as CaptureBindingPattern)?.variableName?.value;
                            const joinClausePort = new DefaultPortModel(true, `${EXPANDED_QUERY_INPUT_NODE_PREFIX}.${joinClauseValueLabel}`);
                            expandedHeaderPorts.push(joinClausePort);
                        }
                    }
                }

                const queryNode = new ExpandedMappingHeaderNode(this.context, node);
                queryNode.setLocked(true);
                this.queryNode = queryNode;
                queryNode.targetPorts = expandedHeaderPorts;
                queryNode.height = intermediateClausesHeight;

                // create node for sub mappings
                const letExprNode = new LetExpressionNode(
                    this.context,
                    this.context.functionST.functionBody as ExpressionFunctionBody,
                    true
                );
                letExprNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                this.otherInputNodes.push(letExprNode);

                // if (STKindChecker.isLetExpression((this.context.functionST.functionBody as ExpressionFunctionBody).expression)) {
                //     const letExprNode = new LetExpressionNode(
                //         this.context,
                //         this.context.functionST.functionBody as ExpressionFunctionBody,
                //         true
                //     );
                //     letExprNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                //     this.otherInputNodes.push(letExprNode);
                // }

                // create node for module variables
                const moduleVariables: Map<string, ModuleVariable> = getModuleVariables(selectClause.expression, this.context.moduleComponents);
                if (moduleVariables.size > 0) {
                    const moduleVarNode = new ModuleVariableNode(
                        this.context,
                        moduleVariables
                    );
                    moduleVarNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                    this.otherInputNodes.push(moduleVarNode);
                }

                // create node for enums
                const enumTypes: Map<string, ModuleVariable> = getEnumTypes(selectClause.expression, this.context.moduleComponents);
                if (enumTypes.size > 0) {
                    const enumTypeNode = new EnumTypeNode(
                        this.context,
                        enumTypes
                    );
                    enumTypeNode.setPosition(OFFSETS.SOURCE_NODE.X + OFFSETS.QUERY_VIEW_LEFT_MARGIN, 0);
                    this.otherInputNodes.push(enumTypeNode);
                }
            }
            if (isSelectClauseQueryExpr(fieldPath)) {
                const currentSelectClause = node?.resultClause || node.selectClause;
                if (STKindChecker.isQueryExpression(currentSelectClause.expression)) {
                    // query expr as the select clause expr of a query expr declared as a specific field
                    // (eg: when an ouput field is multi dimensional array and the mapped input is also a multi dimensional array)
                    const queryNode = new QueryExpressionNode(this.context, currentSelectClause.expression, parentNode);
                    this.intermediateNodes.push(queryNode);
                    this.isWithinQuery += 1;
                }
            }
        } else if (!isFnBodyQueryExpr(fieldPath) && !isSelectClauseQueryExpr(fieldPath) && !isLetVarDecl && parentNode) {
            // query expr as the value expr of a specific field
            const queryNode = new QueryExpressionNode(this.context, node, parentNode);
            if (this.isWithinQuery === 0) {
                this.intermediateNodes.push(queryNode);
            }
            this.isWithinQuery += 1;
        } else {
            if (STKindChecker.isFunctionDefinition(selectedSTNode)
                && STKindChecker.isExpressionFunctionBody(selectedSTNode.functionBody)
                && !isLetVarDecl)
            {
                let queryExpr: STNode = selectedSTNode.functionBody.expression;
                if (STKindChecker.isLetExpression(selectedSTNode.functionBody.expression)) {
                    queryExpr = getExprBodyFromLetExpression(selectedSTNode.functionBody.expression)
                } else if (!STKindChecker.isQueryExpression(queryExpr)) {
                    queryExpr = node;
                }

                if (isFnBodyQueryExpr(fieldPath)) {
                    if (!isPositionsEquals(queryExpr.position, node.position) && this.isWithinQuery === 0) {
                        // query expr as the function body
                        const queryNode = new QueryExpressionNode(this.context, node, parentNode);
                        this.intermediateNodes.push(queryNode);
                        this.isWithinQuery += 1;
                    }
                } else if (isSelectClauseQueryExpr(fieldPath)) {
                    const queryExprFindingVisitor = new QueryExprFindingVisitorByPosition(this.selection.selectedST.position);
                    traversNode(queryExpr, queryExprFindingVisitor);
                    const currentQueryExpr = queryExprFindingVisitor.getQueryExpression();
                    const currentSelectClause = currentQueryExpr?.resultClause || currentQueryExpr.selectClause;
                    if (isPositionsEquals(currentQueryExpr.position, node.position)
                        && STKindChecker.isQueryExpression(currentSelectClause.expression)) {
                        // query expr as the select clause expr of a query expr declared as a function body
                        // (eg: when output is multi dimensional array and the mapped input is also a multi dimensional array)
                        const queryNode = new QueryExpressionNode(this.context, currentSelectClause.expression, parentNode);
                        this.intermediateNodes.push(queryNode);
                        this.isWithinQuery += 1;
                    }
                }
            }
        }
    }

    beginVisitSpecificField(node: SpecificField, parent?: STNode) {
        const selectedSTNode = this.selection.selectedST.stNode;
        let valueExpr: STNode = node.valueExpr;
        const innerExpr = getInnermostExpressionBody(valueExpr);
        if (!isPositionsEquals(selectedSTNode.position as NodePosition, node.position as NodePosition)) {
            this.mapIdentifiers.push(node)
        }
        if (this.isWithinQuery === 0
            && (this.isWithinLetVarDecl === 0
                || (this.isWithinLetVarDecl > 0 && STKindChecker.isLetVarDecl(selectedSTNode)))
            && innerExpr
            && !STKindChecker.isMappingConstructor(innerExpr)
            && !STKindChecker.isListConstructor(innerExpr)
        ) {
            const inputNodes = getInputNodes(innerExpr);
            valueExpr = STKindChecker.isCheckExpression(innerExpr) ? innerExpr.expression : innerExpr;
            const fnDefForFnCall = STKindChecker.isFunctionCall(valueExpr) && getFnDefForFnCall(valueExpr);

            if (inputNodes.length > 1 ||
                (inputNodes.length === 1 &&
                    (isComplexExpression(valueExpr) || fnDefForFnCall)
                ) ||
                isIndexedExpression(valueExpr)
            ) {
                const linkConnectorNode = new LinkConnectorNode(
                    this.context,
                    node,
                    node.fieldName.value as string,
                    parent,
                    inputNodes,
                    this.mapIdentifiers.slice(0),
                    fnDefForFnCall
                );
                this.intermediateNodes.push(linkConnectorNode);
            }
        }
    }

    beginVisitListConstructor(node: ListConstructor, parent?: STNode): void {
        this.mapIdentifiers.push(node);
        if (this.isWithinQuery === 0 && node.expressions) {
            node.expressions.forEach((expr: STNode) => {
                let innerExpr = STKindChecker.isTypeCastExpression(expr)
                    ? getExprBodyFromTypeCastExpression(expr)
                    : expr;
                if (!STKindChecker.isMappingConstructor(innerExpr) && !STKindChecker.isListConstructor(innerExpr)) {
                    const inputNodes = getInputNodes(innerExpr);
                    innerExpr = STKindChecker.isCheckExpression(innerExpr) ? innerExpr.expression : innerExpr;
                    const fnDefForFnCall = STKindChecker.isFunctionCall(innerExpr) && getFnDefForFnCall(innerExpr);
                    if (inputNodes.length > 1 ||
                        (inputNodes.length === 1 &&
                            (isComplexExpression(innerExpr) || fnDefForFnCall)
                        ) ||
                        isIndexedExpression(innerExpr)
                    ) {
                        const linkConnectorNode = new LinkConnectorNode(
                            this.context,
                            innerExpr,
                            "",
                            parent,
                            inputNodes,
                            [...this.mapIdentifiers, innerExpr],
                            fnDefForFnCall,
                            true
                        );
                        this.intermediateNodes.push(linkConnectorNode);
                    }
                }
            })
        }

    }

    beginVisitSelectClause(node: SelectClause, parent?: STNode): void {
        const innerExpr = getInnermostExpressionBody(node.expression);
        if (this.isWithinQuery === 0
            && !STKindChecker.isMappingConstructor(innerExpr)
            && !STKindChecker.isListConstructor(innerExpr)
        ) {
            const inputNodes = getInputNodes(innerExpr);
            if (inputNodes.length > 1 || isIndexedExpression(innerExpr)) {
                const linkConnectorNode = new LinkConnectorNode(
                    this.context,
                    innerExpr,
                    "",
                    parent,
                    inputNodes,
                    [...this.mapIdentifiers, innerExpr]
                );
                this.intermediateNodes.push(linkConnectorNode);
            }
        }
    }

    // TODO: Update the syntax tree interfaces to include the result clause
    beginVisitSTNode(node: STNode, parent?: STNode): void {
        if (node?.kind && node.kind === "CollectClause") {
            const innerExpr = getInnermostExpressionBody((node as SelectClause).expression);
            if (this.isWithinQuery === 0
                && !STKindChecker.isMappingConstructor(innerExpr)
                && !STKindChecker.isListConstructor(innerExpr)
            ) {
                const inputNodes = getInputNodes(innerExpr);

                if (inputNodes.length > 1 || isIndexedExpression(innerExpr)) {
                    const linkConnectorNode = new LinkConnectorNode(
                        this.context,
                        innerExpr,
                        "",
                        parent,
                        inputNodes,
                        [...this.mapIdentifiers, innerExpr]
                    );
                    this.intermediateNodes.push(linkConnectorNode);
                }
            }
        }
    }

    beginVisitExpressionFunctionBody(node: ExpressionFunctionBody, parent?: STNode): void {
        const expr = getInnermostExpressionBody(node.expression);
        if (!STKindChecker.isMappingConstructor(expr)
            && !STKindChecker.isListConstructor(expr)
            && !STKindChecker.isExplicitAnonymousFunctionExpression(parent))
        {
            const inputNodes = getInputNodes(expr);

            if (inputNodes.length > 1 || isIndexedExpression(expr)) {
                const linkConnectorNode = new LinkConnectorNode(
                    this.context,
                    node.expression,
                    "",
                    parent,
                    inputNodes,
                    [node.expression]
                );
                this.intermediateNodes.push(linkConnectorNode);
            }
        }
    }

    beginVisitLetVarDecl(node: LetVarDecl): void {
        this.isWithinLetVarDecl += 1;
    }

    endVisitLetVarDecl(node: LetVarDecl): void {
        this.isWithinLetVarDecl -= 1;
    }

    beginVisitMappingConstructor(node: MappingConstructor): void {
        this.mapIdentifiers.push(node);
    }

    endVisitQueryExpression?() {
        if (this.isWithinQuery > 0) {
            this.isWithinQuery -= 1;
        }
    };

    endVisitSpecificField() {
        if (this.mapIdentifiers.length > 0) {
            this.mapIdentifiers.pop()
        }
    }

    endVisitListConstructor() {
        if (this.mapIdentifiers.length > 0) {
            this.mapIdentifiers.pop()
        }
    }

    endVisitMappingConstructor() {
        if (this.mapIdentifiers.length > 0) {
            this.mapIdentifiers.pop()
        }
    }

    getNodes() {
        const nodes = [...this.inputParamNodes, ...this.otherInputNodes];
        if (this.outputNode) {
            nodes.push(this.outputNode);
        }
        this.intermediateNodes.forEach((node) => {
            node.setPosition(OFFSETS.LINK_CONNECTOR_NODE.X, OFFSETS.TARGET_NODE.Y);
        });
        nodes.push(...this.intermediateNodes);
        if (this.queryNode){
            nodes.unshift(this.queryNode);
        }
        return nodes;
    }
}
