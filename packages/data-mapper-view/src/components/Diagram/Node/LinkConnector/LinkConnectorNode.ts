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
import { PrimitiveBalType, STModification } from "@wso2/ballerina-core";
import {
    FieldAccess,
    NodePosition,
    OptionalFieldAccess,
    SimpleNameReference,
    STKindChecker,
    STNode,
    traversNode
} from "@wso2/syntax-tree";
import md5 from "blueimp-md5";
import { Diagnostic } from "vscode-languageserver-types";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { isPositionsEquals } from "../../../../utils/st-utils";
import { DataMapperLinkModel } from "../../Link";
import { IntermediatePortModel, RecordFieldPortModel } from "../../Port";
import {
    LIST_CONSTRUCTOR_TARGET_PORT_PREFIX,
    OFFSETS, PRIMITIVE_TYPE_TARGET_PORT_PREFIX
} from "../../utils/constants";
import {
    getDefaultValue,
    getInputNodeExpr,
    getInputPortsForExpr,
    getOutputPortForField,
    getTargetPortPrefix
} from "../../utils/dm-utils";
import { FnDefInfo } from "../../utils/fn-definition-store";
import { filterDiagnostics } from "../../utils/ls-utils";
import { LinkDeletingVisitor } from "../../visitors/LinkDeletingVistior";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { ListConstructorNode } from "../ListConstructor";
import { MappingConstructorNode } from "../MappingConstructor";
import { PrimitiveTypeNode } from "../PrimitiveType";
import { UnionTypeNode } from "../UnionType";
import { ExpressionLabelModel } from "../../Label";
import { NodeFindingVisitorByPosition } from "../../visitors/NodeFindingVisitorByPosition";

export const LINK_CONNECTOR_NODE_TYPE = "link-connector-node";
const NODE_ID = "link-connector-node";

export class LinkConnectorNode extends DataMapperNodeModel {

    public sourcePorts: RecordFieldPortModel[] = [];
    public sourceValues:{[key: string]: STNode[]} = {};
    public targetMappedPort: RecordFieldPortModel;
    public targetPort: RecordFieldPortModel;

    public inPort: IntermediatePortModel;
    public outPort: IntermediatePortModel;

    public value: string;
    public diagnostics: Diagnostic[];
    public hidden: boolean;
    public hasInitialized: boolean;

    constructor(
        public context: IDataMapperContext,
        public valueNode: STNode,
        public editorLabel: string,
        public parentNode: STNode,
        public fieldAccessNodes: (FieldAccess | OptionalFieldAccess | SimpleNameReference)[],
        public fields: STNode[],
        public fnDefForFnCall?: FnDefInfo,
        public isPrimitiveTypeArrayElement?: boolean) {
        super(
            NODE_ID,
            context,
            LINK_CONNECTOR_NODE_TYPE
        );
        if (STKindChecker.isSpecificField(valueNode)) {
            this.value = valueNode.valueExpr ? valueNode.valueExpr.source.trim() : '';
            this.diagnostics = filterDiagnostics(this.context.diagnostics, valueNode.valueExpr.position as NodePosition);
        } else {
            this.value = valueNode.value ? (valueNode.value as string).trim()  : valueNode.source.trim();
            this.diagnostics = filterDiagnostics(this.context.diagnostics, valueNode.position as NodePosition);
        }
    }

