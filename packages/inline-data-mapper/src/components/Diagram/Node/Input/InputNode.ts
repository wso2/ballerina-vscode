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

import { useDMCollapsedFieldsStore, useDMExpandedFieldsStore, useDMSearchStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { IOType, TypeKind } from "@wso2/ballerina-core";
import { getSearchFilteredInput } from "../../utils/search-utils";

export const INPUT_NODE_TYPE = "datamapper-node-input";
const NODE_ID = "input-node";

export class InputNode extends DataMapperNodeModel {
    public filteredInputType: IOType;
    public numberOfFields:  number;
    public x: number;
    private identifier: string;

    constructor(
        public context: IDataMapperContext,
        public inputType: IOType,
        public hasNoMatchingFields?: boolean
    ) {
        super(
            `${NODE_ID}-${inputType?.id}`,
            context,
            INPUT_NODE_TYPE
        );
        this.numberOfFields = 1;
        this.identifier = this.inputType?.id;
    }

    async initPorts() {
        this.filteredInputType = this.getSearchFilteredType();
        this.hasNoMatchingFields = !this.filteredInputType;
        this.numberOfFields = 1;

        if (this.filteredInputType) {
            const collapsedFields = useDMCollapsedFieldsStore.getState().fields;
            const expandedFields = useDMExpandedFieldsStore.getState().fields;
            const focusedFieldFQNs = [
                ...this.context.views.map(view => view.sourceField).filter(Boolean),
                ...(this.context.model.query?.inputs || [])
            ];
            const parentPort = this.addPortsForHeader({
                dmType: this.filteredInputType,
                name: this.identifier,
                portType: "OUT",
                portPrefix: undefined,
                focusedFieldFQNs,
                collapsedFields,
                expandedFields
            });

            if (this.filteredInputType.kind === TypeKind.Record) {
                const fields = this.filteredInputType.fields?.filter(f => !!f);
                fields.forEach((subField) => {
                    this.numberOfFields += this.addPortsForInputField({
                        field: subField,
                        portType: "OUT",
                        parentId: this.identifier,
                        unsafeParentId: this.identifier,
                        parent: parentPort,
                        collapsedFields,
                        expandedFields,
                        hidden: parentPort.attributes.collapsed,
                        isOptional: subField.optional,
                        focusedFieldFQNs
                    });
                });
            } else if (this.filteredInputType.kind === TypeKind.Enum) {
                this.filteredInputType.members?.forEach(member => {
                    this.numberOfFields += this.addPortsForInputField({
                        field: member,
                        portType: "OUT",
                        parentId: this.identifier,
                        unsafeParentId: this.identifier,
                        parent: parentPort,
                        collapsedFields,
                        expandedFields,
                        hidden: parentPort.attributes.collapsed,
                        isOptional: member?.optional,
                        focusedFieldFQNs
                    });
                });
            } else if (this.filteredInputType.kind === TypeKind.Array) {
                const focusedMemberId = this.filteredInputType?.focusedMemberId;
                if (focusedMemberId) {
                    const focusedMemberField = this.context.model.inputs.find(input => input.id === focusedMemberId);
                    if (focusedMemberField) {
                        this.filteredInputType.member = focusedMemberField;
                    }
                }
                this.numberOfFields += this.addPortsForInputField({
                    field: this.filteredInputType?.member,
                    portType: "OUT",
                    parentId: this.identifier,
                    unsafeParentId: this.identifier,
                    parent: parentPort,
                    collapsedFields,
                    expandedFields,
                    hidden: parentPort.attributes.collapsed,
                    isOptional: this.filteredInputType?.member?.optional,
                    focusedFieldFQNs
                });
            } else {
                this.addPortsForInputField({
                    field: this.filteredInputType,
                    portType: "OUT",
                    parentId: this.identifier,
                    unsafeParentId: this.identifier,
                    parent: parentPort,
                    collapsedFields,
                    expandedFields,
                    hidden: parentPort.attributes.collapsed,
                    isOptional: this.filteredInputType.optional,
                    focusedFieldFQNs
                });
            }
        }
    }

    async initLinks() {
        // Links are always created from "IN" ports by backtracing the inputs.
    }

    public getSearchFilteredType() {
        // TODO: Include variableName for inputTypes (Currently only available for variables)
        const variableName = this.inputType.variableName || this.inputType.id;
        if (variableName) {
            const searchValue = useDMSearchStore.getState().inputSearch;

            const matchesParamName = variableName.includes(searchValue?.toLowerCase());
            const type = matchesParamName
                ? this.inputType
                : getSearchFilteredInput(this.inputType, variableName);
            return type;
        }
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
