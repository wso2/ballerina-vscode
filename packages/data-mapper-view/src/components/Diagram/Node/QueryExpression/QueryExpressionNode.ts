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
import { PrimitiveBalType, STModification, TypeField } from "@wso2/ballerina-core";
import {
    ExpressionFunctionBody,
    NodePosition,
    QueryExpression,
    STKindChecker,
    STNode,
    traversNode
} from "@wso2/syntax-tree";
import md5 from "blueimp-md5";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { isPositionsEquals } from "../../../../utils/st-utils";
import { DataMapperLinkModel } from "../../Link";
import { IntermediatePortModel, RecordFieldPortModel } from "../../Port";
import {
    EXPANDED_QUERY_SOURCE_PORT_PREFIX,
    LET_EXPRESSION_SOURCE_PORT_PREFIX,
    LIST_CONSTRUCTOR_TARGET_PORT_PREFIX,
    OFFSETS,
    PRIMITIVE_TYPE_TARGET_PORT_PREFIX,
    UNION_TYPE_TARGET_PORT_PREFIX
} from "../../utils/constants";
import {
    getDefaultValue,
    getExprBodyFromLetExpression,
    getFieldNames,
    getInnermostExpressionBody,
    getMethodCallElements,
    getTypeFromStore, isRepresentFnBody
} from "../../utils/dm-utils";
import { LinkDeletingVisitor } from "../../visitors/LinkDeletingVistior";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { FromClauseNode } from "../FromClause";
import { LetExpressionNode } from "../LetExpression";
import { ListConstructorNode } from "../ListConstructor";
import { MappingConstructorNode } from "../MappingConstructor";
import { PrimitiveTypeNode } from "../PrimitiveType";
import { RequiredParamNode } from "../RequiredParam";
import { UnionTypeNode } from "../UnionType";

export const QUERY_EXPR_NODE_TYPE = "datamapper-node-query-expr";
const NODE_ID = "query-expr-node";

export enum QueryExprMappingType {
    A2AWithSelect = "array-to-array-with-select",
    A2SWithSelect = "array-to-single-with-select",
    A2SWithCollect = "array-to-single-with-collect",
};

export class QueryExpressionNode extends DataMapperNodeModel {

    public sourceTypeDesc: TypeField;
    public sourcePort: RecordFieldPortModel;
    public targetPort: RecordFieldPortModel;

    public inPort: IntermediatePortModel;
    public outPort: IntermediatePortModel;

    public targetFieldFQN: string;
    public hidden: boolean;
    public hasInitialized: boolean;

    constructor(
        public context: IDataMapperContext,
        public value: QueryExpression,
        public parentNode: STNode) {
        super(
            // `${NODE_ID}-${value.queryPipeline.fromClause.typedBindingPattern.bindingPattern.source.trim()}`,
            NODE_ID,
            context,
            QUERY_EXPR_NODE_TYPE
        );
    }

    initPorts(): void {
        this.sourcePort = undefined;
        this.targetPort = undefined;
        this.sourceTypeDesc = undefined;
        this.getSourceType();
        this.getTargetType();
        this.inPort = new IntermediatePortModel(
            md5(JSON.stringify(this.value.position) + "IN")
            , "IN"
        );
        this.addPort(this.inPort);
        this.outPort = new IntermediatePortModel(
            md5(JSON.stringify(this.value.position) + "OUT")
            , "OUT"
        );
        this.addPort(this.outPort);
    }

    private getSourceType(): void {
        const fromClause = this.value.queryPipeline.fromClause;
        const sourceFieldAccess = fromClause.expression;
        const bindingPattern = this.value.queryPipeline.fromClause.typedBindingPattern.bindingPattern;
        if (STKindChecker.isCaptureBindingPattern(bindingPattern)
            || STKindChecker.isMappingBindingPattern(bindingPattern)
            || STKindChecker.isListBindingPattern(bindingPattern)) {
            const type = getTypeFromStore(fromClause.expression.position);

            if (type && type?.memberType && type.typeName === PrimitiveBalType.Array) {
                this.sourceTypeDesc = type.memberType;
            }

            let fieldId: string;
            let paramName: string;
            if (STKindChecker.isFieldAccess(sourceFieldAccess)) {
                const fieldNames = getFieldNames(sourceFieldAccess);
                fieldId = fieldNames.reduce((pV, cV) => pV ? `${pV}.${cV.name}` : cV.name, "");
                paramName = fieldNames[0].name;
            } else if (STKindChecker.isSimpleNameReference(sourceFieldAccess)) {
                fieldId = sourceFieldAccess.name.value;
                paramName = fieldId;
            } else if (STKindChecker.isBinaryExpression(sourceFieldAccess)
                && STKindChecker.isElvisToken(sourceFieldAccess.operator)) {
                fieldId = sourceFieldAccess.lhsExpr.source.trim();
                if (STKindChecker.isFieldAccess(sourceFieldAccess.lhsExpr)
                    && STKindChecker.isSimpleNameReference(sourceFieldAccess.lhsExpr.expression)) {
                    paramName = sourceFieldAccess.lhsExpr.expression.name.value;
                }
            } else if (STKindChecker.isMethodCall(sourceFieldAccess)) {
                const elements = getMethodCallElements(sourceFieldAccess);
                fieldId = elements.reduce((pV, cV) => pV ? `${pV}.${cV}` : cV, "");
                paramName = elements[0];
            }

            this.getModel().getNodes().map((node) => {
                if (node instanceof RequiredParamNode && node?.value && node.value.paramName.value === paramName) {
                    this.sourcePort = node.getPort(fieldId + ".OUT") as RecordFieldPortModel;
                } else if (node instanceof FromClauseNode
                    && STKindChecker.isCaptureBindingPattern(node.value.typedBindingPattern.bindingPattern)
                    && node.value.typedBindingPattern.bindingPattern.source.trim() === paramName.trim())
                {
                    this.sourcePort = node.getPort(
                        `${EXPANDED_QUERY_SOURCE_PORT_PREFIX}.${fieldId}.OUT`) as RecordFieldPortModel;
                } else if (node instanceof LetExpressionNode) {
                    const letDecl = node.letVarDecls.some(decl => decl.varName === paramName);
                    if (letDecl) {
                        this.sourcePort = node.getPort(
                            `${LET_EXPRESSION_SOURCE_PORT_PREFIX}.${fieldId}.OUT`) as RecordFieldPortModel;
                    }
                }
                while (this.sourcePort && this.sourcePort.hidden){
                    this.sourcePort = this.sourcePort.parentModel;
                }
            });
        }
    }

