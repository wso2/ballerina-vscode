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
import { IOType, TypeKind } from "@wso2/ballerina-core";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMSearchStore } from "../../../../store/store";
import { SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX } from "../../utils/constants";
import { getSearchFilteredInput } from "../../utils/search-utils";

export const SUB_MAPPING_SOURCE_NODE_TYPE = "datamapper-node-sub-mapping";
const NODE_ID = "sub-mapping-node";

export interface DMSubMapping {
    name: string;
    type: IOType;
}

export class SubMappingNode extends DataMapperNodeModel {
    public hasNoMatchingFields: boolean;
    public x: number;
    public numberOfFields:  number;

    constructor(
        public context: IDataMapperContext,
        public subMappings: DMSubMapping[]
    ) {
        super(
            NODE_ID,
            context,
            SUB_MAPPING_SOURCE_NODE_TYPE
        );
        this.numberOfFields = 1;
        this.subMappings = subMappings;
    }

    async initPorts() {
        const { views } = this.context;
        const searchValue = useDMSearchStore.getState().inputSearch;
        const focusedView = views[views.length - 1];
        const subMappingView = focusedView.subMappingInfo;

        this.subMappings.forEach((subMapping, index) => {
            // Constraint: Only one variable declaration is allowed in a local variable statement.

            if (subMappingView) {
                if (index >= subMappingView.index) {
                    // Skip the variable declarations that are after the focused sub-mapping
                    return;
                }
            }

            const varName = subMapping.name;
            const typeWithoutFilter: IOType = subMapping.type;

            const type: IOType = getSearchFilteredInput(typeWithoutFilter, varName);

            if (type) {
                const collapsedFields = useDMCollapsedFieldsStore.getState().fields;
                const expandedFields = useDMExpandedFieldsStore.getState().fields;
                const focusedFieldFQNs = this.context.model.query?.inputs || [];

                const parentPort = this.addPortsForHeader({
                    dmType: type,
                    name: varName,
                    portType: "OUT",
                    portPrefix: SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX,
                    collapsedFields,
                    expandedFields,
                    focusedFieldFQNs
                });

                if (type.kind === TypeKind.Record) {
                    const fields = type.fields;
                    fields.forEach(subField => {
                        this.numberOfFields += 1 + this.addPortsForInputField({
                            field: subField,
                            portType: "OUT",
                            parentId: varName,
                            unsafeParentId: varName,
                            portPrefix: SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX,
                            parent: parentPort,
                            collapsedFields,
                            expandedFields,
                            hidden: parentPort.attributes.collapsed,
                            isOptional: subField.optional,
                            focusedFieldFQNs
                        });
                    });
                } else {
                    this.addPortsForInputField({
                        field: type,
                        portType: "OUT",
                        parentId: varName,
                        unsafeParentId: varName,
                        portPrefix: SUB_MAPPING_INPUT_SOURCE_PORT_PREFIX,
                        parent: parentPort,
                        collapsedFields,
                        expandedFields,
                        hidden: parentPort.attributes.collapsed,
                        isOptional: type.optional,
                        focusedFieldFQNs
                    });
                }
            }

        });

        this.hasNoMatchingFields = searchValue && this.subMappings.length === 0;
    }

    async initLinks() {
        // Links are always created from "IN" ports by backtracing the inputs.
    }

    setPosition(point: Point): void;
    setPosition(x: number, y: number): void;
    setPosition(x: unknown, y?: unknown): void {
        if (typeof x === 'number' && typeof y === 'number'){
            if (!this.x){
                this.x = x;
            }
            super.setPosition(this.x, y);
        }
    }
}
