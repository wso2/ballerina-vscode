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
import { IOType, Mapping } from "@wso2/ballerina-core";

import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { getFilteredMappings, getSearchFilteredOutput, hasNoOutputMatchFound } from "../../utils/search-utils";
import { getTypeName } from "../../utils/type-utils";
import { PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX } from "../../utils/constants";
import { findInputNode } from "../../utils/node-utils";
import { InputOutputPortModel } from "../../Port";
import { DataMapperLinkModel } from "../../Link";
import { ExpressionLabelModel } from "../../Label";
import { getInputPort, getOutputPort } from "../../utils/port-utils";
import { removeMapping } from "../../utils/modification-utils";
import { findMappingByOutput } from "../../utils/common-utils";

export const PRIMITIVE_OUTPUT_NODE_TYPE = "data-mapper-node-primitive-output";
const NODE_ID = "primitive-output-node";

export class PrimitiveOutputNode extends DataMapperNodeModel {
    public filteredMappings: Mapping[];
    public typeName: string;
    public rootName: string;
    public hasNoMatchingFields: boolean;
    public x: number;
    public y: number;
    public isMapFn: boolean;

    constructor(
        public context: IDataMapperContext,
        public outputType: IOType
    ) {
        super(
            NODE_ID,
            context,
            PRIMITIVE_OUTPUT_NODE_TYPE
        ); 
    }

    async initPorts() {
        if (this.outputType) {
            const collapsedFields = useDMCollapsedFieldsStore.getState().fields;
            const expandedFields = useDMExpandedFieldsStore.getState().fields;
            this.typeName = getTypeName(this.outputType);
            this.rootName = this.outputType.id;

            const searchValue = useDMSearchStore.getState().outputSearch;
            this.hasNoMatchingFields = searchValue &&
                !findMappingByOutput(this.context.model.mappings, this.outputType.id)?.expression.includes(searchValue);
    
            const parentPort = this.addPortsForHeader({
                dmType: this.outputType,
                name: "",
                portType: "IN",
                portPrefix: PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX,
                mappings: this.context.model.mappings,
                collapsedFields,
                expandedFields,
                isPreview: true
            });
    
            await this.addPortsForOutputField({
                field: this.outputType,
                type: "IN",
                parentId: "",
                mappings: this.context.model.mappings,
                portPrefix: PRIMITIVE_OUTPUT_TARGET_PORT_PREFIX,
                parent: parentPort,
                collapsedFields,
                expandedFields,
                hidden: parentPort.attributes.collapsed
            });
        }
    }

    initLinks(): void {
        const inputSearch = useDMSearchStore.getState().inputSearch;
        const outputSearch = useDMSearchStore.getState().outputSearch;
        this.filteredMappings = getFilteredMappings(this.context.model.mappings, inputSearch, outputSearch);
        this.createLinks(this.filteredMappings);
    }

    private createLinks(mappings: Mapping[]) {

        const query = this.context.model?.query;

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

            const [_, mappedOutPort] = getOutputPort(this, output);

            if (inPort && mappedOutPort) {
                const lm = new DataMapperLinkModel(expression, diagnostics, true, undefined);
                lm.setTargetPort(mappedOutPort);
                lm.setSourcePort(inPort);
                inPort.addLinkedPort(mappedOutPort);

                lm.addLabel(
                    new ExpressionLabelModel({
                        value: expression,
                        link: lm,
                        deleteLink: () => this.deleteField(mapping),
                        ...(query?.output === output && {collectClauseFn: query?.resultClause?.properties?.func})
                    }
                ));

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
                });

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