    private getTargetType(): void {
        const innerMostExpr = getInnermostExpressionBody(this.parentNode);
        const selectedST = this.context.selection.selectedST.stNode;
        let exprFuncBody : ExpressionFunctionBody;
        if (STKindChecker.isFunctionDefinition(selectedST) && STKindChecker.isExpressionFunctionBody(selectedST.functionBody)) {
            exprFuncBody = selectedST.functionBody;
        }
        const fieldNamePosition = STKindChecker.isSpecificField(innerMostExpr)
            && innerMostExpr.fieldName.position as NodePosition;
        const isSelectClauseQuery = STKindChecker.isSelectClause(this.parentNode) || (fieldNamePosition
            && STKindChecker.isQueryExpression(innerMostExpr.valueExpr)
            && !isPositionsEquals(innerMostExpr.valueExpr.position, this.value.position));

        if (fieldNamePosition && !isSelectClauseQuery) {
            this.getModel().getNodes().map((node) => {
                if (node instanceof MappingConstructorNode
                    || node instanceof ListConstructorNode
                    || node instanceof UnionTypeNode) {
                    const ports = Object.entries(node.getPorts());
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof RecordFieldPortModel
                            && port?.editableRecordField && port.editableRecordField?.value
                            && STKindChecker.isSpecificField(port.editableRecordField.value)
                            && isPositionsEquals(port.editableRecordField.value.fieldName.position as NodePosition,
                                            fieldNamePosition)
                        ) {
                            this.targetPort = port;
                        }
                    });
                }
            });
        } else if (isSelectClauseQuery || isRepresentFnBody(this.parentNode, exprFuncBody)) {
            this.getModel().getNodes().forEach((node) => {
                const ports = Object.entries(node.getPorts());
                if (node instanceof ListConstructorNode) {
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof RecordFieldPortModel
                            && port?.editableRecordField && port.editableRecordField?.value
                            && STKindChecker.isQueryExpression(port.editableRecordField.value)
                            && isPositionsEquals(port.editableRecordField.value.position, this.value.position)
                            && port.portName === `${LIST_CONSTRUCTOR_TARGET_PORT_PREFIX}.${node.rootName}`
                            && port.portType === 'IN'
                        ) {
                            this.targetPort = port;
                        }
                    });
                } else if (node instanceof UnionTypeNode) {
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof RecordFieldPortModel
                            && port.portName === `${UNION_TYPE_TARGET_PORT_PREFIX}`
                            && port.portType === 'IN'
                        ) {
                            this.targetPort = port;
                        }
                    });
                } else if (node instanceof PrimitiveTypeNode) {
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof RecordFieldPortModel
                            && port.portName === `${PRIMITIVE_TYPE_TARGET_PORT_PREFIX}.${node.recordField.type.typeName}`
                            && port.portType === 'IN'
                        ) {
                            this.targetPort = port;
                        }
                    });
                }
            });
        } else if (STKindChecker.isLetExpression(this.parentNode)) {
            const exprPosition = this.parentNode.expression.position;
            this.getModel().getNodes().forEach((node) => {
                if (node instanceof ListConstructorNode) {
                    const ports = Object.entries(node.getPorts());
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof RecordFieldPortModel
                            && port?.editableRecordField && port.editableRecordField?.value
                            && STKindChecker.isLetExpression(port.editableRecordField.value)
                            && isPositionsEquals(getExprBodyFromLetExpression(port.editableRecordField.value).position, exprPosition)
                            && port.portName === `${LIST_CONSTRUCTOR_TARGET_PORT_PREFIX}.${node.rootName}`
                            && port.portType === 'IN'
                        ) {
                            this.targetPort = port;
                        }
                    });
                }
            });
        } else if (STKindChecker.isBracedExpression(innerMostExpr)) {
            // To draw link between query node and output node
            // when having indexed query expressions at function body level
            this.getModel().getNodes().forEach((node) => {
                if (node instanceof PrimitiveTypeNode) {
                    const ports = Object.entries(node.getPorts());
                    ports.map((entry) => {
                        const port = entry[1];
                        if (port instanceof RecordFieldPortModel
                            && port?.editableRecordField && port.editableRecordField?.value
                            && STKindChecker.isQueryExpression(port.editableRecordField.value)
                            && STKindChecker.isBracedExpression(innerMostExpr)
                            && STKindChecker.isQueryExpression(innerMostExpr.expression)
                            && isPositionsEquals(port.editableRecordField.value.position, innerMostExpr.expression.position)
                            && port.portName === `${PRIMITIVE_TYPE_TARGET_PORT_PREFIX}.${node.typeDef.name ? `${node.typeDef.typeName}.${node.typeDef.name}` : node.typeName}`
                            && port.portType === 'IN'
                        ) {
                            this.targetPort = port;
                        }
                    });
                }
            });
        }

        const previouslyHidden = this.hidden;
        this.hidden = this.targetPort?.hidden;
    
        if (this.hidden !== previouslyHidden) {
            this.hasInitialized = false;
        }
        while (this.targetPort && this.targetPort.hidden){
            this.targetPort = this.targetPort.parentModel;
        }
    }

    initLinks(): void {
        if (this.hasInitialized) {
            return;
        }
        if (!this.hidden) {
            // Currently, we create links from "IN" ports and back tracing the inputs.
            if (this.sourcePort && this.inPort) {
                const link = new DataMapperLinkModel(undefined, undefined, true);
                link.setSourcePort(this.sourcePort);
                link.setTargetPort(this.inPort);
                this.sourcePort.addLinkedPort(this.inPort);
                this.sourcePort.addLinkedPort(this.targetPort);
                link.registerListener({
                    selectionChanged: (event) => {
                        if (event.isSelected) {
                            this.sourcePort.fireEvent({}, "link-selected");
                            this.inPort.fireEvent({}, "link-selected");
                        } else {

                            this.sourcePort.fireEvent({}, "link-unselected");
                            this.inPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(link);
            }

            // TODO - temp hack to render link
            if (this.outPort && this.targetPort) {
                const link = new DataMapperLinkModel(undefined, undefined, true);
                link.setSourcePort(this.outPort);
                link.setTargetPort(this.targetPort);
                link.registerListener({
                    selectionChanged: (event) => {
                        if (event.isSelected) {
                            this.targetPort.fireEvent({}, "link-selected");
                            this.outPort.fireEvent({}, "link-selected");
                        } else {
                            this.targetPort.fireEvent({}, "link-unselected");
                            this.outPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(link);
                this.targetFieldFQN = this.targetPort.fieldFQN;
            }
        } else {
            if (this.sourcePort && this.targetPort) {
                const link = new DataMapperLinkModel(undefined, undefined, true);
                link.setSourcePort(this.sourcePort);
                link.setTargetPort(this.targetPort);
                this.sourcePort.addLinkedPort(this.targetPort);
                link.registerListener({
                    selectionChanged: (event) => {
                        if (event.isSelected) {
                            this.sourcePort.fireEvent({}, "link-selected");
                            this.targetPort.fireEvent({}, "link-selected");
                        } else {

                            this.sourcePort.fireEvent({}, "link-unselected");
                            this.targetPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(link);
            }
        }
        this.hasInitialized = true;
    }

    public updatePosition() {
        if (this.targetPort){
            const position = this.targetPort.getPosition()
            this.setPosition(OFFSETS.QUERY_EXPRESSION_NODE.X, position.y - 2)
        }
    }

    public deleteLink(): void {
        let modifications: STModification[];
        const dmNode = this.getModel().getNodes().find(node =>
            node instanceof MappingConstructorNode || node instanceof ListConstructorNode || node instanceof PrimitiveTypeNode
        ) as MappingConstructorNode | ListConstructorNode | PrimitiveTypeNode;
        if (dmNode) {
            if (STKindChecker.isSpecificField(this.parentNode)) {
                const rootConstruct = dmNode.value.expression;
                const linkDeleteVisitor = new LinkDeletingVisitor(this.parentNode.position as NodePosition, rootConstruct);
                traversNode(this.context.selection.selectedST.stNode, linkDeleteVisitor);
                const nodePositionsToDelete = linkDeleteVisitor.getPositionToDelete();
                modifications = [{
                    type: "DELETE",
                    ...nodePositionsToDelete
                }];
            } else {
                modifications = [{
                    type: "INSERT",
                    config: {
                        "STATEMENT": getDefaultValue(dmNode.typeDef?.typeName)
                    },
                    ...this.value.position
                }];
            }
        }

        this.context.applyModifications(modifications);
    }
}