    initPorts(): void {
        this.sourcePorts = [];
        this.sourceValues = {};
        this.targetMappedPort = undefined;
        this.inPort = new IntermediatePortModel(
            md5(JSON.stringify(this.valueNode.position) + "IN")
            , "IN"
        );
        this.addPort(this.inPort);
        this.outPort = new IntermediatePortModel(
            md5(JSON.stringify(this.valueNode.position) + "OUT")
            , "OUT"
        );
        this.addPort(this.outPort);

        this.fieldAccessNodes.forEach((field) => {
            const inputNode = getInputNodeExpr(field, this);
            if (inputNode) {
                const inputPort = getInputPortsForExpr(inputNode, field);
                if (!this.sourcePorts.some(port => port.getID() === inputPort.getID())) {
                    this.sourcePorts.push(inputPort);
                    this.sourceValues[inputPort.getID()] = [field];
                } else {
                    this.sourceValues[inputPort.getID()].push(field);
                }
            }
        })

        if (this.outPort) {
            this.getModel().getNodes().map((node) => {
                if (node instanceof MappingConstructorNode
                    || node instanceof PrimitiveTypeNode
                    || node instanceof ListConstructorNode
                    || node instanceof UnionTypeNode)
                {
                    const targetPortPrefix = getTargetPortPrefix(node);
                    if (STKindChecker.isFunctionDefinition(this.parentNode)
                        || STKindChecker.isQueryExpression(this.parentNode)
                        || STKindChecker.isSpecificField(this.parentNode)
                        || STKindChecker.isBracedExpression(this.parentNode))
                    {
                        const typeName = targetPortPrefix === PRIMITIVE_TYPE_TARGET_PORT_PREFIX
                            ? node.recordField.type.typeName
                            : (node as MappingConstructorNode | ListConstructorNode | UnionTypeNode)?.rootName
                        this.targetPort = node.getPort(
                            `${targetPortPrefix}${typeName ? `.${typeName}` : ''}.IN`
                        ) as RecordFieldPortModel;
                        this.targetMappedPort = this.targetPort;
                    } else {
                        const rootName = targetPortPrefix === LIST_CONSTRUCTOR_TARGET_PORT_PREFIX
                            ? (node as ListConstructorNode | UnionTypeNode).rootName
                            : undefined;
                        [this.targetPort, this.targetMappedPort] = getOutputPortForField(this.fields,
                            node.recordField, targetPortPrefix,
                            (portId: string) =>  node.getPort(portId) as RecordFieldPortModel,
                            rootName);
                        const previouslyHidden = this.hidden;
                        this.hidden = this.targetMappedPort?.portName !== this.targetPort?.portName;
                        if (this.hidden !== previouslyHidden) {
                            this.hasInitialized = false;
                        }
                    }
                }
            });
        }
    }

