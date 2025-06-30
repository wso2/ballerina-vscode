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

import { useDMCollapsedFieldsStore } from "../../../../store/store";
import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";
import { IOType, TypeKind } from "@wso2/ballerina-core";

export const INPUT_NODE_TYPE = "datamapper-node-input";
const NODE_ID = "input-node";

export class InputNode extends DataMapperNodeModel {
    public numberOfFields:  number;
    public x: number;
    private identifier: string;

    constructor(
        public context: IDataMapperContext,
        public inputType: IOType,
    ) {
        super(
            NODE_ID,
            context,
            INPUT_NODE_TYPE
        );
        this.numberOfFields = 1;
        this.identifier = this.inputType?.id;
    }

    async initPorts() {
        this.numberOfFields = 1;

        if (this.inputType) {
            const collapsedFields = useDMCollapsedFieldsStore.getState().fields;
            const parentPort = this.addPortsForHeader(this.inputType, this.identifier, "OUT", undefined, undefined);

            if (this.inputType.kind === TypeKind.Record) {
                const fields = this.inputType.fields;
                fields.forEach((subField) => {
                    this.numberOfFields += this.addPortsForInputField(
                        subField, "OUT", this.identifier, this.identifier, '',
                        parentPort, collapsedFields, parentPort.collapsed, subField.optional
                    );
                });
            } else {
                this.addPortsForInputField(
                    this.inputType, "OUT", this.identifier, this.identifier,  '',
                    parentPort, collapsedFields, parentPort.collapsed, this.inputType.optional
                );
            }
        }
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
