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

import { DataMapperNodeModel } from "../commons/DataMapperNode";

export const EMPTY_INPUTS_NODE_TYPE = "data-mapper-node-empty-inputs";
const NODE_ID = "empty-inputs-node";

export class EmptyInputsNode extends DataMapperNodeModel {

    public x: number;
    public y: number;

    constructor() {
        super( 
            `${NODE_ID}`,
            undefined,
            EMPTY_INPUTS_NODE_TYPE
        );
    }

    initPorts() {
        // Ports are not needed
    }

    initLinks(): void {
        // Links are not needed
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