    initLinks(): void {
        if (this.hasInitialized) {
            return;
        }
        if (!this.hidden) {
            this.sourcePorts.forEach((sourcePort) => {
                const inPort = this.inPort;

                const lm = new DataMapperLinkModel(undefined, undefined, true);
                if (sourcePort) {
                    lm.setTargetPort(this.inPort);
                    lm.setSourcePort(sourcePort);
                    sourcePort.addLinkedPort(this.inPort);
                    sourcePort.addLinkedPort(this.targetMappedPort);
                    const targetPortExpr = this.targetMappedPort?.editableRecordField?.value;
                    const isSubLinkLabel = targetPortExpr && STKindChecker.isSpecificField(targetPortExpr)
                        && !STKindChecker.isConditionalExpression(targetPortExpr.valueExpr);

                    if (this.sourcePorts.length > 1 && isSubLinkLabel) {
                        lm.addLabel(new ExpressionLabelModel({
                            link: lm,
                            value: undefined,
                            context: undefined,
                            isSubLinkLabel: true,
                            deleteLink: () => this.deleteSubLink(sourcePort.getID())
                        }));
                    }

                    lm.registerListener({
                        selectionChanged(event) {
                            if (event.isSelected) {
                                inPort.fireEvent({}, "link-selected");
                                sourcePort.fireEvent({}, "link-selected");
                            } else {
                                inPort.fireEvent({}, "link-unselected");
                                sourcePort.fireEvent({}, "link-unselected");
                            }
                        },
                    })
                    this.getModel().addAll(lm);
                }
            })

            if (this.targetMappedPort) {
                const outPort = this.outPort;
                const targetPort = this.targetMappedPort;

                const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);
                lm.setTargetPort(this.targetMappedPort);
                lm.setSourcePort(this.outPort);

                lm.registerListener({
                    selectionChanged(event) {
                        if (event.isSelected) {
                            outPort.fireEvent({}, "link-selected");
                            targetPort.fireEvent({}, "link-selected");
                        } else {
                            outPort.fireEvent({}, "link-unselected");
                            targetPort.fireEvent({}, "link-unselected");
                        }
                    },
                })

                if (!this.editorLabel) {
                    this.editorLabel = this.targetMappedPort.fieldFQN.split('.').pop();
                }
                this.getModel().addAll(lm);
            }
        } else {
            if (this.targetMappedPort) {
                this.sourcePorts.forEach((sourcePort) => {
                    const inPort = this.targetMappedPort;

                    const lm = new DataMapperLinkModel(undefined, this.diagnostics, true);
                    lm.setTargetPort(this.targetMappedPort);
                    lm.setSourcePort(sourcePort);
                    sourcePort.addLinkedPort(this.targetMappedPort);

                    lm.registerListener({
                        selectionChanged(event) {
                            if (event.isSelected) {
                                inPort.fireEvent({}, "link-selected");
                                sourcePort.fireEvent({}, "link-selected");
                            } else {
                                inPort.fireEvent({}, "link-unselected");
                                sourcePort.fireEvent({}, "link-unselected");
                            }
                        },
                    })
                    this.getModel().addAll(lm);
                    if (!this.editorLabel) {
                        this.editorLabel = this.targetMappedPort.fieldFQN.split('.').pop();
                    }
                })
            }
        }
        this.hasInitialized = true;
    }

    updateSource(): void {
        const targetPosition = STKindChecker.isSpecificField(this.valueNode)
            ? this.valueNode.valueExpr.position as NodePosition
            : this.valueNode.position as NodePosition;
        const modifications = [
            {
                type: "INSERT",
                config: {
                    "STATEMENT": this.value,
                },
                ...targetPosition
            }
        ];
        void this.context.applyModifications(modifications);
    }

    public updatePosition() {
        if (this.targetMappedPort) {
            const position = this.targetMappedPort.getPosition()
            this.setPosition(this.hasError() ? OFFSETS.LINK_CONNECTOR_NODE_WITH_ERROR.X : OFFSETS.LINK_CONNECTOR_NODE.X, position.y - 2)
        }
    }

    public hasError(): boolean {
        return this.diagnostics.length > 0;
    }

    public deleteLink(): void {
        const targetField = this.targetPort.field;
        let modifications: STModification[];
        const selectedST = this.context.selection.selectedST.stNode;
        const exprFuncBodyPosition: NodePosition = STKindChecker.isFunctionDefinition(selectedST)
            && STKindChecker.isExpressionFunctionBody(selectedST.functionBody)
            && selectedST.functionBody.expression.position;
        if ((!targetField?.name && targetField?.typeName !== PrimitiveBalType.Array
            && targetField?.typeName !== PrimitiveBalType.Record)
            || (isPositionsEquals(exprFuncBodyPosition, this.valueNode.position)))
        {
            let deletePosition = this.valueNode.position;
            if (STKindChecker.isQueryExpression(this.valueNode)) {
                const selectClause = this.valueNode?.selectClause || this.valueNode?.resultClause;
                deletePosition = selectClause.expression?.position;
            }
            // Fallback to the default value if the target is a primitive type element
            modifications = [{
                type: "INSERT",
                config: {
                    "STATEMENT": getDefaultValue(targetField?.typeName)
                },
                ...deletePosition
            }];
        } else {
            const linkDeleteVisitor = new LinkDeletingVisitor(this.valueNode.position as NodePosition, this.parentNode);
            traversNode(this.context.selection.selectedST.stNode, linkDeleteVisitor);
            const nodePositionsToDelete = linkDeleteVisitor.getPositionToDelete();

            modifications = [{
                type: "DELETE",
                ...nodePositionsToDelete
            }];
        }

        void this.context.applyModifications(modifications);
    }

    public async deleteSubLink(sourcePortId: string): Promise<void> {

        const subLinkSTNodes = this.sourceValues[sourcePortId];

        for (let subLinkSTNode of subLinkSTNodes) {

            const nodeFindingVisitor = new NodeFindingVisitorByPosition(subLinkSTNode.position);
            traversNode(this.valueNode, nodeFindingVisitor);
            let subLinkValue  = nodeFindingVisitor.getNode();

            const linkDeleteVisitor = new LinkDeletingVisitor(subLinkValue.position as NodePosition, this.parentNode);
            traversNode(this.context.selection.selectedST.stNode, linkDeleteVisitor);
            const nodePositionsToDelete = linkDeleteVisitor.getPositionToDelete();

            let modifications: STModification[] = [{
                type: "DELETE",
                ...nodePositionsToDelete
            }];

            void this.context.applyModifications(modifications);
        }

    }
}
