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
import { Point } from "@projectstorm/geometry";
import { STModification, TypeField, PrimitiveBalType } from "@wso2/ballerina-core";
import {
    ExpressionFunctionBody,
    IdentifierToken,
    QueryExpression,
    SelectClause,
    STKindChecker,
    STNode
} from "@wso2/syntax-tree";

import { useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { ExpressionLabelModel } from "../../Label";
import { DataMapperLinkModel } from "../../Link";
import { EditableRecordField } from "../../Mappings/EditableRecordField";
import { FieldAccessToSpecificFied } from "../../Mappings/FieldAccessToSpecificFied";
import { RecordFieldPortModel } from "../../Port";
import { PRIMITIVE_TYPE_TARGET_PORT_PREFIX } from "../../utils/constants";
import {
    getDefaultValue,
    getDiagnosticsPosition,
    getFilteredMappings,
    getFilteredUnionOutputTypes,
    getInnermostExpressionBody,
    getInputNodeExpr,
    getInputPortsForExpr,
    getOutputPortForField,
    getTypeName,
    isArrayOrRecord,
    isIndexedExpression
} from "../../utils/dm-utils";
import { filterDiagnostics } from "../../utils/ls-utils";
import { getEnrichedRecordType } from "../../utils/type-utils";
import { DataMapperNodeModel, TypeDescriptor } from "../commons/DataMapperNode";

export const PRIMITIVE_TYPE_NODE_TYPE = "data-mapper-node-primitive-type";
const NODE_ID = "primitive-type-node";

export class PrimitiveTypeNode extends DataMapperNodeModel {

    public recordField: EditableRecordField;
    public typeName: string;
    public hasNoMatchingFields: boolean;
    public innermostExpr: STNode;
    public x: number;
    public y: number;

    constructor(
        public context: IDataMapperContext,
        public value: SelectClause | ExpressionFunctionBody,
        public typeIdentifier: TypeDescriptor | IdentifierToken,
        public typeDef: TypeField,
        public queryExpr?: QueryExpression) {
        super(
            NODE_ID,
            context,
            PRIMITIVE_TYPE_NODE_TYPE
        );
        this.innermostExpr = getInnermostExpressionBody(this.queryExpr
            ? (this.queryExpr?.selectClause || this.queryExpr?.resultClause).expression
            : this.value.expression
        );
    }

    async initPorts() {
        if (this.typeDef) {
            const searchValue = useDMSearchStore.getState().outputSearch;
            this.hasNoMatchingFields = searchValue && !this.value.expression.source.includes(searchValue);
            if (this.typeDef.typeName === PrimitiveBalType.Union) {
                this.typeName = getTypeName(this.typeDef);
                const acceptedMembers = getFilteredUnionOutputTypes(this.typeDef);
                if (acceptedMembers.length === 1) {
                    this.typeDef = acceptedMembers[0];
                }
            }
            const valueEnrichedType = getEnrichedRecordType(this.typeDef,
                this.innermostExpr, this.context.selection.selectedST.stNode);
            this.typeName = !this.typeName ? getTypeName(valueEnrichedType.type) : this.typeName;
            this.recordField = valueEnrichedType;
            if (valueEnrichedType.type.typeName === PrimitiveBalType.Array
                && STKindChecker.isSelectClause(this.value)
            ) {
                this.recordField = valueEnrichedType.elements[0].member;
            }
            const parentPort = this.addPortsForHeaderField(this.typeDef, '', "IN",
                PRIMITIVE_TYPE_TARGET_PORT_PREFIX, this.context.collapsedFields,
                STKindChecker.isSelectClause(this.value), this.recordField);
            this.addPortsForOutputRecordField(this.recordField, "IN", this.recordField.type.typeName,
                undefined, PRIMITIVE_TYPE_TARGET_PORT_PREFIX, parentPort,
                this.context.collapsedFields, parentPort.collapsed, STKindChecker.isSelectClause(this.value));
        }
    }

    initLinks(): void {
        const searchValue = useDMSearchStore.getState().outputSearch;
        const mappings = this.genMappings(this.value.expression);
        const filteredMappings = getFilteredMappings(mappings, searchValue);
        this.createLinks(filteredMappings);
    }

    private createLinks(mappings: FieldAccessToSpecificFied[]) {
        mappings.forEach((mapping) => {
            const { fields, value, otherVal } = mapping;
            const field = fields[fields.length - 1];
            if (!value || !value.source || (otherVal && isIndexedExpression(otherVal))) {
                // Unsupported mapping
                return;
            }
            const inputNode = getInputNodeExpr(value, this);
            let inPort: RecordFieldPortModel;
            if (inputNode) {
                inPort = getInputPortsForExpr(inputNode, value);
            }
            let outPort: RecordFieldPortModel;
            let mappedOutPort: RecordFieldPortModel;
            if (!isArrayOrRecord(this.recordField.type)) {
                outPort = this.getPort(`${PRIMITIVE_TYPE_TARGET_PORT_PREFIX}.${
                    this.recordField.type.typeName}.IN`) as RecordFieldPortModel;
                mappedOutPort = outPort;
            } else {
                [outPort, mappedOutPort] = getOutputPortForField(fields,
                    this.recordField,
                    PRIMITIVE_TYPE_TARGET_PORT_PREFIX,
                    (portId: string) =>  this.getPort(portId) as RecordFieldPortModel);
            }
            if (inPort && mappedOutPort) {
                const diagnostics = filterDiagnostics(this.context.diagnostics,
                    getDiagnosticsPosition(mappedOutPort.editableRecordField, mapping));
                const lm = new DataMapperLinkModel(value, diagnostics, true);
                lm.addLabel(new ExpressionLabelModel({
                    value: otherVal?.source || value.source,
                    valueNode: otherVal || value,
                    context: this.context,
                    link: lm,
                    field: STKindChecker.isSpecificField(field)
                        ? field.valueExpr
                        : field,
                    editorLabel: STKindChecker.isSpecificField(field)
                        ? field.fieldName.value as string
                        : `${outPort.fieldFQN.split('.').pop()}${outPort.index ? `[${outPort.index}]`: ''}`,
                    deleteLink: () => this.deleteField(field),
                }));
                lm.setTargetPort(mappedOutPort);
                lm.setSourcePort(inPort);
                inPort.addLinkedPort(mappedOutPort);
                lm.registerListener({
                    selectionChanged(event) {
                        if (event.isSelected) {
                            inPort.fireEvent({}, "link-selected");
                            mappedOutPort.fireEvent({}, "link-selected");
                        } else {
                            inPort.fireEvent({}, "link-unselected");
                            mappedOutPort.fireEvent({}, "link-unselected");
                        }
                    },
                })
                this.getModel().addAll(lm);
            }
        });
    }

    async deleteField(field: STNode) {
        const typeOfValue = STKindChecker.isSelectClause(this.value) && this.typeDef?.memberType
            ? this.typeDef.memberType
            : this.typeDef;
        const modifications: STModification[] = [{
                type: "INSERT",
                config: {
                    "STATEMENT": getDefaultValue(typeOfValue?.typeName)
                },
                ...field.position
            }];

        this.context.applyModifications(modifications);
    }

    public updatePosition() {
        this.setPosition(this.position.x, this.position.y);
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number') {
            if (!this.x || !this.y) {
                this.x = x;
                this.y = y;
            }
            super.setPosition(x, y);
        }
    }
}
