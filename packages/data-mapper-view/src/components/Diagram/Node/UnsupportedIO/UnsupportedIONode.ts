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
import { STNode } from "@wso2/syntax-tree";

import { IDataMapperContext } from "../../../../utils/DataMapperContext/DataMapperContext";
import { DataMapperNodeModel } from "../commons/DataMapperNode";

export const UNSUPPORTED_IO_NODE_TYPE = "data-mapper-node-unsupported-io";
const NODE_ID = "unsupported-io-node";

export enum UnsupportedExprNodeKind {
    Input,
    Output
}

export class UnsupportedIONode extends DataMapperNodeModel {

    public filePath: string;
    public x: number;
    public y: number;

    constructor(
        public context: IDataMapperContext,
        public kind: UnsupportedExprNodeKind,
        public message?: string,
        public unsupportedExpr?: STNode
    ) {
        super(
            `${NODE_ID}-${kind}`,
            context,
            UNSUPPORTED_IO_NODE_TYPE
        );
        this.filePath = this.context.filePath;
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
