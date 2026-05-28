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
import { IOType, Mapping, TypeKind } from "@wso2/ballerina-core";

import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { ExpressionLabelModel } from "../../Label";
import { DataMapperLinkModel } from "../../Link";
import { InputOutputPortModel } from "../../Port";
import { ARRAY_OUTPUT_TARGET_PORT_PREFIX } from "../../utils/constants";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { getFilteredMappings, getSearchFilteredOutput, hasNoOutputMatchFound } from "../../utils/search-utils";
import { findMappingByOutput } from "../../utils/common-utils";
import { getTypeName } from "../../utils/type-utils";
import { findInputNode } from "../../utils/node-utils";
import { getInputPort, getOutputPort } from "../../utils/port-utils";
import { removeMapping } from "../../utils/modification-utils";

export const ARRAY_OUTPUT_NODE_TYPE = "data-mapper-node-array-output";
const NODE_ID = "array-output-node";

export class ArrayOutputNode extends DataMapperNodeModel {
    public filteredOutputType: IOType;
    public filteredMappings: Mapping[];
    public typeName: string;
    public rootName: string;
    public hasNoMatchingFields: boolean;
    public x: number;
    public y: number;
    public isMapFn: boolean;
    public isBodyArrayliteralExpr: boolean;

    constructor(
        public context: IDataMapperContext,
        public outputType: IOType
    ) {
        super(
            NODE_ID,
            context,
            ARRAY_OUTPUT_NODE_TYPE
        );
    }

    async initPorts() {
        this.filteredOutputType = getSearchFilteredOutput(this.outputType);

        if (this.filteredOutputType) {
            const mappings = this.context.model.mappings;
            this.rootName = this.filteredOutputType?.id;

            const collapsedFields = useDMCollapsedFieldsStore.getState().fields;
            const expandedFields = useDMExpandedFieldsStore.getState().fields;
            this.typeName = getTypeName(this.filteredOutputType);

            this.hasNoMatchingFields = hasNoOutputMatchFound(this.outputType, this.filteredOutputType);

            const parentPort = this.addPortsForHeader({
                dmType: this.filteredOutputType,
                name: this.rootName,
                portType: "IN",
                portPrefix: ARRAY_OUTPUT_TARGET_PORT_PREFIX,
                mappings,
                collapsedFields,
                expandedFields
            });

            if (this.filteredOutputType.kind === TypeKind.Array) {
                const mapping = findMappingByOutput(mappings, this.outputType.id);
                const mappingElements = mapping?.elements;
                if (mappingElements && mappingElements.length > 0) {
                    for (let index = 0; index < mappingElements.length; index++) {
                        const element = mappingElements[index];
                        await this.addPortsForOutputField({
                            field: this.outputType.member,
                            type: "IN",
                            parentId: this.rootName,
                            mappings: element.mappings,
                            portPrefix: ARRAY_OUTPUT_TARGET_PORT_PREFIX,
                            parent: parentPort,
                            collapsedFields,
                            expandedFields,
                            hidden: parentPort.attributes.collapsed,
                            elementIndex: index
                        });
                    }
                } else {
                    await this.addPortsForOutputField({
                        field: this.outputType.member,
                        type: "IN",
                        parentId: this.rootName,
                        mappings,
                        portPrefix: ARRAY_OUTPUT_TARGET_PORT_PREFIX,
                        parent: parentPort,
                        collapsedFields,
                        expandedFields,
                        hidden: parentPort.attributes.collapsed,
                        isPreview: true
                    });
                }
            }

            const mapping = mappings[0]; // There is only one mapping for the output root
            this.isBodyArrayliteralExpr = mapping?.elements.length > 0
                || (mapping?.elements.length === 0 && /^\s*\[\s*\]\s*$/.test(mapping.expression));
        }
    }

    async initLinks() {
        const inputSearch = useDMSearchStore.getState().inputSearch;
        const outputSearch = useDMSearchStore.getState().outputSearch;
        this.filteredMappings = getFilteredMappings(this.context.model.mappings, inputSearch, outputSearch);
        this.createLinks(this.filteredMappings);
    }

    private createLinks(mappings: Mapping[]) {
        mappings.forEach((mapping) => {
            const { isComplex, isQueryExpression, isFunctionCall, elementAccessIndex, inputs, output, expression, diagnostics } = mapping;
            if (isComplex || isQueryExpression || isFunctionCall || inputs.length !== 1 || elementAccessIndex) {
                // Complex mappings are handled in the LinkConnectorNode
                return;
            }

            const inputNode = findInputNode(inputs[0], this);
            let inPort: InputOutputPortModel;
            if (inputNode) {
                inPort = getInputPort(inputNode, inputs[0].replace(/\.\d+/g, ''));
            }

            let outPort: InputOutputPortModel;
            let mappedOutPort: InputOutputPortModel;

            if (this.isBodyArrayliteralExpr) {
                [, mappedOutPort] = getOutputPort(this, output);
            } else {
                const portId = `${ARRAY_OUTPUT_TARGET_PORT_PREFIX}${this.rootName ? `.${this.rootName}` : ''}.IN`;
                outPort = this.getPort(portId) as InputOutputPortModel;
                mappedOutPort = outPort;
            }

            if (inPort && mappedOutPort) {
                const lm = new DataMapperLinkModel(expression, diagnostics, true, undefined);

                lm.setTargetPort(mappedOutPort);
                lm.setSourcePort(inPort);
                inPort.addLinkedPort(mappedOutPort);

                lm.addLabel(new ExpressionLabelModel({
                    value: expression,
                    link: lm,
                    context: this.context,
                    deleteLink: () => this.deleteField(mapping)
                }));

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
                this.getModel().addAll(lm as any);
            }
        });
    }

    async deleteField(mapping: Mapping) {
        await removeMapping(mapping, this.context);
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
